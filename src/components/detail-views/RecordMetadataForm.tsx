import { Button, DatePicker, Form, Input, InputNumber, Select, Space, Tag } from "antd";
import type { DefaultOptionType, LabelInValueType } from "rc-select/lib/Select";
import TextArea from 'antd/es/input/TextArea';
import { RecordModel } from "pocketbase";

import useFormManager from "../../utils/useFormManager";
import { MetadataFieldsType, RecordType } from "../../types";
import { IndividualLinkButton, UserLabel, VideoLinkButton } from "../smart-components/LinkButtons";
import AnnotationStatusLabel from "../ui/AnnotationStatusLabel";
import IndividualSelectOption from "../similarity/IndividualSelectOption";
import { useIndividualsStoreWithCrops } from "../../DataStores";
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
  const { individuals } = useIndividualsStoreWithCrops();
  const {
    formData,
    hasUnsavedChanges,
    isSavingChanges,
    handleValuesChange,
    saveChanges,
  } = useFormManager(processedRecord, metadataFields, updateFunction);

  const getIndividualThumbnail = (individualId: string) => {
    const individual = individuals.find(indiv => indiv.id === individualId);
    if (!individual) return undefined;
    const faceCrop = individual.crops.find(crop => crop.body_part === 'face' && crop.imageUrl);
    return (faceCrop ?? individual.crops.find(crop => crop.imageUrl))?.imageUrl;
  };

  // Build enhanced options for individual field with AI predictions
  const getOptionsForField = (fieldKey: string) => {
    const baseOptions = uniqueValuesPerField[fieldKey]?.map(val => ({
      value: val,
      label: val,
      thumbnailUrl: fieldKey === 'individual' ? getIndividualThumbnail(val) : undefined,
    })) || [];
    
    // Special handling for 'individual' field with AI predictions
    if (fieldKey === 'individual' && aiPredictions?.candidates && aiPredictions.candidates.length > 0) {
      const aiById = new Map(aiPredictions.candidates.map(candidate => [candidate.id, candidate]));
      const withAi = baseOptions.map(option => {
        const candidate = aiById.get(option.value);
        const score =
          candidate?.bestMatchScore ??
          candidate?.avgScore ??
          candidate?.score ??
          candidate?.probability ??
          null;

        return {
          value: option.value,
          label: candidate?.label ?? option.label,
          ai: Boolean(candidate),
          score,
          thumbnailUrl: candidate?.thumbnailUrl ?? option.thumbnailUrl,
        };
      });

      const missingAiOptions = aiPredictions.candidates
        .filter(candidate => !baseOptions.some(opt => opt.value === candidate.id))
        .map(candidate => ({
          value: candidate.id,
          label: candidate.label,
          ai: true,
          score:
            candidate.bestMatchScore ??
            candidate.avgScore ??
            candidate.score ??
            candidate.probability ??
            null,
          thumbnailUrl: candidate.thumbnailUrl ?? getIndividualThumbnail(candidate.id),
        }));

      return [...withAi, ...missingAiOptions].sort((a: any, b: any) => {
        const aScore = typeof a.score === 'number' ? a.score : -Infinity;
        const bScore = typeof b.score === 'number' ? b.score : -Infinity;
        if (aScore !== bScore) return bScore - aScore;
        return String(a.label).localeCompare(String(b.label));
      });
    }
    
    return baseOptions;
  };

  const renderIndividualOption = (option: DefaultOptionType) => {
    const data = option.data as any;
    return (
      <IndividualSelectOption
        label={data?.label ?? String(option.label ?? '')}
        score={data?.score}
        thumbnailUrl={data?.thumbnailUrl}
      />
    );
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
            if (fieldValue === 'individual') {
              optionRender = renderIndividualOption;
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
