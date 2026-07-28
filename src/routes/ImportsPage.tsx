import React, { useEffect, useRef, useState } from "react";
import { App, Button, Card, Flex, Progress, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, FolderOpenOutlined, LoadingOutlined, ReloadOutlined, UploadOutlined, WarningOutlined } from "@ant-design/icons";
import { nanoid } from "nanoid";
import { useBlocker } from "react-router-dom";

import DashboardContent from "../components/dashboards/DashboardContent";
import ImportBatchSummary from "../components/ImportBatchSummary";
import type { ImportVideo, ImportVideoStatus } from "../importTypes";
import { pocketBaseVideoUploadAdapter } from "../importUploadAdapters";
import { hashFileSample } from "../lib/fileHashing";
import { isValidVideoForImport } from "../lib/importVideoValidation";
import { optimiseMp4ForWeb } from "../lib/optimiseMp4ForWeb";
import { createVideoThumbnail } from "../lib/videoThumbnail";
import { readDroppedFiles, type FileWithRelativePath } from "../lib/readDroppedFiles";
import { useVideoStore } from "../DataStores";
import type { Video } from "../types";

const { Text, Title } = Typography;

const statusColors: Record<ImportVideoStatus, string> = {
  pending: "default",
  ready: "blue",
  uploading: "processing",
  uploaded: "success",
  failed: "error",
  cancelled: "warning",
};

const isMp4File = (file: File) => file.name.toLowerCase().endsWith(".mp4");

const createImportVideo = (file: FileWithRelativePath): ImportVideo => {
  return {
    localId: nanoid(),
    file,
    filename: file.name,
    fileSize: file.size,
    relativePath: file.webkitRelativePath || undefined,
    status: "pending",
    isLoading: true,
    loadingMessage: "checking video",
    progressPercent: 0,
  };
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

const getDuplicateVideo = (video: ImportVideo, videos: ImportVideo[]) => {
  if (!video.fileHash) return undefined;

  const videoIndex = videos.findIndex((candidate) => candidate.localId === video.localId);
  if (videoIndex === -1) return undefined;

  return videos.slice(0, videoIndex).find((candidate) => candidate.fileHash === video.fileHash);
};

const getUploadedDuplicateVideo = (video: ImportVideo, uploadedVideos: Video[]) => {
  if (!video.fileHash) return undefined;

  // Once this row is uploaded, its own record lands in the video store and
  // would match its hash. this guards against it showing as "already uploaded".
  if (video.status === "uploading" || video.status === "uploaded") return undefined;

  return uploadedVideos.find((uploadedVideo) => uploadedVideo.file_hash === video.fileHash);
};

const canUploadVideo = (video: ImportVideo, videos: ImportVideo[], uploadedVideos: Video[]) => (
  video.isValid
  && !video.needsWebOptimisation
  && Boolean(video.fileHash)
  && !getDuplicateVideo(video, videos)
  && !getUploadedDuplicateVideo(video, uploadedVideos)
  && (video.status === "ready" || video.status === "failed" || video.status === "cancelled")
);

// A cancelled upload only ever happens to a video that had already started
// uploading (isValid was already true to get there), so it's retryable the
// same way a genuine upload failure is.
const isRetryableFailure = (video: ImportVideo, videos: ImportVideo[], uploadedVideos: Video[]) => (
  (video.status === "failed" || video.status === "cancelled") && canUploadVideo(video, videos, uploadedVideos)
);

// Permanently invalid/duplicate videos don't count - there's nothing left to
// do with them, so they shouldn't hold the beforeunload guard open forever.
const hasUnfinishedWork = (video: ImportVideo, videos: ImportVideo[], uploadedVideos: Video[]) => (
  video.status === "pending"
  || video.status === "uploading"
  || canUploadVideo(video, videos, uploadedVideos)
);

const getValidationTag = (video: ImportVideo) => {
  if (video.isLoading || video.isValid === undefined) {
    return <Tag icon={<LoadingOutlined spin />} color="processing">{video.loadingMessage ?? "checking video"}</Tag>;
  }

  if (video.isValid === false) {
    return (
      <Tooltip title={video.validationMessage}>
        <Tag icon={<CloseCircleOutlined />} color="error">invalid</Tag>
      </Tooltip>
    );
  }

  if (video.needsWebOptimisation) {
    return (
      <Tooltip title={video.validationMessage}>
        <Tag icon={<WarningOutlined />} color="warning">needs web optimisation</Tag>
      </Tooltip>
    );
  }

  if (video.wasWebOptimised) {
    return (
      <Tooltip title="This video has been optimised for web playback.">
        <Tag icon={<CheckCircleOutlined />} color="success">valid</Tag>
      </Tooltip>
    );
  }

  return (
    <Tooltip title="This video is compatible with AnimalMatch.">
      <Tag icon={<CheckCircleOutlined />} color="success">valid</Tag>
    </Tooltip>
  );
};

const getDuplicateTag = (duplicateVideo: ImportVideo) => (
  <Tooltip title={`Matches ${duplicateVideo.filename} and will be skipped on upload.`}>
    <Tag icon={<WarningOutlined />} color="warning">duplicate video</Tag>
  </Tooltip>
);

const getUploadedDuplicateTag = (duplicateVideo: Video) => (
  <Tooltip title={`Already uploaded as ${duplicateVideo.filename} and will be skipped on upload.`}>
    <Tag icon={<WarningOutlined />} color="warning">already uploaded</Tag>
  </Tooltip>
);

const getStatusContent = (video: ImportVideo, videos: ImportVideo[], uploadedVideos: Video[]) => {
  if (video.isLoading || video.isValid === undefined) {
    return getValidationTag(video);
  }

  const duplicateVideo = getDuplicateVideo(video, videos);

  if (duplicateVideo) return getDuplicateTag(duplicateVideo);

  const uploadedDuplicateVideo = getUploadedDuplicateVideo(video, uploadedVideos);
  if (uploadedDuplicateVideo) return getUploadedDuplicateTag(uploadedDuplicateVideo);

  if (video.isValid !== false && !video.needsWebOptimisation && !video.fileHash) {
    return <Tag icon={<LoadingOutlined spin />} color="processing">checking duplicates</Tag>;
  }

  return getValidationTag(video);
};

const getProgressContent = (video: ImportVideo, videos: ImportVideo[], uploadedVideos: Video[], hasUploadStarted: boolean) => {
  const duplicateVideo = getDuplicateVideo(video, videos);
  const uploadedDuplicateVideo = getUploadedDuplicateVideo(video, uploadedVideos);

  if (!hasUploadStarted && (video.isValid === false || video.needsWebOptimisation || duplicateVideo || uploadedDuplicateVideo)) {
    return <Text type="secondary">-</Text>;
  }

  if (video.isValid === false) {
    return <Tag color="error">skipped</Tag>;
  }

  if (video.needsWebOptimisation) {
    return <Tag color="warning">skipped</Tag>;
  }

  if (duplicateVideo || uploadedDuplicateVideo) {
    return <Tag color="warning">skipped</Tag>;
  }

  return <Progress percent={video.progressPercent} size="small" />;
};

const shouldShowUploadStatus = (video: ImportVideo) => (
  video.status === "uploading"
  || video.status === "uploaded"
  || video.status === "cancelled"
  || (video.status === "failed" && video.isValid)
);

const ImportsPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const [videos, setVideos] = useState<ImportVideo[]>([]);
  const [hasUploadStarted, setHasUploadStarted] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const thumbnailUrlsRef = useRef<Record<string, string>>({});
  const uploadedVideos = useVideoStore((state) => state.processedRecords);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const uploadAbortControllerRef = useRef<AbortController | null>(null);

  const hasUnfinishedImportWork = videos.some((video) => hasUnfinishedWork(video, videos, uploadedVideos));

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  // beforeunload only covers leaving the app entirely (refresh, close tab,
  // typing a new URL) - it never fires for React Router's own in-app
  // navigation (header links, back/forward), which useBlocker handles below.
  useEffect(() => {
    if (!hasUnfinishedImportWork) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnfinishedImportWork]);

  const navigationBlocker = useBlocker(hasUnfinishedImportWork);

  useEffect(() => {
    if (navigationBlocker.state !== "blocked") return;

    modal.confirm({
      title: "Leave this import?",
      content: "Videos still uploading or waiting to upload will be lost if you leave now.",
      okText: "Leave",
      okButtonProps: { danger: true },
      cancelText: "Stay",
      onOk: () => navigationBlocker.proceed(),
      onCancel: () => navigationBlocker.reset(),
    });
  }, [navigationBlocker, modal]);

  // Object URLs are created lazily per video and revoked once that video is
  // removed (or the page unmounts), so we never leak one per thumbnail.
  useEffect(() => {
    setThumbnailUrls((currentUrls) => {
      const nextUrls = { ...currentUrls };
      const currentIds = new Set(videos.map((video) => video.localId));
      let didChange = false;

      for (const video of videos) {
        if (video.thumbnailFile && !nextUrls[video.localId]) {
          nextUrls[video.localId] = URL.createObjectURL(video.thumbnailFile);
          didChange = true;
        }
      }

      for (const localId of Object.keys(nextUrls)) {
        if (!currentIds.has(localId)) {
          URL.revokeObjectURL(nextUrls[localId]);
          delete nextUrls[localId];
          didChange = true;
        }
      }

      const result = didChange ? nextUrls : currentUrls;
      thumbnailUrlsRef.current = result;
      return result;
    });
  }, [videos]);

  useEffect(() => () => {
    Object.values(thumbnailUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const updateVideo = (localId: string, changes: Partial<ImportVideo>) => {
    setVideos((currentVideos) => currentVideos.map((video) => (
      video.localId === localId ? { ...video, ...changes } : video
    )));
  };

  const failVideo = (localId: string, validationMessage: string) => {
    updateVideo(localId, {
      status: "failed",
      isLoading: false,
      loadingMessage: undefined,
      isValid: false,
      needsWebOptimisation: false,
      wasWebOptimised: false,
      validationMessage,
    });
  };

  const validateVideo = async (video: ImportVideo) => {
    try {
      updateVideo(video.localId, {
        isLoading: true,
        loadingMessage: "checking video",
      });

      const result = await isValidVideoForImport(video.file);

      updateVideo(video.localId, {
        status: result.isValid && !result.needsWebOptimisation ? "ready" : result.isValid ? "pending" : "failed",
        isLoading: result.needsWebOptimisation,
        loadingMessage: result.needsWebOptimisation ? "optimising for web" : undefined,
        isValid: result.isValid,
        needsWebOptimisation: result.needsWebOptimisation,
        wasWebOptimised: false,
        thumbnailFile: undefined,
        validationMessage: result.message,
      });

      return result;
    } catch {
      failVideo(video.localId, "Video validation failed.");
      return undefined;
    }
  };

  const hashVideoSource = async (video: ImportVideo, file = video.file) => {
    try {
      updateVideo(video.localId, {
        isLoading: true,
        loadingMessage: "checking duplicates",
      });

      const result = await hashFileSample(file);

      updateVideo(video.localId, {
        status: "ready",
        isLoading: false,
        loadingMessage: undefined,
        fileHash: result.hash,
      });

      return true;
    } catch {
      failVideo(video.localId, "Could not hash video source.");
      return false;
    }
  };

  const optimiseVideoForWeb = async (video: ImportVideo) => {
    try {
      updateVideo(video.localId, {
        isLoading: true,
        loadingMessage: "optimising for web",
      });

      const result = await optimiseMp4ForWeb(video.file);
      const validationResult = await isValidVideoForImport(result.file);

      if (!validationResult.isValid || validationResult.needsWebOptimisation) {
        failVideo(video.localId, "Video web optimisation failed.");
        return undefined;
      }

      updateVideo(video.localId, {
        file: result.file,
        fileSize: result.file.size,
        status: "ready",
        isLoading: false,
        loadingMessage: undefined,
        isValid: true,
        needsWebOptimisation: false,
        wasWebOptimised: true,
        validationMessage: undefined,
      });

      return result.file;
    } catch {
      failVideo(video.localId, "Video web optimisation failed.");
      return undefined;
    }
  };

  const createThumbnailForVideo = async (video: ImportVideo, file: File) => {
    try {
      updateVideo(video.localId, {
        isLoading: true,
        loadingMessage: "creating thumbnail",
      });

      const thumbnailFile = await createVideoThumbnail(file);
      updateVideo(video.localId, { thumbnailFile });

      return true;
    } catch {
      failVideo(video.localId, "Could not create a thumbnail. The video may not be playable in this browser.");
      return false;
    }
  };

  const prepareVideo = async (video: ImportVideo) => {
    const validationResult = await validateVideo(video);
    if (!validationResult?.isValid) return;

    const fileToUpload = validationResult.needsWebOptimisation
      ? await optimiseVideoForWeb(video)
      : video.file;

    if (!fileToUpload) return;

    const hasThumbnail = await createThumbnailForVideo(video, fileToUpload);
    if (!hasThumbnail) return;

    await hashVideoSource(video, fileToUpload);
  };

  const prepareVideos = async (videosToPrepare: ImportVideo[]) => {
    for (const video of videosToPrepare) {
      await prepareVideo(video);
    }
  };

  const addFiles = (files: FileList | FileWithRelativePath[] | null) => {
    if (!files) return;

    const allFiles = Array.from(files);
    const videosToAdd = allFiles
      .filter(isMp4File)
      .map((file) => createImportVideo(file as FileWithRelativePath));
    const skippedCount = allFiles.length - videosToAdd.length;

    if (skippedCount > 0) {
      message.warning(`Only .mp4 files are supported. Skipped ${skippedCount} file${skippedCount === 1 ? "" : "s"}.`);
    }

    if (videosToAdd.length === 0) return;

    setVideos((currentVideos) => [...currentVideos, ...videosToAdd]);
    void prepareVideos(videosToAdd);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files);
    event.target.value = "";
  };

  const handleDropzoneDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDraggingOver(true);
  };

  const handleDropzoneDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDropzoneDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);

    void readDroppedFiles(event.dataTransfer.items).then(addFiles);
  };

  const removeVideo = (localId: string) => {
    setVideos((currentVideos) => currentVideos.filter((video) => video.localId !== localId));
  };

  const uploadVideo = async (video: ImportVideo, signal: AbortSignal) => {
    updateVideo(video.localId, {
      status: "uploading",
      isLoading: false,
      loadingMessage: undefined,
      progressPercent: 0,
      errorMessage: undefined,
    });

    try {
      await pocketBaseVideoUploadAdapter.uploadVideo(video, (progressPercent) => {
        updateVideo(video.localId, { progressPercent });
      }, signal);

      updateVideo(video.localId, { status: "uploaded", progressPercent: 100 });
    } catch (error) {
      if (signal.aborted) {
        updateVideo(video.localId, { status: "cancelled" });
        return;
      }

      updateVideo(video.localId, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Upload failed",
      });
    }
  };

  const runUploads = async (videosToUpload: ImportVideo[]) => {
    setHasUploadStarted(true);

    const controller = new AbortController();
    uploadAbortControllerRef.current = controller;

    try {
      for (const video of videosToUpload) {
        if (controller.signal.aborted) break;
        await uploadVideo(video, controller.signal);
      }
    } finally {
      if (uploadAbortControllerRef.current === controller) {
        uploadAbortControllerRef.current = null;
      }
    }
  };

  const uploadReadyVideos = () => (
    runUploads(videos.filter((video) => canUploadVideo(video, videos, uploadedVideos)))
  );

  const retryVideo = (video: ImportVideo) => runUploads([video]);

  const retryFailedVideos = () => (
    runUploads(videos.filter((video) => isRetryableFailure(video, videos, uploadedVideos)))
  );

  const cancelUpload = () => {
    uploadAbortControllerRef.current?.abort();
  };

  const uploadableVideoCount = videos.filter((video) => canUploadVideo(video, videos, uploadedVideos)).length;
  const isUploading = videos.some((video) => video.status === "uploading");
  const totalSize = videos.reduce((sum, video) => sum + video.fileSize, 0);

  const checkingCount = videos.filter((video) => video.isLoading || video.isValid === undefined).length;
  const uploadingCount = videos.filter((video) => video.status === "uploading").length;
  const uploadedCount = videos.filter((video) => video.status === "uploaded").length;
  const failedCount = videos.filter((video) => isRetryableFailure(video, videos, uploadedVideos)).length;
  const readyCount = videos.filter((video) => video.status === "ready" && canUploadVideo(video, videos, uploadedVideos)).length;
  const skippedCount = videos.length - checkingCount - uploadingCount - uploadedCount - failedCount - readyCount;

  // Weight overall progress by bytes so one large video doesn't count the
  // same as a small one.
  const batchVideos = videos.filter((video) => (
    canUploadVideo(video, videos, uploadedVideos)
    || video.status === "uploading"
    || video.status === "uploaded"
    || (video.status === "failed" && video.isValid)
  ));
  const batchTotalBytes = batchVideos.reduce((sum, video) => sum + video.fileSize, 0);
  const uploadedBytes = batchVideos
    .filter((video) => video.status === "uploaded")
    .reduce((sum, video) => sum + video.fileSize, 0);
  const uploadingBytes = batchVideos
    .filter((video) => video.status === "uploading")
    .reduce((sum, video) => sum + (video.fileSize * video.progressPercent) / 100, 0);

  const toBatchPercent = (bytes: number) => (batchTotalBytes === 0 ? 0 : Math.round((bytes / batchTotalBytes) * 100));
  const uploadedPercent = toBatchPercent(uploadedBytes);
  const overallPercent = toBatchPercent(uploadedBytes + uploadingBytes);

  const columns: ColumnsType<ImportVideo> = [
    {
      title: "Video",
      dataIndex: "filename",
      render: (_, video) => (
        <Flex align="center" justify="space-between" gap="small">
          <Flex align="center" gap="small">
            <div
              style={{
                width: 64,
                height: 36,
                borderRadius: 4,
                overflow: "hidden",
                background: "#f0f0f0",
                flexShrink: 0,
              }}
            >
              {thumbnailUrls[video.localId] && (
                <img
                  src={thumbnailUrls[video.localId]}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              )}
            </div>
            <Space direction="vertical" size={0}>
              <Text strong>{video.filename}</Text>
              {video.relativePath && <Text type="secondary">{video.relativePath}</Text>}
            </Space>
          </Flex>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label={`Remove ${video.filename} from the import list`}
            onClick={() => removeVideo(video.localId)}
            disabled={isUploading}
          />
        </Flex>
      ),
    },
    {
      title: "Size",
      dataIndex: "fileSize",
      render: (fileSize: number) => formatFileSize(fileSize),
      width: 120,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: ImportVideoStatus, video) => {
        const canRetry = !isUploading && isRetryableFailure(video, videos, uploadedVideos);

        return (
          <Space direction="vertical" size={0}>
            <Space size={4}>
              {shouldShowUploadStatus(video)
                ? <Tag color={statusColors[status]}>{status}</Tag>
                : getStatusContent(video, videos, uploadedVideos)}
              {canRetry && (
                <Tooltip title="Retry upload">
                  <Button
                    type="text"
                    size="small"
                    icon={<ReloadOutlined />}
                    aria-label={`Retry upload for ${video.filename}`}
                    onClick={() => void retryVideo(video)}
                  />
                </Tooltip>
              )}
            </Space>
            {video.errorMessage && (
              <Text type="danger">{video.errorMessage}</Text>
            )}
          </Space>
        );
      },
      width: 220,
    },
    {
      title: "Progress",
      dataIndex: "progressPercent",
      render: (_, video) => getProgressContent(video, videos, uploadedVideos, hasUploadStarted),
      width: 220,
    },
  ];

  return (
    <DashboardContent>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <Title level={2}>Import videos to AnimalMatch</Title>
          <Text type="secondary">
            Select or drag in .mp4 files or folders to check, hash, and upload them.
          </Text>
        </div>

        <Flex gap="large" wrap="wrap" align="stretch">
          <Card style={{ flex: "0 0 380px" }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
              }}
              onDragOver={handleDropzoneDragOver}
              onDragLeave={handleDropzoneDragLeave}
              onDrop={handleDropzoneDrop}
              style={{
                border: `2px dashed ${isDraggingOver ? "#0958d9" : "#1677ff"}`,
                borderRadius: 8,
                background: isDraggingOver ? "#e6f4ff" : "#fafafa",
                padding: "32px 24px",
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color 0.2s, background-color 0.2s",
              }}
            >
              <UploadOutlined style={{ fontSize: 32, color: "#1677ff" }} />
              <div style={{ marginTop: 12 }}>
                <Text strong>Click or drag video files or folders here to import</Text>
              </div>
              <Text type="secondary">Supports .mp4 files</Text>
            </div>

            <Flex justify="center" style={{ marginTop: 12 }}>
              <Button type="link" icon={<FolderOpenOutlined />} onClick={() => folderInputRef.current?.click()}>
                or select a folder
              </Button>
            </Flex>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,.mp4"
              multiple
              hidden
              onChange={handleFileInputChange}
            />
            <input
              ref={folderInputRef}
              type="file"
              accept="video/mp4,.mp4"
              multiple
              hidden
              onChange={handleFileInputChange}
            />
          </Card>

          {videos.length > 0 && (
            <Card style={{ flex: "1 1 360px" }}>
              <ImportBatchSummary
                counts={{
                  selected: videos.length,
                  checking: checkingCount,
                  ready: readyCount,
                  uploading: uploadingCount,
                  uploaded: uploadedCount,
                  failed: failedCount,
                  skipped: skippedCount,
                }}
                totalSizeLabel={formatFileSize(totalSize)}
                overallPercent={overallPercent}
                uploadedPercent={uploadedPercent}
                isUploading={isUploading}
                uploadableCount={uploadableVideoCount}
                onUpload={uploadReadyVideos}
                onRetryFailed={retryFailedVideos}
                onCancel={cancelUpload}
              />
            </Card>
          )}
        </Flex>

        <Table
          rowKey="localId"
          columns={columns}
          dataSource={videos}
          pagination={{ pageSize: 25, showSizeChanger: true }}
          locale={{ emptyText: "Select videos or a folder to start import." }}
        />
      </Space>
    </DashboardContent>
  );
};

export default ImportsPage;
