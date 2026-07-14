import { describe, expect, it } from "vitest";

import { optimiseMp4ForWeb } from "../../src/lib/optimiseMp4ForWeb";
import { isValidVideoForImport } from "../../src/lib/importVideoValidation";

const faststartVideoUrl = new URL("../fixtures/videos/faststart.mp4", import.meta.url).href;
const needsFaststartVideoUrl = new URL("../fixtures/videos/needs-faststart.mp4", import.meta.url).href;
const invalidVideoUrl = new URL("../fixtures/videos/invalid.mp4", import.meta.url).href;

const fileFromFixture = async (url: string, filename: string, type = "video/mp4") => {
  const response = await fetch(url);
  const blob = await response.blob();

  return new File([blob], filename, { type });
};

interface TopLevelBox {
  type: string;
  offset: number;
  size: number;
}

// Minimal top-level box scan so tests can locate and mutate fixture boxes without
// going through the code under test.
const readTopLevelBoxes = (buffer: ArrayBuffer) => {
  const view = new DataView(buffer);
  const boxes: TopLevelBox[] = [];
  let offset = 0;

  while (offset + 8 <= buffer.byteLength) {
    const size32 = view.getUint32(offset);
    let type = "";

    for (let index = 0; index < 4; index += 1) {
      type += String.fromCharCode(view.getUint8(offset + 4 + index));
    }

    const size = size32 === 1
      ? Number(view.getBigUint64(offset + 8))
      : size32 === 0 ? buffer.byteLength - offset : size32;

    boxes.push({ type, offset, size });
    offset += size;
  }

  return boxes;
};

const expectVideoMetadataLoads = async (file: File) => {
  const video = document.createElement("video");
  const objectUrl = URL.createObjectURL(file);

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Video metadata failed to load."));
      video.src = objectUrl;
    });

    expect(video.videoWidth).toBeGreaterThan(0);
    expect(video.videoHeight).toBeGreaterThan(0);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

describe("optimiseMp4ForWeb", () => {
  it("faststarts a valid non-web-optimised MP4", async () => {
    const file = await fileFromFixture(needsFaststartVideoUrl, "needs-faststart.mp4");
    const validationBefore = await isValidVideoForImport(file);

    expect(validationBefore).toMatchObject({
      isValid: true,
      needsWebOptimisation: true,
    });

    const result = await optimiseMp4ForWeb(file);
    const validationAfter = await isValidVideoForImport(result.file);

    expect(result.wasOptimised).toBe(true);
    expect(validationAfter).toMatchObject({ isValid: true });
    expect(validationAfter.needsWebOptimisation).toBeUndefined();

    await expectVideoMetadataLoads(result.file);
  });

  it("does not rewrite an already web-optimised MP4", async () => {
    const file = await fileFromFixture(faststartVideoUrl, "faststart.mp4");
    const validationBefore = await isValidVideoForImport(file);

    expect(validationBefore).toMatchObject({ isValid: true });
    expect(validationBefore.needsWebOptimisation).toBeUndefined();

    const result = await optimiseMp4ForWeb(file);

    expect(result.wasOptimised).toBe(false);
    expect(result.file.size).toBe(file.size);

    await expectVideoMetadataLoads(result.file);
  });

  it("rejects invalid MP4 files", async () => {
    const file = await fileFromFixture(invalidVideoUrl, "invalid.mp4");

    await expect(optimiseMp4ForWeb(file)).rejects.toThrow();
  });

  it("rejects an MP4 whose moov box has no explicit size", async () => {
    const buffer = await (await fetch(needsFaststartVideoUrl)).arrayBuffer();
    const moovBox = readTopLevelBoxes(buffer).find((box) => box.type === "moov");

    if (!moovBox) throw new Error("Fixture has no moov box.");

    // A size field of 0 means "extends to the end of the file", so it is only
    // meaningful on the last top-level box.
    expect(moovBox.offset + moovBox.size).toBe(buffer.byteLength);
    new DataView(buffer).setUint32(moovBox.offset, 0);

    const file = new File([buffer], "size-zero-moov.mp4", { type: "video/mp4" });

    await expect(optimiseMp4ForWeb(file)).rejects.toThrow(/moov box has no explicit size/);
  });

  it("rejects an MP4 whose chunk offsets point past the relocated moov", async () => {
    const buffer = await (await fetch(needsFaststartVideoUrl)).arrayBuffer();
    const boxes = readTopLevelBoxes(buffer);
    const ftypBox = boxes.find((box) => box.type === "ftyp");
    const moovBox = boxes.find((box) => box.type === "moov");

    if (!ftypBox || !moovBox) throw new Error("Fixture is missing ftyp or moov box.");

    // Replace the real mdat with an empty stub so the moov's chunk offsets point
    // beyond the moov's new position, which cannot be patched safely.
    const emptyMdatBox = new Uint8Array([0, 0, 0, 8, 0x6d, 0x64, 0x61, 0x74]);
    const file = new File([
      buffer.slice(0, ftypBox.offset + ftypBox.size),
      emptyMdatBox,
      buffer.slice(moovBox.offset, moovBox.offset + moovBox.size),
    ], "dangling-chunk-offsets.mp4", { type: "video/mp4" });

    await expect(optimiseMp4ForWeb(file)).rejects.toThrow(/cannot be safely relocated/);
  });
});
