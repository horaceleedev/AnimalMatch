interface OptimiseMp4Request {
  id: string;
  file: File;
}

interface OptimiseMp4Response {
  id: string;
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

const patchStcoBox = (view: DataView, box: Mp4BoxLocation, delta: number) => {
  const entryCountOffset = box.offset + box.headerSize + 4;
  const entriesOffset = entryCountOffset + 4;
  const entryCount = view.getUint32(entryCountOffset);

  for (let index = 0; index < entryCount; index += 1) {
    const offset = entriesOffset + index * 4;
    const patchedOffset = view.getUint32(offset) + delta;

    if (patchedOffset > 0xffffffff) {
      throw new Error("MP4 chunk offsets are too large to optimise in the browser.");
    }

    view.setUint32(offset, patchedOffset);
  }
};

const patchCo64Box = (view: DataView, box: Mp4BoxLocation, delta: number) => {
  const entryCountOffset = box.offset + box.headerSize + 4;
  const entriesOffset = entryCountOffset + 4;
  const entryCount = view.getUint32(entryCountOffset);
  const bigDelta = BigInt(delta);

  for (let index = 0; index < entryCount; index += 1) {
    const offset = entriesOffset + index * 8;
    view.setBigUint64(offset, view.getBigUint64(offset) + bigDelta);
  }
};

const patchChunkOffsets = (moovBuffer: ArrayBuffer, delta: number) => {
  const view = new DataView(moovBuffer);

  const patchBoxes = (startOffset: number, endOffset: number) => {
    let offset = startOffset;

    while (offset + 8 <= endOffset) {
      const box = parseBoxHeader(view, offset, endOffset);
      if (!box) return;

      if (box.type === "stco") {
        patchStcoBox(view, box, delta);
      } else if (box.type === "co64") {
        patchCo64Box(view, box, delta);
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

  const patchedMoovBuffer = patchChunkOffsets(
    await file.slice(moovBox.offset, moovBox.offset + moovBox.size).arrayBuffer(),
    moovBox.size,
  );

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

self.onmessage = async (event: MessageEvent<OptimiseMp4Request>) => {
  const { id, file } = event.data;

  try {
    const result = await optimiseMp4ForFastStart(file);
    const response: OptimiseMp4Response = { id, ...result };
    self.postMessage(response);
  } catch (error) {
    const response: OptimiseMp4Response = {
      id,
      error: error instanceof Error ? error.message : "Video web optimisation failed.",
    };
    self.postMessage(response);
  }
};

export {};
