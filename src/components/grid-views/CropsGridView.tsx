import React from 'react'
import { generatePath, Link } from "react-router-dom";
import { Card, Flex, Space, Tag, Tooltip, Typography } from "antd";

import type { Crop, MetadataFieldsType, RecordType } from "../../types.ts";
import CropImage from '../smart-components/CropImage.tsx';
import withSortingGroupingAndPagination from './withSortingGroupingAndPagination.tsx';
import "./CropsGridView.scss"

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
              }}
              styles={{ body: { padding: 0 } }}
            >
              <Flex vertical justify="space-between">
                <CropImage crop={crop} imageStyle={{ width: '100%' }} />
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
