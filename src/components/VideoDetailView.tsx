import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { App, Button, DatePicker, Divider, Form, Input, InputNumber, Select, Tag } from "antd";
import dayjs from "dayjs";
import { isEqual, pick, pickBy } from "es-toolkit";

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
  updateVideo: (id: string, data: Partial<Video>) => Promise<void>;
};

const VideoDetailView: React.FC<VideoDetailViewProps> = ({
  video,
  individualsInVideo,
  uniqueValuesPerField,
  uniqueLocations,
  updateVideo,
}: VideoDetailViewProps) => {
  const { message } = App.useApp();

  // Temporary hack needed because map wasn't showing up properly
  const [showMap, setShowMap] = useState(false);
  useEffect(() => {
    setShowMap(true);
  }, []);

  // Changes made in the form component are saved here
  const [formData, setFormData] = useState<Partial<Video>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  useEffect(() => {
    // Initialize formData from the VideoStore, or reset it to the
    // VideoStore if there is an update received from the server
    const _formData = pick(video, Object.keys(videoMetadataFields));
    if (hasUnsavedChanges && !isEqual(formData, _formData)) {
      message.warning('Your changes have been overwritten by new data from the server');
    }
    setHasUnsavedChanges(false);
    setFormData(_formData);
  }, [video]);
  const handleValuesChange = (_: any, allValues: any) => {
    // TODO in the future, implement a more efficient check
    // Currently a deep comparison between two objects is performed on each keystroke, which can be inefficient.
    // Instead of comparing the full objects, only compare the fields that have been touched in the form
    // e.g. using https://github.com/ant-design/ant-design/issues/26222#issuecomment-716275420
    setHasUnsavedChanges(
      !isEqual(allValues, pick(video, Object.keys(videoMetadataFields)))
    );
    setFormData(allValues);
  };

  const _updateVideo = async () => {
    // Pick just the keys and values from formData that were changed from the original data
    const updatedData = pickBy(formData, (value, key) => !isEqual(value, video[key]));
    setIsSavingChanges(true);
    try {
      await updateVideo(video.id, updatedData);
    } catch (e) {
      message.error('Your changes could not be saved. Please try again later.', 10);
      setIsSavingChanges(false);
      return;
    }
    message.success('Changes saved successfully');
    setIsSavingChanges(false);
  }
  
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
        fields={Object.entries(formData).map(([k, v]) => ({
          name: k,
          value: v,
        }))}
        onValuesChange={handleValuesChange}
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
        <Form.Item style={{float: 'right'}}>
          <Button type="primary" htmlType="submit"
            disabled={!hasUnsavedChanges}
            loading={isSavingChanges}
            onClick={() => _updateVideo()}
          >
            Save changes
          </Button>
        </Form.Item>
      </Form>
      {
        showMap && // Temporary hack needed because map wasn't showing up properly
        <BasicMapView style={{height: 400, width: 600}} uniqueLocations={uniqueLocations} highlightLocationIds={[JSON.stringify([video.lat, video.long])]} />
      }
    </>
  );
};

export default VideoDetailView;