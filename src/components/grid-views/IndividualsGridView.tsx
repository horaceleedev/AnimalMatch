import React from 'react';
import { generatePath, Link } from 'react-router-dom';
import { Card, Select, Space, Tag, Tooltip } from 'antd';

import { Individual, MetadataFieldsType, RecordType } from '../../types.ts';
import CropImage from '../smart-components/CropImage.tsx';
import withSortingGroupingAndPagination from './withSortingGroupingAndPagination.tsx';
import "./IndividualsGridView.scss";

interface BasicIndividualsGridViewProps {
  individuals: Individual[];
  individualsMetadataFields: MetadataFieldsType;
  isListView?: boolean;
  linkTemplate?: string;
  buttons?: (individual: Individual) => JSX.Element;
  allowEditingAgeAndSex?: boolean;
  openModal?: (type: RecordType, id: string) => void;
};

const BasicIndividualsGridView: React.FC<BasicIndividualsGridViewProps> = ({
  individuals, individualsMetadataFields, isListView, linkTemplate = "/individuals/:individualId", buttons, allowEditingAgeAndSex, openModal,
}: BasicIndividualsGridViewProps) => {
  return (
    <div className={isListView ? "individuals-list" : "individuals-grid"}>
      {
        individuals.map(individual => (
          /* <Card hoverable styles={{ body: { padding: 0, overflow: 'hidden' } }}>
            <Flex justify="space-between">
              <Flex>
                <img
                  alt="avatar"
                  src="https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png"
                  style={imgStyle}
                />
                <img
                  alt="avatar"
                  src="https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png"
                  style={imgStyle}
                />
              </Flex>
              <Flex vertical align="flex-end" justify="space-between" style={{ padding: 12 }}>
                <Typography.Title level={5}>
                  “antd is an enterprise-class UI design language and React UI library.”
                </Typography.Title>
                <Button type="primary" href="https://ant.design" target="_blank">
                  Get Started
                </Button>
              </Flex>
            </Flex>
          </Card> */
          <Link
            key={individual.id}
            to={generatePath(linkTemplate, { individualId: individual.id })}
            onClick={(e) => {
              if (!openModal) return;
              e.preventDefault();
              openModal("individual", individual.id);
            }}
            className="individual-card-wrapper"
          >
            <Card hoverable bordered={true} size="small" cover={
              <div style={{display: 'flex', overflow: 'scroll', height: 150, columnGap: 5, borderRadius: 5}}>
                {
                  individual.crops.map(crop => (
                    <CropImage
                      key={crop.id}
                      crop={crop}
                      withSkeleton
                      wrapperStyle={{ flexShrink: 0 }}
                      imageStyle={{ height: 150, borderRadius: 5 }}
                    />
                  ))
                }
              </div>
            }>
              <Card.Meta
                title={
                  <Space>
                    <span>{individual.name}</span>
                    {
                      allowEditingAgeAndSex ?
                      <>
                        <Select
                          options={individualsMetadataFields['age'].presetOptions!.map(val => ({ value: val, label: val }))}
                          labelRender={(option) => (
                            <Tag>{option.label}</Tag>
                          )}
                          value={individual.age}
                          size="small"
                          popupMatchSelectWidth={false}
                          onClick={(e) => e.preventDefault()}
                          style={{width: 'fit-content'}}
                        />
                        <Select
                          options={individualsMetadataFields['sex'].presetOptions!.map(val => ({ value: val, label: val }))}
                          labelRender={(option) => (
                            <Tag>{option.label}</Tag>
                          )}
                          value={individual.sex}
                          size="small"
                          popupMatchSelectWidth={false}
                          onClick={(e) => e.preventDefault()}
                          style={{width: 'fit-content'}}
                        />
                      </>
                      :
                      ['age', 'sex'].map(field => (
                        <Tooltip title={individualsMetadataFields[field].displayName} key={field}>
                          <Tag style={{marginInlineEnd: 'unset'}}>{individual[field]}</Tag>
                        </Tooltip>
                      ))
                    }
                    {buttons && buttons(individual)}
                  </Space>
                }
                description={
                  <>
                    Appears in {individual.videos.length} {individual.videos.length === 1 ? 'video' : 'videos'}
                  </>
                }
              />
            </Card>
          </Link>
        ))
      }
    </div>
  );
};

const IndividualsGridView = withSortingGroupingAndPagination<BasicIndividualsGridViewProps, Individual>(
  BasicIndividualsGridView,
  { processedRecordsProp: 'individuals', metadataFieldsProp: 'individualsMetadataFields' }
);

export default IndividualsGridView;
