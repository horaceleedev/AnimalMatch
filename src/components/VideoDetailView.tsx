import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, DatePicker, Divider, Form, Input, InputNumber, Select, Tag } from "antd";
import dayjs from "dayjs";

import TextArea from 'antd/es/input/TextArea';
import BasicMapView from '../components/BasicMapView.tsx';
import { Individual, LocationInfo, MetadataFieldsType, Video } from '../types.ts';
import { individualsMetadataFields, videoMetadataFields } from '../metadata.tsx';
import IndividualsGridView from "./IndividualsGridView.tsx";
import "./VideoDetailView.scss";

type VideoDetailViewProps = {
  video: Video,
  // videoMetadataFields: MetadataFieldsType,
  individualsInVideo: Individual[],
  uniqueValuesPerField: Record<string, string[]>,
  uniqueLocations: LocationInfo[],
};

const VideoDetailView: React.FC<VideoDetailViewProps> = ({video, individualsInVideo, uniqueValuesPerField, uniqueLocations}: VideoDetailViewProps) => {
  // Temporary hack needed because map wasn't showing up properly
  const [showMap, setShowMap] = useState(false);
  useEffect(() => {
    setShowMap(true);
  }, []);
  
  return (
    <>
      <video src={video.url} style={{width: '100%', maxWidth: 800}} controls />
      <br />
      <Link to="annotate"><Button type="primary">Annotate individuals</Button></Link>
      <br />
      <Divider />
      <h3>Individuals/tracks</h3>
      <IndividualsGridView 
        individuals={individualsInVideo} individualsMetadataFields={individualsMetadataFields}
        // isListView={true}
        allowEditingAgeAndSex={true}
        sortFields={[]} sortOrders={[]} groupFields={[]} groupOrders={[]}
      />
      <Divider />
      <h3>Video metadata</h3>
      <Form
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 19 }}
        labelWrap
        layout="horizontal"
        fields={
          Object.keys(videoMetadataFields).map(field => ({
            name: field,
            value: {...video, recording_date: dayjs(video.recording_date)}[field],
          }))
        }
        style={{ maxWidth: 600 }}
      >
        {
          Object.entries(videoMetadataFields).map(([fieldValue, value]) => {
            let inputElement = <></>;
            const disabled = value.isInternal || value.isUneditable;
            if (value.type === 'rich_text') {
              inputElement = <TextArea autoSize={{ minRows: 3, maxRows: 6 }} />
            } else if (value.inputType === 'text') {
              inputElement = <Input disabled={disabled} />;
            } else if (value.valueEditorType === 'select') {
              inputElement = <Select
                options={uniqueValuesPerField[fieldValue].map(val => ({ value: val, label: val }))}
                disabled={disabled}
                labelRender={(option) => (
                  <Tag icon={value.icon}>
                    {option.label}
                  </Tag>
                )}
              />;
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
      {
        showMap && // Temporary hack needed because map wasn't showing up properly
        <BasicMapView style={{height: 400, width: 600}} uniqueLocations={uniqueLocations} highlightLocationIds={[JSON.stringify([video.lat, video.long])]} />
      }
    </>
  );
};

export default VideoDetailView;