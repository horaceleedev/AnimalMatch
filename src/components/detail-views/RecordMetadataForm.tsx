import { Button, DatePicker, Form, Input, InputNumber, Select, Tag } from "antd";
import type { DefaultOptionType, LabelInValueType } from "rc-select/lib/Select";
import TextArea from 'antd/es/input/TextArea';
import { RecordModel } from "pocketbase";

import useFormManager from "../../utils/useFormManager";
import { MetadataFieldsType, RecordType } from "../../types";
import { IndividualLinkButton, UserLabel, VideoLinkButton } from "../smart-components/LinkButtons";
import AnnotationStatusLabel from "../misc/AnnotationStatusLabel";
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
  aiPredictions?: {
    candidates: Array<{
      id: string;
      label: string;
      score: number;
      probability: number;
      thumbnailUrl?: string;
      bestMatchScore?: number;
      avgScore?: number;
    }>;
  };
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
  aiPredictions,
}: RecordMetadataFormProps<T>) => {
  const {
    formData,
    hasUnsavedChanges,
    isSavingChanges,
    handleValuesChange,
    saveChanges,
  } = useFormManager(processedRecord, metadataFields, updateFunction);

  // Build enhanced options for individual field with AI predictions
  const getOptionsForField = (fieldKey: string) => {
    const baseOptions = uniqueValuesPerField[fieldKey]?.map(val => ({ value: val, label: val })) || [];
    
    // Special handling for 'individual' field with AI predictions
    if (fieldKey === 'individual' && aiPredictions?.candidates && aiPredictions.candidates.length > 0) {
      const aiIds = new Set(aiPredictions.candidates.map(c => c.id));
      const aiOptions = aiPredictions.candidates.slice(0, 5).map(candidate => {
        // Show probability, and optionally best match score if available
        const probStr = `${(candidate.probability * 100).toFixed(1)}%`;
        const bestMatchInfo = candidate.bestMatchScore !== undefined 
          ? ` [best: ${candidate.bestMatchScore.toFixed(3)}]`
          : '';
        
        return {
          value: candidate.id,
          label: `${candidate.label} (${probStr}${bestMatchInfo})`,
        };
      });
      
      const dedupedBaseOptions = baseOptions.filter(opt => !aiIds.has(opt.value));
      return [
        ...aiOptions,
        { value: '---separator---', label: '────────────────', disabled: true },
        ...dedupedBaseOptions,
      ];
    }
    
    return baseOptions;
  };

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
            let size: 'small' | 'middle' | 'large' | undefined;
            let optionRender = undefined;
            let labelRender = (option: LabelInValueType) => (
              <Tag icon={showIconInSelectionFields ? value.icon : undefined}>
                {option.label}
              </Tag>
            );
            let customClassName = undefined;
            if (value.renderType === 'video_link') {
              size = 'large';
              labelRender = (option) => <VideoLinkButton id={option.value as string} linkTemplate={videoLinkTemplate} openModal={openModal} />;
            } else if (value.renderType === 'individual_link') {
              size = 'large';
              labelRender = (option) => <IndividualLinkButton id={option.value as string} linkTemplate={individualLinkTemplate} openModal={openModal} />;
            } else if (value.renderType === 'user_label') {
              size = 'large';
              labelRender = (option) => <UserLabel id={option.value as string} />;
              customClassName = "select-user"
            } else if (value.renderType === 'annotation_status_label') {
              optionRender = (option: DefaultOptionType) => <AnnotationStatusLabel status={option.value as string} />;
              labelRender = (option) => <AnnotationStatusLabel status={option.value as string} />;
            }

            inputElement = (
              <Select
                options={fieldValue === 'individual' ? getOptionsForField(fieldValue) : uniqueValuesPerField[fieldValue]?.map(val => ({ value: val, label: val })) || []}
                disabled={disabled}
                size={size}
                optionRender={optionRender}
                labelRender={labelRender}
                className={customClassName}
              />
            );
          } else if (value.valueEditorType === 'multiselect') {
            let customRender = undefined;
            if (value.renderType === 'user_label') {
              customRender = (option: DefaultOptionType | LabelInValueType) => <UserLabel id={option.value as string} />;
            }

            inputElement = (
              <Select
                mode="tags"
                options={uniqueValuesPerField[fieldValue].map(val => ({ value: val, label: val }))}
                disabled={disabled}
                optionRender={customRender}
                labelRender={customRender}
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
