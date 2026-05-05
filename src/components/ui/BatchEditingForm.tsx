import { PlusOutlined } from "@ant-design/icons";
import { AutoComplete, Button, Checkbox, Flex, Form, Input, Select, Typography } from "antd";
import { FC, useEffect, useMemo, useState } from "react";

import { useUsersStore } from "../../DataStores";
import {
  useSelectedCrops,
  useSelectedIndividuals,
  useSelectedVideos,
  useUpdateSelectedCrops,
  useUpdateSelectedIndividuals,
  useUpdateSelectedVideos,
} from "../../hooks/useSelectionStore";
import { getMultiselectValueCounts, getSharedStringArrayValue, getSharedStringValue, getSortedUniqueStrings } from "../../utils/utils";
import type { RecordType } from "../../types";
import AnnotationStatusLabel from "./AnnotationStatusLabel";
import { UserLabel } from "../smart-components/LinkButtons";

type BatchEditingFormProps = {
  recordType: RecordType;
  uniqueValuesPerField: Record<string, string[]>;
  onSubmit?: () => void;
};

type TagStatus = "checked" | "indeterminate" | "unchecked";
type TaggableRecord = { id: string; custom_tags: string[] };

type VideoBatchValues = {
  assignees?: string[];
  annotation_status?: string;
};

type IndividualBatchValues = {
  age?: string;
  sex?: string;
};

type CropBatchValues = {
  body_part?: string;
  side?: string;
};

const TagEditor = ({
  knownTags,
  getTagStatus,
  draftTag,
  setDraftTag,
  addTag,
  toggleTag,
}: {
  knownTags: string[];
  getTagStatus: (tag: string) => TagStatus;
  draftTag: string;
  setDraftTag: (value: string) => void;
  addTag: () => void;
  toggleTag: (tag: string) => void;
}) => (
  <Form.Item label="Custom tags">
    <Flex vertical gap={8}>
      <Flex gap={8}>
        <AutoComplete
          value={draftTag}
          onChange={setDraftTag}
          onSelect={setDraftTag}
          options={knownTags.map((tag) => ({ value: tag }))}
          style={{ minWidth: 240, flex: 1 }}
        >
          <Input
            placeholder="Add tag"
            onPressEnter={(event) => {
              event.preventDefault();
              addTag();
            }}
          />
        </AutoComplete>
        <Button
          type="default"
          icon={<PlusOutlined />}
          onClick={addTag}
          disabled={!draftTag.trim()}
        >
          Add tag
        </Button>
      </Flex>
      <div className="batch-edit-tags-list">
        {knownTags.map((tag) => {
          const status = getTagStatus(tag);
          return (
            <Checkbox
              key={tag}
              checked={status === "checked"}
              indeterminate={status === "indeterminate"}
              onChange={() => toggleTag(tag)}
            >
              {tag}
            </Checkbox>
          );
        })}
        {knownTags.length === 0 && (
          <Typography.Text type="secondary">No tags available yet</Typography.Text>
        )}
      </div>
    </Flex>
  </Form.Item>
);

const useBatchTagState = (
  selectedRecords: TaggableRecord[],
  existingTags: string[],
  resetSignal: string,
) => {
  const [pendingTagAdds, setPendingTagAdds] = useState<Set<string>>(new Set<string>());
  const [pendingTagRemovals, setPendingTagRemovals] = useState<Set<string>>(new Set<string>());
  const [draftTag, setDraftTag] = useState("");

  useEffect(() => {
    setPendingTagAdds(new Set<string>());
    setPendingTagRemovals(new Set<string>());
    setDraftTag("");
  }, [resetSignal]);

  const selectedTagCounts = useMemo(
    () => getMultiselectValueCounts(selectedRecords, "custom_tags"),
    [selectedRecords],
  );
  const knownTags = useMemo(
    () => getSortedUniqueStrings([
      ...existingTags,
      ...selectedRecords.flatMap((record) => record.custom_tags),
      ...Array.from(pendingTagAdds),
      ...Array.from(pendingTagRemovals),
    ]),
    [existingTags, pendingTagAdds, pendingTagRemovals, selectedRecords],
  );

  const getTagStatus = (tag: string): TagStatus => {
    if (pendingTagAdds.has(tag)) {
      return "checked";
    }
    if (pendingTagRemovals.has(tag)) {
      return "unchecked";
    }

    const count = selectedTagCounts[tag] ?? 0;
    if (count === 0) {
      return "unchecked";
    }
    if (count === selectedRecords.length) {
      return "checked";
    }
    return "indeterminate";
  };

  const toggleTag = (tag: string) => {
    const nextAdds = new Set(pendingTagAdds);
    const nextRemovals = new Set(pendingTagRemovals);
    const currentStatus = getTagStatus(tag);

    if (currentStatus === "checked") {
      nextAdds.delete(tag);
      nextRemovals.add(tag);
    } else {
      nextRemovals.delete(tag);
      nextAdds.add(tag);
    }

    setPendingTagAdds(nextAdds);
    setPendingTagRemovals(nextRemovals);
  };

  const addTag = () => {
    const normalizedTag = draftTag.trim();
    if (!normalizedTag) {
      return;
    }

    setPendingTagAdds((prev) => {
      const next = new Set(prev);
      next.add(normalizedTag);
      return next;
    });
    setPendingTagRemovals((prev) => {
      const next = new Set(prev);
      next.delete(normalizedTag);
      return next;
    });
    setDraftTag("");
  };

  return {
    draftTag,
    setDraftTag,
    knownTags,
    getTagStatus,
    toggleTag,
    addTag,
    pendingTagAdds,
    pendingTagRemovals,
  };
};

const VideosBatchEditingForm: FC<Omit<BatchEditingFormProps, "recordType">> = ({
  uniqueValuesPerField,
  onSubmit,
}) => {
  const [form] = Form.useForm<VideoBatchValues>();
  const [assigneesTouched, setAssigneesTouched] = useState(false);
  const [annotationStatusTouched, setAnnotationStatusTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedVideos = useSelectedVideos();
  const users = useUsersStore((state) => state.processedRecords);
  const updateSelectedVideos = useUpdateSelectedVideos();
  const selectionSignature = useMemo(
    () => selectedVideos.map((video) => video.id).sort().join("|"),
    [selectedVideos],
  );
  const sharedAssigneeState = useMemo(
    () => getSharedStringArrayValue(selectedVideos.map((video) => video.assignees)),
    [selectedVideos],
  );
  const sharedAnnotationStatusState = useMemo(
    () => getSharedStringValue(selectedVideos.map((video) => video.annotation_status)),
    [selectedVideos],
  );
  const tagState = useBatchTagState(
    selectedVideos,
    uniqueValuesPerField.custom_tags ?? [],
    selectionSignature,
  );
  const assigneeOptions = useMemo(
    () =>
      users.map((user) => ({
        value: user.id,
        label: user.name,
      })),
    [users],
  );

  useEffect(() => {
    setAssigneesTouched(false);
    setAnnotationStatusTouched(false);
    form.resetFields();
    form.setFieldsValue({
      assignees: sharedAssigneeState.value,
      annotation_status: sharedAnnotationStatusState.value,
    });
  }, [form, selectionSignature, sharedAnnotationStatusState.value, sharedAssigneeState.value]);

  const onFinish = async (values: VideoBatchValues) => {
    const updatedFields: Partial<{
      assignees: string[];
      annotation_status: string;
      custom_tags: { add: string[]; remove: string[] };
    }> = {};

    if (assigneesTouched) {
      updatedFields.assignees = values.assignees ?? [];
    }
    if (annotationStatusTouched) {
      updatedFields.annotation_status = values.annotation_status;
    }
    if (tagState.pendingTagAdds.size > 0 || tagState.pendingTagRemovals.size > 0) {
      updatedFields.custom_tags = {
        add: Array.from(tagState.pendingTagAdds),
        remove: Array.from(tagState.pendingTagRemovals),
      };
    }

    if (Object.keys(updatedFields).length === 0) {
      onSubmit?.();
      return;
    }

    setIsSubmitting(true);
    try {
      await updateSelectedVideos(updatedFields);
      onSubmit?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      form={form}
      size="middle"
      className="batch-edit-form"
      onFinish={onFinish}
      layout="vertical"
    >
      <TagEditor {...tagState} />
      <Form.Item label="Assignees" name="assignees">
        <Select
          mode="multiple"
          placeholder={
            sharedAssigneeState.isMixed && !assigneesTouched ? "Mixed" : undefined
          }
          showSearch
          optionFilterProp="label"
          options={assigneeOptions}
          onChange={() => setAssigneesTouched(true)}
          optionRender={(option) => <UserLabel id={option.value as string} />}
          labelRender={(option) => <UserLabel id={option.value as string} />}
          popupMatchSelectWidth={false}
        />
      </Form.Item>
      <Form.Item label="Annotation status" name="annotation_status">
        <Select
          allowClear
          placeholder={
            sharedAnnotationStatusState.isMixed && !annotationStatusTouched
              ? "Mixed"
              : undefined
          }
          options={(uniqueValuesPerField.annotation_status ?? []).map((val) => ({
            value: val,
            label: val,
          }))}
          onChange={() => setAnnotationStatusTouched(true)}
          optionRender={(option) => (
            <AnnotationStatusLabel status={option.value as string} />
          )}
          labelRender={(option) => (
            <AnnotationStatusLabel status={option.value as string} />
          )}
          popupMatchSelectWidth={false}
        />
      </Form.Item>
      <Form.Item style={{ alignSelf: "flex-end", marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" loading={isSubmitting}>
          Save changes
        </Button>
      </Form.Item>
    </Form>
  );
};

const IndividualsBatchEditingForm: FC<Omit<BatchEditingFormProps, "recordType">> = ({
  uniqueValuesPerField,
  onSubmit,
}) => {
  const [form] = Form.useForm<IndividualBatchValues>();
  const [ageTouched, setAgeTouched] = useState(false);
  const [sexTouched, setSexTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedIndividuals = useSelectedIndividuals();
  const updateSelectedIndividuals = useUpdateSelectedIndividuals();
  const selectionSignature = useMemo(
    () => selectedIndividuals.map((individual) => individual.id).sort().join("|"),
    [selectedIndividuals],
  );
  const ages = useMemo(
    () => getSortedUniqueStrings(selectedIndividuals.map((individual) => individual.age)),
    [selectedIndividuals],
  );
  const sexes = useMemo(
    () => getSortedUniqueStrings(selectedIndividuals.map((individual) => individual.sex)),
    [selectedIndividuals],
  );
  const tagState = useBatchTagState(
    selectedIndividuals,
    uniqueValuesPerField.custom_tags ?? [],
    selectionSignature,
  );

  useEffect(() => {
    setAgeTouched(false);
    setSexTouched(false);
    form.resetFields();
    form.setFieldsValue({
      age: ages.length === 1 ? ages[0] : undefined,
      sex: sexes.length === 1 ? sexes[0] : undefined,
    });
  }, [ages, form, selectionSignature, sexes]);

  const onFinish = async (values: IndividualBatchValues) => {
    const updatedFields: Partial<{
      age: string;
      sex: string;
      custom_tags: { add: string[]; remove: string[] };
    }> = {};

    if (ageTouched) {
      updatedFields.age = values.age;
    }
    if (sexTouched) {
      updatedFields.sex = values.sex;
    }
    if (tagState.pendingTagAdds.size > 0 || tagState.pendingTagRemovals.size > 0) {
      updatedFields.custom_tags = {
        add: Array.from(tagState.pendingTagAdds),
        remove: Array.from(tagState.pendingTagRemovals),
      };
    }

    if (Object.keys(updatedFields).length === 0) {
      onSubmit?.();
      return;
    }

    setIsSubmitting(true);
    try {
      await updateSelectedIndividuals(updatedFields);
      onSubmit?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      form={form}
      size="middle"
      className="batch-edit-form"
      onFinish={onFinish}
      layout="vertical"
    >
      <TagEditor {...tagState} />
      <Form.Item label="Age" name="age">
        <Select
          allowClear
          onChange={() => setAgeTouched(true)}
          options={(uniqueValuesPerField.age ?? []).map((val) => ({
            value: val,
            label: val,
          }))}
          popupMatchSelectWidth={false}
        />
      </Form.Item>
      <Form.Item label="Sex" name="sex">
        <Select
          allowClear
          onChange={() => setSexTouched(true)}
          options={(uniqueValuesPerField.sex ?? []).map((val) => ({
            value: val,
            label: val,
          }))}
          popupMatchSelectWidth={false}
        />
      </Form.Item>
      <Form.Item style={{ alignSelf: "flex-end", marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" loading={isSubmitting}>
          Save changes
        </Button>
      </Form.Item>
    </Form>
  );
};

const CropsBatchEditingForm: FC<Omit<BatchEditingFormProps, "recordType">> = ({
  uniqueValuesPerField,
  onSubmit,
}) => {
  const [form] = Form.useForm<CropBatchValues>();
  const [bodyPartTouched, setBodyPartTouched] = useState(false);
  const [sideTouched, setSideTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedCrops = useSelectedCrops();
  const updateSelectedCrops = useUpdateSelectedCrops();
  const selectionSignature = useMemo(
    () => selectedCrops.map((crop) => crop.id).sort().join("|"),
    [selectedCrops],
  );
  const bodyParts = useMemo(
    () => getSortedUniqueStrings(selectedCrops.map((crop) => crop.body_part)),
    [selectedCrops],
  );
  const sides = useMemo(
    () => getSortedUniqueStrings(selectedCrops.map((crop) => crop.side)),
    [selectedCrops],
  );
  const tagState = useBatchTagState(
    selectedCrops,
    uniqueValuesPerField.custom_tags ?? [],
    selectionSignature,
  );

  useEffect(() => {
    setBodyPartTouched(false);
    setSideTouched(false);
    form.resetFields();
    form.setFieldsValue({
      body_part: bodyParts.length === 1 ? bodyParts[0] : undefined,
      side: sides.length === 1 ? sides[0] : undefined,
    });
  }, [bodyParts, form, selectionSignature, sides]);

  const onFinish = async (values: CropBatchValues) => {
    const updatedFields: Partial<{
      body_part: string;
      side: string;
      custom_tags: { add: string[]; remove: string[] };
    }> = {};

    if (bodyPartTouched) {
      updatedFields.body_part = values.body_part;
    }
    if (sideTouched) {
      updatedFields.side = values.side;
    }
    if (tagState.pendingTagAdds.size > 0 || tagState.pendingTagRemovals.size > 0) {
      updatedFields.custom_tags = {
        add: Array.from(tagState.pendingTagAdds),
        remove: Array.from(tagState.pendingTagRemovals),
      };
    }

    if (Object.keys(updatedFields).length === 0) {
      onSubmit?.();
      return;
    }

    setIsSubmitting(true);
    try {
      await updateSelectedCrops(updatedFields);
      onSubmit?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      form={form}
      size="middle"
      className="batch-edit-form"
      onFinish={onFinish}
      layout="vertical"
    >
      <TagEditor {...tagState} />
      <Form.Item label="Body part" name="body_part">
        <Select
          allowClear
          onChange={() => setBodyPartTouched(true)}
          options={(uniqueValuesPerField.body_part ?? []).map((val) => ({
            value: val,
            label: val,
          }))}
          popupMatchSelectWidth={false}
        />
      </Form.Item>
      <Form.Item label="Side" name="side">
        <Select
          allowClear
          onChange={() => setSideTouched(true)}
          options={(uniqueValuesPerField.side ?? []).map((val) => ({
            value: val,
            label: val,
          }))}
          popupMatchSelectWidth={false}
        />
      </Form.Item>
      <Form.Item style={{ alignSelf: "flex-end", marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" loading={isSubmitting}>
          Save changes
        </Button>
      </Form.Item>
    </Form>
  );
};

export const BatchEditingForm: FC<BatchEditingFormProps> = ({
  recordType,
  uniqueValuesPerField,
  onSubmit,
}) => {
  if (recordType === "video") {
    return (
      <VideosBatchEditingForm
        uniqueValuesPerField={uniqueValuesPerField}
        onSubmit={onSubmit}
      />
    );
  }

  if (recordType === "individual") {
    return (
      <IndividualsBatchEditingForm
        uniqueValuesPerField={uniqueValuesPerField}
        onSubmit={onSubmit}
      />
    );
  }

  return (
    <CropsBatchEditingForm
      uniqueValuesPerField={uniqueValuesPerField}
      onSubmit={onSubmit}
    />
  );
};
