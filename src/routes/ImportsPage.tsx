import React, { useEffect, useRef, useState } from "react";
import { Button, Card, Flex, Progress, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, FolderOpenOutlined, LoadingOutlined, UploadOutlined, WarningOutlined } from "@ant-design/icons";
import { nanoid } from "nanoid";

import DashboardContent from "../components/dashboards/DashboardContent";
import type { ImportVideo, ImportVideoStatus } from "../importTypes";
import { pocketBaseVideoUploadAdapter } from "../importUploadAdapters";
import { hashFileSample } from "../lib/fileHashing";
import { isValidVideoForImport } from "../lib/importVideoValidation";
import { useVideoStore } from "../DataStores";
import type { Video } from "../types";

const { Text, Title } = Typography;

type FileWithRelativePath = File & { webkitRelativePath?: string };

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

const formatShortHash = (hash: string) => hash.slice(0, 12);

const getDuplicateVideo = (video: ImportVideo, videos: ImportVideo[]) => {
  if (!video.fileHash) return undefined;

  const videoIndex = videos.findIndex((candidate) => candidate.localId === video.localId);
  if (videoIndex === -1) return undefined;

  return videos.slice(0, videoIndex).find((candidate) => candidate.fileHash === video.fileHash);
};

const getUploadedDuplicateVideo = (video: ImportVideo, uploadedVideos: Video[]) => {
  if (!video.fileHash) return undefined;

  return uploadedVideos.find((uploadedVideo) => uploadedVideo.file_hash === video.fileHash);
};

const canUploadVideo = (video: ImportVideo, videos: ImportVideo[], uploadedVideos: Video[]) => (
  video.isValid
  && !video.needsWebOptimisation
  && Boolean(video.fileHash)
  && !getDuplicateVideo(video, videos)
  && !getUploadedDuplicateVideo(video, uploadedVideos)
  && (video.status === "ready" || video.status === "failed")
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

  if (video.validationMessage) {
    return (
      <Tooltip title={video.validationMessage}>
        <Tag icon={<WarningOutlined />} color="warning">optimise on upload</Tag>
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
  video.status === "uploading" || video.status === "uploaded" || (video.status === "failed" && video.isValid)
);

const ImportsPage: React.FC = () => {
  const [videos, setVideos] = useState<ImportVideo[]>([]);
  const [hasUploadStarted, setHasUploadStarted] = useState(false);
  const uploadedVideos = useVideoStore((state) => state.processedRecords);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  const updateVideo = (localId: string, changes: Partial<ImportVideo>) => {
    setVideos((currentVideos) => currentVideos.map((video) => (
      video.localId === localId ? { ...video, ...changes } : video
    )));
  };

  const validateVideo = async (video: ImportVideo) => {
    try {
      updateVideo(video.localId, {
        isLoading: true,
        loadingMessage: "checking video",
      });

      const result = await isValidVideoForImport(video.file);

      updateVideo(video.localId, {
        status: result.isValid ? "ready" : "failed",
        isLoading: false,
        loadingMessage: undefined,
        isValid: result.isValid,
        needsWebOptimisation: result.needsWebOptimisation,
        validationMessage: result.message,
      });

      return result;
    } catch {
      updateVideo(video.localId, {
        status: "failed",
        isLoading: false,
        loadingMessage: undefined,
        isValid: false,
        needsWebOptimisation: false,
        validationMessage: "Video validation failed.",
      });

      return undefined;
    }
  };

  const hashVideoSource = async (video: ImportVideo) => {
    try {
      updateVideo(video.localId, {
        isLoading: true,
        loadingMessage: "checking duplicates",
      });

      const result = await hashFileSample(video.file);

      updateVideo(video.localId, {
        status: "ready",
        isLoading: false,
        loadingMessage: undefined,
        fileHash: result.hash,
      });

      return true;
    } catch {
      updateVideo(video.localId, {
        status: "failed",
        isLoading: false,
        loadingMessage: undefined,
        isValid: false,
        needsWebOptimisation: false,
        validationMessage: "Could not hash video source.",
      });

      return false;
    }
  };

  const prepareVideo = async (video: ImportVideo) => {
    const validationResult = await validateVideo(video);
    if (!validationResult?.isValid || validationResult.needsWebOptimisation) return;

    await hashVideoSource(video);
  };

  const prepareVideos = (videosToPrepare: ImportVideo[]) => {
    for (const video of videosToPrepare) {
      void prepareVideo(video);
    }
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;

    const videosToAdd = Array.from(files)
      .filter(isMp4File)
      .map((file) => createImportVideo(file as FileWithRelativePath));

    setVideos((currentVideos) => [...currentVideos, ...videosToAdd]);
    prepareVideos(videosToAdd);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files);
    event.target.value = "";
  };

  const removeVideo = (localId: string) => {
    setVideos((currentVideos) => currentVideos.filter((video) => video.localId !== localId));
  };

  const uploadVideo = async (video: ImportVideo) => {
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
      });

      updateVideo(video.localId, { status: "uploaded", progressPercent: 100 });
    } catch (error) {
      updateVideo(video.localId, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Upload failed",
      });
    }
  };

  const uploadReadyVideos = async () => {
    setHasUploadStarted(true);

    for (const video of videos.filter((video) => canUploadVideo(video, videos, uploadedVideos))) {
      await uploadVideo(video);
    }
  };

  const uploadableVideoCount = videos.filter((video) => canUploadVideo(video, videos, uploadedVideos)).length;
  const isUploading = videos.some((video) => video.status === "uploading");
  const uploadedVideoCount = videos.filter((video) => video.status === "uploaded").length;
  const totalSize = videos.reduce((sum, video) => sum + video.fileSize, 0);

  const columns: ColumnsType<ImportVideo> = [
    {
      title: "Video",
      dataIndex: "filename",
      render: (_, video) => (
        <Flex align="center" justify="space-between" gap="small">
          <Space direction="vertical" size={0}>
            <Text strong>{video.filename}</Text>
            {video.relativePath && <Text type="secondary">{video.relativePath}</Text>}
            {video.fileHash && (
              <Text type="secondary">file hash: {formatShortHash(video.fileHash)}</Text>
            )}
          </Space>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => removeVideo(video.localId)}
            disabled={video.status === "uploading"}
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
      render: (status: ImportVideoStatus, video) => (
        <Space direction="vertical" size={0}>
          {getStatusContent(video, videos, uploadedVideos)}
          {shouldShowUploadStatus(video) && <Tag color={statusColors[status]}>{status}</Tag>}
          {video.errorMessage && (
            <Text type="danger">{video.errorMessage}</Text>
          )}
        </Space>
      ),
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
            Placeholder import.
          </Text>
        </div>

        <Card>
          <Flex justify="space-between" gap="large" wrap="wrap">
            <Space>
              <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>
                Select videos
              </Button>
              <Button icon={<FolderOpenOutlined />} onClick={() => folderInputRef.current?.click()}>
                Select folder
              </Button>
              <Button type="primary" onClick={uploadReadyVideos} disabled={uploadableVideoCount === 0 || isUploading}>
                Upload
              </Button>
            </Space>
            <Space size="large" wrap>
              <Text>{videos.length} selected</Text>
              <Text>{uploadedVideoCount} uploaded</Text>
              <Text>{formatFileSize(totalSize)} total</Text>
            </Space>
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
