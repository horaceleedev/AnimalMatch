import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("mp4box", () => ({
  MP4BoxBuffer: {
    fromArrayBuffer: vi.fn((_buffer: ArrayBuffer, fileStart: number) => ({ fileStart })),
  },
  createFile: vi.fn(() => {
    const parser: {
      onReady?: (info: unknown) => void;
      onError?: (error: unknown) => void;
      appendBuffer: ReturnType<typeof vi.fn>;
      flush: () => void;
    } = {
      appendBuffer: vi.fn(),
      flush: () => parser.onReady?.({
        videoTracks: [{ codec: "avc1.64001f" }],
        mime: "video/mp4; codecs=avc1.64001f",
        isProgressive: true,
      }),
    };

    return parser;
  }),
}));

import { isValidVideoForImport } from "../../src/lib/importVideoValidation";

const MiB = 1024 * 1024;

describe("isValidVideoForImport metadata reads", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("probably");
  });

  it("checks up to 16 MiB at both ends of a large MP4", async () => {
    const fileSize = 40 * MiB;
    const slice = vi.fn(() => ({
      arrayBuffer: async () => new ArrayBuffer(8),
    } as Blob));
    const file = { name: "large.mp4", size: fileSize, slice } as unknown as File;

    await expect(isValidVideoForImport(file)).resolves.toEqual({ isValid: true });

    expect(slice).toHaveBeenNthCalledWith(1, 0, 16 * MiB);
    expect(slice).toHaveBeenNthCalledWith(2, 24 * MiB);
  });
});
