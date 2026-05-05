import React, { MouseEvent, useCallback } from 'react'
import { generatePath, Link } from "react-router-dom";
import { Card, Flex, Space, Tag, Tooltip, Typography } from "antd";

import type { RecordSelectionUi } from "../../hooks/useRecordSelectionUi.ts";
import type { Crop, MetadataFieldsType, RecordType } from "../../types.ts";
import withSortingGroupingAndPagination from './withSortingGroupingAndPagination.tsx';
import "./CropsGridView.scss"

interface BasicCropsGridViewProps {
  crops: Crop[];
  cropsMetadataFields: MetadataFieldsType;
  selectionUi?: RecordSelectionUi;
  linkTemplate?: string;
  openModal?: (type: RecordType , id: string) => void;
};

// Basic crops grid view (without grouping and sorting)
const BasicCropsGridView: React.FC<BasicCropsGridViewProps> = ({
  crops, cropsMetadataFields, selectionUi, linkTemplate = "/crops/:cropId", openModal,
}: BasicCropsGridViewProps) => {
  const selectionModeActive = selectionUi?.selectionModeActive ?? false;
  const selectedItems = selectionUi?.selectedItems ?? new Set<string>();

  const selectCrop = useCallback(
    (cropId: string) => (event: MouseEvent) => {
      event.preventDefault();
      selectionUi?.toggleItemSelection(cropId);
    },
    [selectionUi],
  );

  const openCrop = useCallback(
    (cropId: string) => (event: MouseEvent) => {
      if (!openModal) return;
      event.preventDefault();
      openModal("crop", cropId);
    },
    [openModal],
  );

  return (
    <div className="gallery-view">
      <div className="crops-grid">
        {
          crops.map((crop: Crop) => (
            <Link
              key={crop.id}
              to={generatePath(linkTemplate, {cropId: crop.id})}
              onClick={(selectionModeActive ? selectCrop : openCrop)(crop.id)}
            >
              <Card
                className={
                  selectionModeActive && selectedItems.has(crop.id)
                    ? "selected"
                    : ""
                }
                hoverable
                style={{ overflow: 'hidden' }}
                styles={{ body: { padding: 0 } }}
              >
                <Flex vertical justify="space-between">
                  <img src={crop.imageUrl} />
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
    </div>
  );
};

const CropsGridView = withSortingGroupingAndPagination< BasicCropsGridViewProps, Crop>(
  BasicCropsGridView,
  { processedRecordsProp: 'crops', metadataFieldsProp: 'cropsMetadataFields' }
);

export default CropsGridView;
