import { createFile, MP4BoxBuffer, type Movie } from "mp4box";

export interface ImportVideoValidationResult {
  isValid: boolean;
  message?: string;
}

// Read bounded slices from the start and end so mp4box can find MP4 metadata
// without loading large videos into memory.
const mp4MetadataReadByteLimit = 4 * 1024 * 1024;
const supportedVideoCodecPrefixes = ["avc1", "avc3"];

const isMp4Extension = (file: File) => file.name.toLowerCase().endsWith(".mp4");

const hasSupportedVideoCodec = (codec: string) => (
  supportedVideoCodecPrefixes.some((prefix) => codec.toLowerCase().startsWith(prefix))
);

const canBrowserPlayMimeType = (mimeType: string) => {
  const video = document.createElement("video");
  return video.canPlayType(mimeType) !== "";
};

const parseMp4Info = async (file: File): Promise<Movie> => {
  const headArrayBuffer = await file.slice(0, mp4MetadataReadByteLimit).arrayBuffer();
  const headBuffer = MP4BoxBuffer.fromArrayBuffer(headArrayBuffer, 0);
  const tailStart = Math.max(file.size - mp4MetadataReadByteLimit, headArrayBuffer.byteLength);
  const tailBuffer = tailStart < file.size
    ? MP4BoxBuffer.fromArrayBuffer(await file.slice(tailStart).arrayBuffer(), tailStart)
    : undefined;

  return new Promise((resolve, reject) => {
    const mp4boxFile = createFile();
    let hasResolved = false;

    mp4boxFile.onReady = (info: Movie) => {
      hasResolved = true;
      resolve(info);
    };
    mp4boxFile.onError = (error: unknown) => reject(error);

    mp4boxFile.appendBuffer(headBuffer);
    if (tailBuffer) {
      mp4boxFile.appendBuffer(tailBuffer);
    }
    mp4boxFile.flush();

    window.setTimeout(() => {
      if (!hasResolved) {
        reject(new Error("MP4 metadata was not found in the checked file sections."));
      }
    }, 0);
  });
};

export const isValidVideoForImport = async (file: File): Promise<ImportVideoValidationResult> => {
  // Fast path for obvious non-video selections, especially folder uploads where
  // the browser might have ignored the input's `accept` filter.
  if (!isMp4Extension(file)) {
    return {
      isValid: false,
      message: "Only .mp4 files are supported.",
    };
  }

  let info: Movie;
  try {
    // mp4box parses the MP4 structure and gives us tracks, codecs, and a MIME string.
    // It also reports whether the MP4 can be played progressively via isProgressive:
    // https://github.com/gpac/mp4box.js?tab=readme-ov-file#onreadyinfo
    info = await parseMp4Info(file);
  } catch {
    return {
      isValid: false,
      message: "This file could not be read as a valid MP4.",
    };
  }

  const videoTrack = info.videoTracks[0];

  // Audio-only MP4s and malformed files may parse successfully but still have
  // no usable video stream for annotation.
  if (!videoTrack) {
    return {
      isValid: false,
      message: "No video track was found in this MP4.",
    };
  }

  const videoCodec = videoTrack.codec;

  // AnimalMatch targets H.264 MP4 for broad browser compatibility. Other codecs
  // may work in some browsers but are not treated as safe import targets.
  if (!hasSupportedVideoCodec(videoCodec)) {
    return {
      isValid: false,
      message: `Unsupported video codec: ${videoCodec}. Please use H.264 MP4.`,
    };
  }

  // Ask the current browser whether it can play the exact MIME/codec string
  // reported by mp4box; this catches browser-specific playback gaps while the
  // H.264 check above keeps AnimalMatch on a cross-browser-safe target.
  if (!canBrowserPlayMimeType(info.mime)) {
    return {
      isValid: false,
      message: `This browser cannot play ${info.mime}.`,
    };
  }

  // We treat compatible but non-web-optimised files as a warning because they
  // can be fixed quickly during upload/import by rewriting MP4 metadata order.
  if (!info.isProgressive) {
    return {
      isValid: true,
      message: "This MP4 is not web-optimised. It can be fixed during upload.",
    };
  }

  return { isValid: true };
};
