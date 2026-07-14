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
});
