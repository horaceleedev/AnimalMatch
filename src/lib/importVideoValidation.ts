import { createFile, MP4BoxBuffer, type Movie } from "mp4box";

export interface ImportVideoValidationResult {
  isValid: boolean;
  needsWebOptimisation?: boolean;
  message?: string;
}

// mp4box only needs the metadata, which sits at one end of the file or the
// other, so avoid loading whole videos into memory.
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
  // Folder uploads can bypass the input's `accept` filter.
  if (!isMp4Extension(file)) {
    return {
      isValid: false,
      message: "Only .mp4 files are supported.",
    };
  }

  let info: Movie;
  try {
    // https://github.com/gpac/mp4box.js?tab=readme-ov-file#onreadyinfo
    info = await parseMp4Info(file);
  } catch {
    return {
      isValid: false,
      message: "This file could not be read as a valid MP4.",
    };
  }

  const videoTrack = info.videoTracks[0];

  // Audio-only MP4s parse fine but there is nothing to annotate.
  if (!videoTrack) {
    return {
      isValid: false,
      message: "No video track was found in this MP4.",
    };
  }

  const videoCodec = videoTrack.codec;

  // Imported videos must play in any browser, so only H.264 is accepted.
  if (!hasSupportedVideoCodec(videoCodec)) {
    return {
      isValid: false,
      message: `Unsupported video codec: ${videoCodec}. Please use H.264 MP4.`,
    };
  }

  // Even valid H.264 can use profile/level combinations this browser won't play.
  if (!canBrowserPlayMimeType(info.mime)) {
    return {
      isValid: false,
      message: `This browser cannot play ${info.mime}.`,
    };
  }

  if (!info.isProgressive) {
    return {
      isValid: true,
      needsWebOptimisation: true,
      message: "This MP4 is not web-optimised. It needs to be optimised before upload.",
    };
  }

  return { isValid: true };
};
