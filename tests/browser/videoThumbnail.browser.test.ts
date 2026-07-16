import { describe, expect, it } from "vitest";

import { createVideoThumbnail } from "../../src/lib/videoThumbnail";

const faststartVideoUrl = new URL("../fixtures/videos/faststart.mp4", import.meta.url).href;
const invalidVideoUrl = new URL("../fixtures/videos/invalid.mp4", import.meta.url).href;

const fileFromFixture = async (url: string, filename: string, type = "video/mp4") => {
  const response = await fetch(url);
  const blob = await response.blob();

  return new File([blob], filename, { type });
};

describe("createVideoThumbnail", () => {
  it("captures a JPEG poster frame matching the video's aspect ratio", async () => {
    const file = await fileFromFixture(faststartVideoUrl, "faststart.mp4");
    const thumbnail = await createVideoThumbnail(file);

    expect(thumbnail.type).toBe("image/jpeg");
    expect(thumbnail.name).toBe("faststart.jpg");
    expect(thumbnail.size).toBeGreaterThan(0);

    const video = document.createElement("video");
    const videoUrl = URL.createObjectURL(file);

    try {
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("Video metadata failed to load."));
        video.src = videoUrl;
      });

      const bitmap = await createImageBitmap(thumbnail);

      expect(bitmap.width).toBeGreaterThan(0);
      expect(bitmap.width).toBeLessThanOrEqual(640);
      expect(bitmap.height).toBeLessThanOrEqual(640);
      expect(bitmap.width / bitmap.height).toBeCloseTo(video.videoWidth / video.videoHeight, 1);
      bitmap.close();
    } finally {
      URL.revokeObjectURL(videoUrl);
    }
  });

  it("rejects files that are not playable video", async () => {
    const file = await fileFromFixture(invalidVideoUrl, "invalid.mp4");

    await expect(createVideoThumbnail(file)).rejects.toThrow();
  });
});
