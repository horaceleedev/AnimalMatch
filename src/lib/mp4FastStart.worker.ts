export interface OptimiseMp4Response {
  file?: File;
  wasOptimised?: boolean;
  error?: string;
}

interface Mp4BoxLocation {
  offset: number;
  size: number;
  headerSize: number;
  type: string;
}

const containerBoxTypes = new Set([
  "moov",
  "trak",
  "mdia",
  "minf",
  "stbl",
  "edts",
  "dinf",
  "udta",
  "meta",
]);

const readAscii = (view: DataView, offset: number, length: number) => {
  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(view.getUint8(offset + index));
  }

  return value;
};

const parseBoxHeader = (view: DataView, offset: number, endOffset: number): Mp4BoxLocation | undefined => {
  if (offset + 8 > endOffset) return undefined;

  const size32 = view.getUint32(offset);
  const type = readAscii(view, offset + 4, 4);
  let headerSize = 8;
  let size = size32;

  if (size32 === 1) {
    if (offset + 16 > endOffset) return undefined;
    headerSize = 16;
    size = Number(view.getBigUint64(offset + 8));
  } else if (size32 === 0) {
    size = endOffset - offset;
  }

  if (!Number.isSafeInteger(size) || size < headerSize || offset + size > endOffset) {
    throw new Error(`Invalid MP4 box ${type}.`);
  }

  return { offset, size, headerSize, type };
};

const readTopLevelBoxHeader = async (file: File, offset: number): Promise<Mp4BoxLocation | undefined> => {
  const headerBuffer = await file.slice(offset, offset + 16).arrayBuffer();
  const view = new DataView(headerBuffer);

  return parseBoxHeader(view, 0, file.size - offset);
};

const findTopLevelBoxes = async (file: File) => {
  const boxes: Mp4BoxLocation[] = [];
  let offset = 0;

  while (offset < file.size) {
    const box = await readTopLevelBoxHeader(file, offset);
    if (!box) break;

    boxes.push({ ...box, offset });
    offset += box.size;
  }

  return boxes;
};

// Only bytes in [minChunkOffset, maxChunkOffset) move when the moov is
// relocated; offsets outside that range can't be patched, so reject the file.
interface ChunkOffsetPatch {
  delta: number;
  minChunkOffset: number;
  maxChunkOffset: number;
}

const readEntryCount = (view: DataView, box: Mp4BoxLocation, entrySize: number) => {
  const entryCount = view.getUint32(box.offset + box.headerSize + 4);

  if (box.offset + box.headerSize + 8 + entryCount * entrySize > box.offset + box.size) {
    throw new Error(`Invalid MP4 box ${box.type}.`);
  }

  return entryCount;
};

const assertChunkOffsetInPatchableRange = (chunkOffset: number, patch: ChunkOffsetPatch) => {
  if (chunkOffset < patch.minChunkOffset || chunkOffset >= patch.maxChunkOffset) {
    throw new Error("MP4 chunk offsets point outside the media data being moved.");
  }
};

const patchStcoBox = (view: DataView, box: Mp4BoxLocation, patch: ChunkOffsetPatch) => {
  const entriesOffset = box.offset + box.headerSize + 8;
  const entryCount = readEntryCount(view, box, 4);

  for (let index = 0; index < entryCount; index += 1) {
    const offset = entriesOffset + index * 4;
    const chunkOffset = view.getUint32(offset);
    assertChunkOffsetInPatchableRange(chunkOffset, patch);

    const patchedOffset = chunkOffset + patch.delta;

    if (patchedOffset > 0xffffffff) {
      throw new Error("MP4 chunk offsets are too large to optimise in the browser.");
    }

    view.setUint32(offset, patchedOffset);
  }
};

const patchCo64Box = (view: DataView, box: Mp4BoxLocation, patch: ChunkOffsetPatch) => {
  const entriesOffset = box.offset + box.headerSize + 8;
  const entryCount = readEntryCount(view, box, 8);
  const bigDelta = BigInt(patch.delta);

  for (let index = 0; index < entryCount; index += 1) {
    const offset = entriesOffset + index * 8;
    const chunkOffset = view.getBigUint64(offset);
    assertChunkOffsetInPatchableRange(Number(chunkOffset), patch);
    view.setBigUint64(offset, chunkOffset + bigDelta);
  }
};

const patchChunkOffsets = (moovBuffer: ArrayBuffer, patch: ChunkOffsetPatch) => {
  const view = new DataView(moovBuffer);

  const patchBoxes = (startOffset: number, endOffset: number) => {
    let offset = startOffset;

    while (offset + 8 <= endOffset) {
      const box = parseBoxHeader(view, offset, endOffset);
      if (!box) return;

      if (box.type === "stco") {
        patchStcoBox(view, box, patch);
      } else if (box.type === "co64") {
        patchCo64Box(view, box, patch);
      } else if (containerBoxTypes.has(box.type)) {
        const childStartOffset = box.offset + box.headerSize + (box.type === "meta" ? 4 : 0);
        patchBoxes(childStartOffset, box.offset + box.size);
      }

      offset = box.offset + box.size;
    }
  };

  patchBoxes(0, moovBuffer.byteLength);

  return moovBuffer;
};

const optimiseMp4ForFastStart = async (file: File) => {
  const topLevelBoxes = await findTopLevelBoxes(file);
  const ftypBox = topLevelBoxes.find((box) => box.type === "ftyp");
  const moovBox = topLevelBoxes.find((box) => box.type === "moov");
  const mdatBox = topLevelBoxes.find((box) => box.type === "mdat");

  if (!moovBox || !mdatBox) {
    throw new Error("Could not find MP4 metadata or media data.");
  }

  if (moovBox.offset < mdatBox.offset) {
    return { file, wasOptimised: false };
  }

  const insertionOffset = ftypBox ? ftypBox.offset + ftypBox.size : 0;
  if (insertionOffset > mdatBox.offset) {
    throw new Error("Unsupported MP4 box layout for browser web optimisation.");
  }

  const moovBuffer = await file.slice(moovBox.offset, moovBox.offset + moovBox.size).arrayBuffer();

  // A moov with size 0 can't be moved without rewriting its header.
  if (new DataView(moovBuffer).getUint32(0) === 0) {
    throw new Error("MP4 moov box has no explicit size.");
  }

  const patchedMoovBuffer = patchChunkOffsets(moovBuffer, {
    delta: moovBox.size,
    minChunkOffset: insertionOffset,
    maxChunkOffset: moovBox.offset,
  });

  const optimisedBlob = new Blob([
    file.slice(0, insertionOffset),
    patchedMoovBuffer,
    file.slice(insertionOffset, moovBox.offset),
    file.slice(moovBox.offset + moovBox.size),
  ], { type: file.type || "video/mp4" });

  return {
    file: new File([optimisedBlob], file.name, {
      type: file.type || "video/mp4",
      lastModified: file.lastModified,
    }),
    wasOptimised: true,
  };
};

self.onmessage = async (event: MessageEvent<File>) => {
  try {
    const response: OptimiseMp4Response = await optimiseMp4ForFastStart(event.data);
    self.postMessage(response);
  } catch (error) {
    const response: OptimiseMp4Response = {
      error: error instanceof Error ? error.message : "Video web optimisation failed.",
    };
    self.postMessage(response);
  }
};
