import { Button, DatePicker, Form, Input, InputNumber, Select, Tag } from "antd";
import TextArea from 'antd/es/input/TextArea';
import { RecordModel } from "pocketbase";

import useFormManager from "../utils/useFormManager";
import { MetadataFieldsType } from "../types";
import "./RecordMetadataForm.scss";

type RecordMetadataFormProps<T extends RecordModel> = {
  processedRecord: T;
  metadataFields: MetadataFieldsType;
  uniqueValuesPerField: Record<string, string[]>;
  updateFunction: (id: string, data: Partial<T>) => Promise<void>;
  showIconInSelectionFields?: boolean;
}

const RecordMetadataForm = <T extends RecordModel>({
  processedRecord,
  metadataFields,
  uniqueValuesPerField,
  updateFunction,
  showIconInSelectionFields,
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
        Object.entries(metadataFields).map(([fieldValue, value]) => {
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
                  <Tag icon={showIconInSelectionFields ? value.icon : undefined}>
                    {option.label}
                  </Tag>
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
            // inputElement = <DatePicker showTime needConfirm={false} disabled={disabled} />;
            // Temporary hack TODO fix issue with DatePicker above
            inputElement = <Input disabled={disabled} />;
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