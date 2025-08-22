import React, { useEffect, useState } from 'react'
import { App, Button, DatePicker, Form, Image, Input, InputNumber, Select, Tag } from "antd";
import TextArea from 'antd/es/input/TextArea';
import { isEqual, pick, pickBy } from "es-toolkit";

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
  updateIndividual: (id: string, data: Partial<Individual>) => Promise<void>;
}

const IndividualDetailView: React.FC<IndividualDetailViewProps> = ({
  individual,
  seenTogetherIndividuals,
  videosWithIndividual,
  uniqueValuesPerField,
  uniqueLocations,
  updateIndividual,
}: IndividualDetailViewProps) => {
  const { message } = App.useApp();

  // Temporary hack needed because map wasn't showing up properly
  const [showMap, setShowMap] = useState(false);
  useEffect(() => {
    setShowMap(true);
  }, []);

  // Changes made in the form component are saved here
  const [formData, setFormData] = useState<Partial<Individual>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  useEffect(() => {
    // Initialize formData from the IndividualsStore, or reset it to the
    // IndividualsStore if there is an update received from the server
    const _formData = pick(individual, Object.keys(individualsMetadataFields));
    if (hasUnsavedChanges && !isEqual(formData, _formData)) {
      message.warning('Your changes have been overwritten by new data from the server');
    }
    setHasUnsavedChanges(false);
    setFormData(_formData);
  }, [individual]);
  const handleValuesChange = (_: any, allValues: any) => {
    // TODO in the future, implement a more efficient check
    // Currently a deep comparison between two objects is performed on each keystroke, which can be inefficient.
    // Instead of comparing the full objects, only compare the fields that have been touched in the form
    // e.g. using https://github.com/ant-design/ant-design/issues/26222#issuecomment-716275420
    setHasUnsavedChanges(
      !isEqual(allValues, pick(individual, Object.keys(individualsMetadataFields)))
    );
    setFormData(allValues);
  };

  const _updateIndividual = async () => {
    // Pick just the keys and values from formData that were changed from the original data
    const updatedData = pickBy(formData, (value, key) => !isEqual(value, individual[key]));
    setIsSavingChanges(true);
    try {
      await updateIndividual(individual.id, updatedData);
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
      {/* Images display */}
      <div style={{display: "flex", flexWrap: "wrap", columnGap: 5, rowGap: 5}}>
        <Image.PreviewGroup>
          {
            individual.imageUrls.map(img => (
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
          individual.imageUrls.map(img => (
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
        fields={Object.entries(formData).map(([k, v]) => ({
          name: k,
          value: v,
        }))}
        onValuesChange={handleValuesChange}
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
        <Form.Item style={{float: 'right'}}>
          <Button type="primary" htmlType="submit"
            disabled={!hasUnsavedChanges}
            loading={isSavingChanges}
            onClick={() => _updateIndividual()}
          >
            Save changes
          </Button>
        </Form.Item>
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