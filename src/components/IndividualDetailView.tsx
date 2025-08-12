import React, { useEffect, useMemo, useState } from 'react'
import { DatePicker, Form, Image, Input, InputNumber, Select, Tag } from "antd";
import TextArea from 'antd/es/input/TextArea';
import dayjs from "dayjs";
import { intersection, pick } from 'es-toolkit';

import { individualsMetadataFields, videoMetadataFields } from '../metadata.tsx';
import VideosGridView from '../components/VideosGridView.tsx';
import IndividualsGridView from '../components/IndividualsGridView.tsx';
import { Individual, LocationInfo, Video } from '../types.ts';
import BasicMapView from './BasicMapView.tsx';

type IndividualDetailViewProps = {
  individual: Individual;
  seenTogetherIndividuals: Individual[];
  videosWithIndividual: Video[];
  uniqueValuesPerField: Record<string, string[]>;
  uniqueLocations: LocationInfo[];
}

const IndividualDetailView: React.FC<IndividualDetailViewProps> = ({
  individual,
  seenTogetherIndividuals,
  videosWithIndividual,
  uniqueValuesPerField,
  uniqueLocations,
}: IndividualDetailViewProps) => {
  // Temporary hack needed because map wasn't showing up properly
  const [showMap, setShowMap] = useState(false);
  useEffect(() => {
    setShowMap(true);
  }, []);
  
  return (
    <>
      {/* Images display */}
      <div style={{display: "flex", flexWrap: "wrap", columnGap: 5, rowGap: 5}}>
        <Image.PreviewGroup>
          {
            individual.images.map(img => (
              <Image
                key={img}
                height={150}
                src={img}
                style={{width: 'unset'}}
              />
            ))
          }
        </Image.PreviewGroup>
      </div>
      {/* <div style={{display: 'flex', overflow: 'scroll', height: 150, columnGap: 5}}>
        {
          individual.images.map(img => (
            <img
              key={img}
              src={img}
              style={{display: 'inline-block', height: 150}}
            />
          ))
        }
      </div> */}
      <br />
      <Form
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 19 }}
        labelWrap
        layout="horizontal"
        initialValues={pick(individual, Object.keys(individualsMetadataFields))}
        style={{ maxWidth: 600 }}
      >
        {
          Object.entries(individualsMetadataFields).map(([fieldValue, value]) => {
            let inputElement = <></>;
            const disabled = value.isInternal || value.isUneditable;
            if (value.type === 'rich_text') {
              inputElement = <TextArea autoSize={{ minRows: 3, maxRows: 6 }} />
            } else if (value.inputType === 'text') {
              inputElement = <Input disabled={disabled} />;
            } else if (value.valueEditorType === 'select') {
              inputElement = (
                <Select
                  options={uniqueValuesPerField[fieldValue].map(val => ({ value: val, label: val }))}
                  disabled={disabled}
                  labelRender={(option) => (
                    // <Tag icon={value.icon}>
                    //   {option.label}
                    // </Tag>
                    <Tag>{option.label}</Tag>
                  )}
                />
              );
            } else if (value.valueEditorType === 'multiselect') {
              inputElement = (
                <Select
                  mode="tags"
                  options={uniqueValuesPerField[fieldValue].map(val => ({ value: val, label: val }))}
                  disabled={disabled}
                />
              );
            } else if (value.inputType === 'date') {
              inputElement = <DatePicker showTime needConfirm={false} disabled={disabled} />;
            } else if (value.inputType === 'number') {
              inputElement = <InputNumber disabled={disabled} />;
            }
            return (
              <Form.Item key={fieldValue} label={value.displayName} name={fieldValue}>
                {inputElement}
              </Form.Item>
            );
          })
        }
      </Form>
      <div style={{padding: 10}}>
        <h2>Videos with this individual</h2>
        <VideosGridView videos={videosWithIndividual} videoMetadataFields={videoMetadataFields} isListView={false} sortFields={[]} sortOrders={[]} groupFields={[]} groupOrders={[]} />
        {
          (seenTogetherIndividuals.length > 0) &&
          <>
            <h2>Other individuals seen together with this individual</h2>
            <IndividualsGridView individuals={seenTogetherIndividuals} individualsMetadataFields={individualsMetadataFields} sortFields={[]} sortOrders={[]} groupFields={[]} groupOrders={[]} />
          </>
        }
      </div>
      {
        showMap && // Temporary hack needed because map wasn't showing up properly
        <BasicMapView
          style={{height: 400, width: 600}}
          uniqueLocations={uniqueLocations} 
          highlightLocationIds={videosWithIndividual.map(video => JSON.stringify([video.lat, video.long]))}
        />
      }
    </>
  )
}

export default IndividualDetailView