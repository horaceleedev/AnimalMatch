import React, { useState } from 'react'
import { generatePath, Link } from "react-router-dom";
import { Card, Flex, Skeleton, Space, Tag, Tooltip, Typography } from "antd";

import type { Crop, MetadataFieldsType, RecordType } from "../../types.ts";
import withSortingGroupingAndPagination from './withSortingGroupingAndPagination.tsx';
import "./CropsGridView.scss"

interface BasicCropsGridViewProps {
  crops: Crop[];
  cropsMetadataFields: MetadataFieldsType;
  linkTemplate?: string;
  openModal?: (type: RecordType , id: string) => void;
};

const CropWithSkeleton: React.FC<{ crop: Crop }> = ({ crop }) => {
  const [loaded, setLoaded] = useState(false);
  const scaledCropWidth = crop.height > 0
    ? Math.round((crop.width / crop.height) * 180)
    : 180; // fallback

  return (
    <div>
      {!loaded && (
        <Skeleton.Node active style={{height: 180, width: scaledCropWidth}} />
      )}
      <img
        src={crop.imageUrl}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        style={{display: loaded ? "block" : "none"}}
      />
    </div>
  );
};

// Basic crops grid view (without grouping and sorting)
const BasicCropsGridView: React.FC<BasicCropsGridViewProps> = ({
  crops, cropsMetadataFields, linkTemplate = "/crops/:cropId", openModal,
}: BasicCropsGridViewProps) => {
  return (
    <div className="crops-grid">
      {
        crops.map((crop: Crop) => (
          <Link
            key={crop.id}
            to={generatePath(linkTemplate, {cropId: crop.id})}
            onClick={(e) => {
              if (!openModal) return;
              e.preventDefault();
              openModal("crop", crop.id);
            }}
          >
            <Card
              hoverable
              style={{ overflow: 'hidden' }}
              styles={{ body: { padding: 0 } }}
            >
              <Flex vertical justify="space-between">
                <CropWithSkeleton crop={crop} />
                <Flex vertical style={{ padding: '8px 12px 12px 12px', width: '100%' }}>
                  <Space wrap size={4}>
                    {
                      ['body_part'].map(field => (
                        crop[field] &&
                        <Tooltip title={cropsMetadataFields[field].displayName} key={field}>
                          <Tag icon={cropsMetadataFields[field].icon}>
                            {crop[field]}
                          </Tag>
                        </Tooltip>
                      ))
                    }
                    {
                      crop.custom_tags.map(tag => (
                        <Tag key={tag}>{tag}</Tag>
                      ))
                    }
                  </Space>
                  {
                    crop.description &&
                    <Typography.Paragraph
                      ellipsis={{ rows: 2 }}
                      style={{ margin: 0, marginTop: 6, fontSize: 12, lineHeight: 1.2 }}
                    >
                      {crop.description}
                    </Typography.Paragraph>
                  }
                </Flex>
              </Flex>
            </Card>
          </Link>
        ))
      }
    </div>
  );
};

const CropsGridView = withSortingGroupingAndPagination< BasicCropsGridViewProps, Crop>(
  BasicCropsGridView,
  { processedRecordsProp: 'crops', metadataFieldsProp: 'cropsMetadataFields' }
);

export default CropsGridView;
