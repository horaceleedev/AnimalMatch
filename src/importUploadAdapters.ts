import type { ImportVideo, VideoUploadAdapter, VideoUploadResult } from "./importTypes";
import { pb, pocketBaseUrl } from "./lib/pocketBaseClient";

const mockUploadStepMs = 150;
const mockUploadProgressStep = 10;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createPocketBaseRecordWithProgress = (
  collectionName: string,
  formData: FormData,
  onProgress: (progressPercent: number) => void,
  signal?: AbortSignal,
) => new Promise<Record<string, unknown>>((resolve, reject) => {
  if (signal?.aborted) {
    reject(new DOMException("Upload cancelled.", "AbortError"));
    return;
  }

  const xhr = new XMLHttpRequest();
  xhr.open("POST", `${pocketBaseUrl}/api/collections/${collectionName}/records`);

  if (pb.authStore.token) {
    xhr.setRequestHeader("Authorization", `Bearer ${pb.authStore.token}`);
  }

  xhr.upload.onprogress = (event) => {
    if (!event.lengthComputable) return;

    onProgress(Math.round((event.loaded / event.total) * 100));
  };

  const handleAbort = () => xhr.abort();
  signal?.addEventListener("abort", handleAbort);

  const stopWatchingAbort = () => signal?.removeEventListener("abort", handleAbort);

  xhr.onload = () => {
    stopWatchingAbort();

    const responseText = xhr.responseText || "{}";
    let response: Record<string, unknown> = {};

    try {
      response = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      response = {};
    }

    if (xhr.status >= 200 && xhr.status < 300) {
      resolve(response);
      return;
    }

    reject(new Error(typeof response.message === "string" ? response.message : "Upload failed"));
  };

  // xhr.abort() doesn't trigger onerror, only onabort - so it needs its own handler.
  xhr.onabort = () => {
    stopWatchingAbort();
    reject(new DOMException("Upload cancelled.", "AbortError"));
  };

  xhr.onerror = () => {
    stopWatchingAbort();
    reject(new Error("Upload failed"));
  };

  xhr.send(formData);
});

export const pocketBaseVideoUploadAdapter: VideoUploadAdapter = {
  uploadVideo: async (
    video: ImportVideo,
    onProgress: (progressPercent: number) => void,
    signal?: AbortSignal,
  ): Promise<VideoUploadResult> => {
    if (!pb.authStore.isValid) {
      throw new Error("Please log in before uploading videos.");
    }

    if (!video.fileHash) {
      throw new Error("Video hash is missing.");
    }

    const formData = new FormData();
    formData.append("filename", video.filename);
    formData.append("file", video.file);
    formData.append("file_hash", video.fileHash);

    if (video.thumbnailFile) {
      formData.append("thumbnail", video.thumbnailFile);
    }

    if (video.relativePath) {
      formData.append("original_path", video.relativePath);
    }

    // location_name/recording_date/utm_easting/utm_northing are left unset
    // rather than filled with placeholder values - needs_metadata set true
    formData.append("notes", "");
    formData.append("custom_tags", JSON.stringify([]));
    formData.append("assignees", JSON.stringify([]));
    formData.append("annotation_status", "to annotate");
    formData.append("needs_metadata", "true");

    const record = await createPocketBaseRecordWithProgress("videos", formData, onProgress, signal);

    return {
      id: typeof record.id === "string" ? record.id : undefined,
      filename: typeof record.filename === "string" ? record.filename : video.filename,
    };
  },
};

// Exercises the import UI (progress, success, retry) without writing to db
export const mockVideoUploadAdapter: VideoUploadAdapter = {
  uploadVideo: async (
    video: ImportVideo,
    onProgress: (progressPercent: number) => void,
    signal?: AbortSignal,
  ): Promise<VideoUploadResult> => {
    for (let progress = 0; progress <= 100; progress += mockUploadProgressStep) {
      if (signal?.aborted) {
        throw new DOMException("Upload cancelled.", "AbortError");
      }

      onProgress(progress);
      if (progress < 100) {
        await wait(mockUploadStepMs);
      }
    }

    return {
      id: `mock-${video.localId}`,
      filename: video.filename,
    };
  },
};
