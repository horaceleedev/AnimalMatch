import type { ImportVideo, VideoUploadAdapter, VideoUploadResult } from "./importTypes";

const mockUploadStepMs = 150;
const mockUploadProgressStep = 10;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
