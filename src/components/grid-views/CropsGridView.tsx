import React from 'react'
import { generatePath, Link } from "react-router-dom";
import { Button, Card, Flex, Space, Tag, Tooltip, Typography } from "antd";
import { StarFilled, StarOutlined } from "@ant-design/icons";

import type { Crop, MetadataFieldsType, RecordType } from "../../types.ts";
import { useCropsStore } from "../../DataStores.tsx";
import withSortingGroupingAndPagination from './withSortingGroupingAndPagination.tsx';
import "./CropsGridView.scss"

const FEATURED_BORDER_COLOR = '#faad14';

interface BasicCropsGridViewProps {
  crops: Crop[];
  cropsMetadataFields: MetadataFieldsType;
  linkTemplate?: string;
  openModal?: (type: RecordType , id: string) => void;
};

// Basic crops grid view (without grouping and sorting)
const BasicCropsGridView: React.FC<BasicCropsGridViewProps> = ({
  crops, cropsMetadataFields, linkTemplate = "/crops/:cropId", openModal,
}: BasicCropsGridViewProps) => {
  const updateCrop = useCropsStore((state) => state.update);

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
              style={{
                overflow: 'hidden',
                outline: crop.is_featured ? `2px solid ${FEATURED_BORDER_COLOR}` : undefined,
              }}
              styles={{ body: { padding: 0 } }}
            >
              <Flex vertical justify="space-between">
                <div style={{ position: 'relative' }}>
                  <img src={crop.imageUrl} style={{ display: 'block', width: '100%' }} />
                  <Tooltip title={crop.is_featured ? 'Remove from featured' : 'Mark as featured'}>
                    <Button
                      type="text"
                      size="small"
                      icon={
                        crop.is_featured
                          ? <StarFilled style={{ color: FEATURED_BORDER_COLOR }} />
                          : <StarOutlined style={{ color: 'white' }} />
                      }
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        background: 'rgba(0,0,0,0.35)',
                        borderRadius: 4,
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateCrop(crop.id, { is_featured: !crop.is_featured });
                      }}
                    />
                  </Tooltip>
                </div>
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
