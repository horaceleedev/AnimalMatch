import type { ImportVideo, VideoUploadAdapter, VideoUploadResult } from "./importTypes";
import { pb, pocketBaseUrl } from "./lib/pocketBaseClient";

const mockUploadStepMs = 150;
const mockUploadProgressStep = 10;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createPocketBaseRecordWithProgress = (
  collectionName: string,
  formData: FormData,
  onProgress: (progressPercent: number) => void,
) => new Promise<Record<string, unknown>>((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  xhr.open("POST", `${pocketBaseUrl}/api/collections/${collectionName}/records`);

  if (pb.authStore.token) {
    xhr.setRequestHeader("Authorization", `Bearer ${pb.authStore.token}`);
  }

  xhr.upload.onprogress = (event) => {
    if (!event.lengthComputable) return;

    onProgress(Math.round((event.loaded / event.total) * 100));
  };

  xhr.onload = () => {
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

  xhr.onerror = () => reject(new Error("Upload failed"));
  xhr.send(formData);
});

export const pocketBaseVideoUploadAdapter: VideoUploadAdapter = {
  uploadVideo: async (
    video: ImportVideo,
    onProgress: (progressPercent: number) => void,
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

    // TODO: These are placeholder metadata values for the video-only upload MWE.
    // Replace them by making metadata fields optional in the frontend/domain model
    // and filling them from the metadata import flow when that exists.
    formData.append("location_name", "Unknown");
    formData.append("recording_date", new Date(0).toISOString());
    formData.append("utm_easting", "0");
    formData.append("utm_northing", "0");
    formData.append("notes", "");
    formData.append("custom_tags", JSON.stringify([]));
    formData.append("assignees", JSON.stringify([]));
    formData.append("annotation_status", "to annotate");

    const record = await createPocketBaseRecordWithProgress("videos", formData, onProgress);

    return {
      id: typeof record.id === "string" ? record.id : undefined,
      filename: typeof record.filename === "string" ? record.filename : video.filename,
    };
  },
};

// Temporary adapter used while the PocketBase import schema/API is not available.
// This lets the import UI exercise real async progress, success, and retry flows
// without writing files to PocketBase or creating video records.
export const mockVideoUploadAdapter: VideoUploadAdapter = {
  uploadVideo: async (
    video: ImportVideo,
    onProgress: (progressPercent: number) => void,
  ): Promise<VideoUploadResult> => {
    // A real adapter will report upload progress from the transport layer instead
    // of incrementing a timer. For PocketBase this will likely be replaced by a
    // create/update call against an import_videos collection with a file field.
    for (let progress = 0; progress <= 100; progress += mockUploadProgressStep) {
      onProgress(progress);
      if (progress < 100) {
        await wait(mockUploadStepMs);
      }
    }

    // The mock id stands in for the future server-side import video record id.
    return {
      id: `mock-${video.localId}`,
      filename: video.filename,
    };
  },
};
