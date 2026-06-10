export type ImportVideoStatus =
  | "pending"
  | "validating"
  | "ready"
  | "uploading"
  | "uploaded"
  | "failed"
  | "cancelled";

export interface ImportVideo {
  localId: string;
  file: File;
  filename: string;
  fileSize: number;
  relativePath?: string;
  status: ImportVideoStatus;
  progressPercent: number;
  isValid?: boolean;
  validationMessage?: string;
  errorMessage?: string;
}

export interface ImportBatch {
  localId: string;
  name: string;
  videos: ImportVideo[];
}

export interface VideoUploadResult {
  id?: string;
  filename: string;
}

export interface VideoUploadAdapter {
  uploadVideo: (
    video: ImportVideo,
    onProgress: (progressPercent: number) => void,
  ) => Promise<VideoUploadResult>;
}
