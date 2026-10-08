import { AutoComplete, Button, Form, Input, InputNumber, Radio, Select, Tag } from "antd";
import type { DefaultOptionType, LabelInValueType } from "rc-select/lib/Select";
import TextArea from 'antd/es/input/TextArea';
import { RecordModel } from "pocketbase";

import useFormManager from "../../hooks/useFormManager";
import { MetadataFieldsType, RecordType } from "../../types";
import { IndividualLinkButton, UserLabel, VideoLinkButton } from "../smart-components/LinkButtons";
import AnnotationStatusLabel from "../ui/AnnotationStatusLabel";
import "./RecordMetadataForm.scss";

type RecordMetadataFormProps<T extends RecordModel> = {
  processedRecord: T;
  metadataFields: MetadataFieldsType;
  uniqueValuesPerField: Record<string, string[]>;
  updateFunction: (id: string, data: Partial<T>) => Promise<T>;
  showIconInSelectionFields?: boolean;
  videoLinkTemplate?: string;
  individualLinkTemplate?: string;
  openModal?: (type: RecordType, id: string) => void;
}

const RecordMetadataForm = <T extends RecordModel>({
  processedRecord,
  metadataFields,
  uniqueValuesPerField,
  updateFunction,
  showIconInSelectionFields,
  videoLinkTemplate,
  individualLinkTemplate,
  openModal,
}: RecordMetadataFormProps<T>) => {
  const {
    formData,
    hasUnsavedChanges,
    isSavingChanges,
    handleValuesChange,
    saveChanges,
  } = useFormManager(processedRecord, metadataFields, updateFunction);

  return (
    <Form
      className="record-metadata-form"
      labelCol={{ span: 5 }}
      wrapperCol={{ span: 19 }}
      labelWrap
      layout="horizontal"
      fields={Object.entries(formData).map(([k, v]) => ({
        name: k,
        value: v,
      }))}
      onValuesChange={handleValuesChange}
    >
      {
        Object.entries(metadataFields).map(([fieldName, metadataField]) => {
          let inputElement = <></>;
          const disabled = metadataField.isInternal || metadataField.isUneditable;
          if (metadataField.type === 'rich_text') {
            inputElement = <TextArea autoSize={{ minRows: 3, maxRows: 6 }} />
          } else if (metadataField.inputType === 'text') {
            inputElement = <Input disabled={disabled} />;
          } else if (metadataField.valueEditorType === 'select') {
            // If allowAddingNewOptions is true, use AutoComplete which allows users
            // to add new options in addition to selecting from existing options.
            // Otherwise, use Select.
            if (metadataField.allowAddingNewOptions) {
              inputElement = (
                <AutoComplete
                  options={
                    uniqueValuesPerField[fieldName]
                      .filter(v => !!v) // filter out empty strings; TODO move this filtering inside getUniqueValuesPerField?
                      .map(val => ({ value: val, label: val }))
                    }
                  filterOption
                  disabled={disabled}
                />
              );
            } else {
              let size: 'small' | 'middle' | 'large' | undefined;
              let optionRender = undefined;
              let labelRender = (option: LabelInValueType) => (
                <Tag icon={showIconInSelectionFields ? metadataField.icon : undefined}>
                  {option.label}
                </Tag>
              );
              let customClassName = undefined;
              if (metadataField.renderType === 'video_link') {
                size = 'large';
                labelRender = (option) => <VideoLinkButton id={option.value as string} linkTemplate={videoLinkTemplate} openModal={openModal} />;
              } else if (metadataField.renderType === 'individual_link') {
                size = 'large';
                labelRender = (option) => <IndividualLinkButton id={option.value as string} linkTemplate={individualLinkTemplate} openModal={openModal} />;
              } else if (metadataField.renderType === 'user_label') {
                size = 'large';
                labelRender = (option) => <UserLabel id={option.value as string} />;
                customClassName = "select-user"
              } else if (metadataField.renderType === 'annotation_status_label') {
                optionRender = (option: DefaultOptionType) => <AnnotationStatusLabel status={option.value as string} />;
                labelRender = (option) => <AnnotationStatusLabel status={option.value as string} />;
              }

              inputElement = (
                <Select
                  options={uniqueValuesPerField[fieldName].map(val => ({ value: val, label: val }))}
                  disabled={disabled}
                  size={size}
                  optionRender={optionRender}
                  labelRender={labelRender}
                  className={customClassName}
                />
              );
            }
          } else if (metadataField.valueEditorType === 'multiselect') {
            let customRender = undefined;
            if (metadataField.renderType === 'user_label') {
              customRender = (option: DefaultOptionType | LabelInValueType) => <UserLabel id={option.value as string} />;
            }

            inputElement = (
              <Select
                mode="tags"
                options={uniqueValuesPerField[fieldName].map(val => ({ value: val, label: val }))}
                disabled={disabled}
                optionRender={customRender}
                labelRender={customRender}
              />
            );
          } else if (metadataField.valueEditorType === 'radio') {
            if (metadataField.type === 'boolean') {
              inputElement = (
                <Radio.Group disabled={disabled} options={[
                  { value: true, label: metadataField.displayBooleanValuesAs ? metadataField.displayBooleanValuesAs[1] : 'True' },
                  { value: false, label: metadataField.displayBooleanValuesAs ? metadataField.displayBooleanValuesAs[0] : 'False' },
                ]} />
              );
            }
          } else if (metadataField.inputType === 'date') {
            // inputElement = <DatePicker showTime needConfirm={false} disabled={disabled} />;
            // Temporary hack TODO fix issue with DatePicker above
            inputElement = <Input disabled={disabled} />;
          } else if (metadataField.inputType === 'number') {
            inputElement = <InputNumber disabled={disabled} />;
          }
          return (
            <Form.Item key={fieldName} label={metadataField.displayName} name={fieldName}>
              {inputElement}
            </Form.Item>
          );
        })
      }
      <Form.Item style={{alignSelf: 'flex-end'}}>
        <Button type="primary" htmlType="submit"
          disabled={!hasUnsavedChanges}
          loading={isSavingChanges}
          onClick={() => saveChanges()}
        >
          Save changes
        </Button>
      </Form.Item>
    </Form>
  )
};

export default RecordMetadataForm;
