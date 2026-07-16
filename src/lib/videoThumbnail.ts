const thumbnailMaxEdgePx = 640;
const thumbnailJpegQuality = 0.8;

// Prevent capturing initial black or blank frames.
const thumbnailCaptureSeconds = 1;

// A stalled decode would leave the import row loading forever
const thumbnailCaptureTimeoutMs = 15_000;

const loadVideoFrameForCapture = (objectUrl: string) => (
  new Promise<HTMLVideoElement>((resolve, reject) => {
    const video = document.createElement("video");

    const timeoutId = window.setTimeout(() => {
      reject(new Error("Timed out waiting for a video frame to capture."));
    }, thumbnailCaptureTimeoutMs);

    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    video.onerror = () => {
      window.clearTimeout(timeoutId);
      reject(new Error("Video could not be loaded for thumbnail capture."));
    };
    video.onloadedmetadata = () => {
      video.currentTime = Number.isFinite(video.duration)
        ? Math.min(thumbnailCaptureSeconds, video.duration / 2)
        : 0;
    };
    video.onseeked = () => {
      window.clearTimeout(timeoutId);
      resolve(video);
    };

    video.src = objectUrl;
  })
);

const thumbnailFilename = (videoFilename: string) => (
  `${videoFilename.replace(/\.mp4$/i, "")}.jpg`
);

export const createVideoThumbnail = async (file: File): Promise<File> => {
  const objectUrl = URL.createObjectURL(file);

  try {
    const video = await loadVideoFrameForCapture(objectUrl);

    const scale = Math.min(1, thumbnailMaxEdgePx / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas is not available for thumbnail capture.");
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", thumbnailJpegQuality);
    });

    if (!blob) {
      throw new Error("Thumbnail image could not be encoded.");
    }

    return new File([blob], thumbnailFilename(file.name), { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
