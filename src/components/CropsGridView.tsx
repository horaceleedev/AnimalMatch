import React, { useMemo } from 'react'
import { generatePath, Link } from "react-router-dom";
import { Card, Collapse, Flex, Space, Tag, Tooltip, Typography } from "antd";
import { groupBy, orderBy } from "es-toolkit";

import type { Crop, MetadataFieldsType, RecordType } from "../types.ts";
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
              style={{ overflow: 'hidden' }}
              styles={{ body: { padding: 0 } }}
            >
              <Flex vertical justify="space-between">
                <img src={crop.imageUrl} />
                <Flex vertical style={{ padding: '8px 12px 12px 12px', width: '100%' }}>
                  <Space wrap size={4}>
                    {
                      ['body_part'].map(field => (
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

interface CropsGridViewProps extends BasicCropsGridViewProps {
  sortFields: string[];
  sortOrders: ("asc" | "desc")[];
  groupFields: string[];
  groupOrders: ("asc" | "desc")[];
};

const CropsGridView: React.FC<CropsGridViewProps> = ({
  crops, cropsMetadataFields, linkTemplate,
  sortFields, sortOrders, groupFields, groupOrders,
  openModal,
}: CropsGridViewProps) => {
  const cropsSorted = orderBy(crops, sortFields, sortOrders);
  
  // TODO check if the below works when groupFields.length === 0
  const groupedCrops: [any, Crop[]][] = useMemo(() => (
    orderBy(
      Object.entries(groupBy<Crop, any>(cropsSorted, v => v[groupFields[0]])),
      [([groupValue, _]) => groupValue],
      [groupOrders[0]]
    )
  ), [cropsSorted]);

  if (groupFields.length === 0) return (
    <BasicCropsGridView
      crops={cropsSorted}
      cropsMetadataFields={cropsMetadataFields}
      linkTemplate={linkTemplate}
      openModal={openModal}
    />
  );

  return groupedCrops.map(([groupValue, groupCrops]) => (
    <Collapse
      key={groupValue}
      collapsible="header"
      defaultActiveKey={['1']}
      style={{
        marginBottom: 12
      }}
      items={[
        {
          key: '1',
          label: <span>{cropsMetadataFields[groupFields[0]].displayName}: {groupValue}</span>,
          children: (
            <BasicCropsGridView
              crops={groupCrops}
              cropsMetadataFields={cropsMetadataFields}
              linkTemplate={linkTemplate}
              openModal={openModal}
            />
          ),
        },
      ]}
      // expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
      // style={{ background: token.colorBgContainer }}
    />
  ));
};

export default CropsGridView;