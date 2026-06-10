import React, { useEffect, useRef, useState } from "react";
import { Button, Card, Flex, Progress, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, FolderOpenOutlined, UploadOutlined } from "@ant-design/icons";
import { nanoid } from "nanoid";

import DashboardContent from "../components/dashboards/DashboardContent";
import type { ImportVideo, ImportVideoStatus } from "../importTypes";
import { mockVideoUploadAdapter } from "../importUploadAdapters";

const { Text, Title } = Typography;

type FileWithRelativePath = File & { webkitRelativePath?: string };

const statusColors: Record<ImportVideoStatus, string> = {
  pending: "default",
  validating: "processing",
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
    status: "ready",
    progressPercent: 0,
    isValid: true,
  };
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

const canUploadVideo = (video: ImportVideo) => (
  video.isValid && (video.status === "ready" || video.status === "failed")
);

const ImportsPage: React.FC = () => {
  const [videos, setVideos] = useState<ImportVideo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  const addFiles = (files: FileList | null) => {
    if (!files) return;

    setVideos((currentVideos) => [
      ...currentVideos,
      ...Array.from(files)
        .filter(isMp4File)
        .map((file) => createImportVideo(file as FileWithRelativePath)),
    ]);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files);
    event.target.value = "";
  };

  const removeVideo = (localId: string) => {
    setVideos((currentVideos) => currentVideos.filter((video) => video.localId !== localId));
  };

  const updateVideo = (localId: string, changes: Partial<ImportVideo>) => {
    setVideos((currentVideos) => currentVideos.map((video) => (
      video.localId === localId ? { ...video, ...changes } : video
    )));
  };

  const uploadVideo = async (video: ImportVideo) => {
    updateVideo(video.localId, { status: "uploading", progressPercent: 0, errorMessage: undefined });

    try {
      await mockVideoUploadAdapter.uploadVideo(video, (progressPercent) => {
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
    for (const video of videos.filter(canUploadVideo)) {
      await uploadVideo(video);
    }
  };

  const uploadableVideoCount = videos.filter(canUploadVideo).length;
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
          <Tag color={statusColors[status]}>{status}</Tag>
          {(video.validationMessage || video.errorMessage) && (
            <Text type="danger">{video.validationMessage || video.errorMessage}</Text>
          )}
        </Space>
      ),
      width: 220,
    },
    {
      title: "Progress",
      dataIndex: "progressPercent",
      render: (progressPercent: number) => <Progress percent={progressPercent} size="small" />,
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
