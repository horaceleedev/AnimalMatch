import React from "react";
import { Badge, Button, Flex, Progress, Space, Typography } from "antd";
import { CloseCircleOutlined, ReloadOutlined, UploadOutlined } from "@ant-design/icons";

const { Text } = Typography;

export interface ImportBatchCounts {
  selected: number;
  checking: number;
  ready: number;
  uploading: number;
  uploaded: number;
  failed: number;
  skipped: number;
}

interface ImportBatchSummaryProps {
  counts: ImportBatchCounts;
  totalSizeLabel: string;
  overallPercent: number;
  uploadedPercent: number;
  isUploading: boolean;
  uploadableCount: number;
  onUpload: () => void;
  onCancel?: () => void;
  onRetryFailed?: () => void;
}

const ImportBatchSummary: React.FC<ImportBatchSummaryProps> = ({
  counts,
  totalSizeLabel,
  overallPercent,
  uploadedPercent,
  isUploading,
  uploadableCount,
  onUpload,
  onCancel,
  onRetryFailed,
}) => {
  const progressStatus = isUploading ? "active" : counts.failed > 0 ? "exception" : undefined;

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Flex justify="space-between" align="center" wrap="wrap" gap="middle">
        <Space size="large" wrap>
          <Text strong>{counts.uploaded} of {counts.selected} uploaded</Text>
          <Text type="secondary">{counts.selected} selected · {totalSizeLabel}</Text>
        </Space>

        <Space wrap>
          {onRetryFailed && counts.failed > 0 && !isUploading && (
            <Button icon={<ReloadOutlined />} onClick={onRetryFailed}>
              Retry {counts.failed} failed
            </Button>
          )}
          {onCancel && isUploading && (
            <Button danger icon={<CloseCircleOutlined />} onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={onUpload}
            disabled={uploadableCount === 0 || isUploading}
          >
            Upload
          </Button>
        </Space>
      </Flex>

      <Progress
        percent={overallPercent}
        success={{ percent: Math.min(uploadedPercent, overallPercent) }}
        status={progressStatus}
        format={() => `${overallPercent}%`}
      />

      <Space size="middle" wrap>
        {counts.checking > 0 && <Badge status="default" text={`${counts.checking} checking`} />}
        {counts.ready > 0 && <Badge status="default" text={`${counts.ready} ready`} />}
        {counts.uploading > 0 && <Badge status="processing" text={`${counts.uploading} uploading`} />}
        {counts.uploaded > 0 && <Badge status="success" text={`${counts.uploaded} uploaded`} />}
        {counts.failed > 0 && <Badge status="error" text={`${counts.failed} failed`} />}
        {counts.skipped > 0 && <Badge status="warning" text={`${counts.skipped} skipped`} />}
      </Space>
    </Space>
  );
};

export default ImportBatchSummary;
