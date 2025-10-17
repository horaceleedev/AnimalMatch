import React, { useMemo } from 'react';
import { generatePath, Link } from 'react-router-dom';
import { Button, Card, Collapse, Flex, Select, Space, Tag, Tooltip } from 'antd';
import { groupBy, orderBy } from 'es-toolkit';

import { StarOutlined } from '@ant-design/icons';

import { Individual, MetadataFieldsType } from '../types.ts';
import "./IndividualsGridView.scss";

const imgStyle: React.CSSProperties = {
  display: 'block',
  width: 200,
};

interface BasicIndividualsGridViewProps {
  individuals: Individual[];
  individualsMetadataFields: MetadataFieldsType;
  isListView?: boolean;
  linkTemplate?: string;
  buttons?: (individual: Individual) => JSX.Element;
  allowEditingAgeAndSex?: boolean;
};

const BasicIndividualsGridView: React.FC<BasicIndividualsGridViewProps> = ({
  individuals, individualsMetadataFields, isListView, linkTemplate = "/individuals/:individualId", buttons, allowEditingAgeAndSex
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
          <Link key={individual.id} to={generatePath(linkTemplate, { individualId: individual.id })} className="individual-card-wrapper">
            <Card hoverable bordered={true} size="small" cover={
              <div style={{display: 'flex', overflow: 'scroll', height: 150, columnGap: 5, borderRadius: 5}}>
                {
                  individual.crops.map(crop => (
                    <img
                      key={crop.id}
                      src={crop.imageUrl}
                      style={{display: 'inline-block', height: 150, borderRadius: 5}}
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
                          options={['adult', 'infant', 'juvenile', 'adolescent', 'unknown age'].map(val => ({ value: val, label: val }))}
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
                          options={['female', 'male', 'unknown/other sex'].map(val => ({ value: val, label: val }))}
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

interface IndividualsGridViewProps extends BasicIndividualsGridViewProps {
  sortFields: string[];
  sortOrders: ("asc" | "desc")[];
  groupFields: string[];
  groupOrders: ("asc" | "desc")[];
};

const IndividualsGridView: React.FC<IndividualsGridViewProps> = ({
  individuals, individualsMetadataFields, isListView, linkTemplate, buttons, allowEditingAgeAndSex,
  sortFields, sortOrders, groupFields, groupOrders
}: IndividualsGridViewProps) => {
  const individualsSorted = orderBy(individuals, sortFields, sortOrders);
  
  // TODO check if the below works when groupFields.length === 0
  const groupedIndividuals: [any, Individual[]][] = useMemo(() => (
    orderBy(
      Object.entries(groupBy<Individual, any>(individualsSorted, indiv => indiv[groupFields[0]])),
      [([groupValue, _]) => groupValue],
      [groupOrders[0]]
    )
  ), [individualsSorted]);
  
  if (groupFields.length === 0) return (
    <BasicIndividualsGridView
      individuals={individualsSorted}
      individualsMetadataFields={individualsMetadataFields}
      isListView={isListView}
      linkTemplate={linkTemplate}
      buttons={buttons}
      allowEditingAgeAndSex={allowEditingAgeAndSex}
    />
  );
  return groupedIndividuals.map(([groupValue, groupIndividuals]) => (
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
          label: (
            (individualsMetadataFields[groupFields[0]].displayBooleanValuesAs) ? 
            // Use 'displayBooleanValuesAs'
            <span>{individualsMetadataFields[groupFields[0]].displayBooleanValuesAs[Number(groupValue === 'true')]}</span>
            :
            <span>{individualsMetadataFields[groupFields[0]].displayName}: {groupValue}</span>
          ),
          children: (
            <BasicIndividualsGridView
              individuals={groupIndividuals}
              individualsMetadataFields={individualsMetadataFields}
              isListView={isListView}
              linkTemplate={linkTemplate}
              buttons={buttons}
              allowEditingAgeAndSex={allowEditingAgeAndSex}
            />
          ),
        },
      ]}
      // expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
      // style={{ background: token.colorBgContainer }}
    />
  ));
};

export default IndividualsGridView;