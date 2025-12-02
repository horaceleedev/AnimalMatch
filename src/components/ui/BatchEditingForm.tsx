import { Button, Form, Select } from "antd";
import { FC } from "react";

import {
  useUpdateSelectedVideos,
  useSelectedAnnotationStatuses,
  useSelectedAssignees,
  useSelectedCustomTags,
} from "../../hooks/useSelectionStore";
import AnnotationStatusLabel from "./AnnotationStatusLabel";
import { UserLabel } from "../smart-components/LinkButtons";

type BatchEditingFormProps = {
  uniqueValuesPerField: Record<string, string[]>;
  onSubmit?: () => void;
};

export const BatchEditingForm: FC<BatchEditingFormProps> = ({
  uniqueValuesPerField,
  onSubmit,
}) => {
  const selectedCustomTags = useSelectedCustomTags();
  const selectedAssignees = useSelectedAssignees();
  const selectedAnnotationStatuses = useSelectedAnnotationStatuses();
  let selectedAnnotationStatus: string | undefined = undefined;
  if (selectedAnnotationStatuses.size === 1) {
    selectedAnnotationStatus = selectedAnnotationStatuses.values().next().value;
  }
  const updateSelectedVideos = useUpdateSelectedVideos();

  function onFinish(values: Partial<{
    custom_tags: string[];
    assignees: string[];
    annotation_status: string;
  }>) {
    updateSelectedVideos(values);
    if (onSubmit) {
      onSubmit();
    }
  }

  return (
    <Form
      key={selectedAnnotationStatus}
      size="middle"
      className="batch-edit-form"
      onFinish={onFinish}
    >
      <Form.Item
        label="Custom tag"
        name="custom_tags"
        initialValue={Array.from(selectedCustomTags)}
      >
        <Select
          mode="tags"
          options={uniqueValuesPerField["custom_tags"].map((val) => ({
            value: val,
            label: val,
          }))}
          popupMatchSelectWidth={false}
        />
      </Form.Item>
      <Form.Item
        label="Assignees"
        name="assignees"
        initialValue={Array.from(selectedAssignees)}
      >
        <Select
          mode="tags"
          options={uniqueValuesPerField["assignees"].map((val) => ({
            value: val,
            label: val,
          }))}
          optionRender={(option) => <UserLabel id={option.value as string} />}
          labelRender={(option) => <UserLabel id={option.value as string} />}
          popupMatchSelectWidth={false}
        />
      </Form.Item>
      <Form.Item
        label="Annotation status"
        name="annotation_status"
        initialValue={selectedAnnotationStatus}
      >
        <Select
          options={uniqueValuesPerField["annotation_status"].map((val) => ({
            value: val,
            label: val,
          }))}
          optionRender={(option) => (
            <AnnotationStatusLabel status={option.value as string} />
          )}
          labelRender={(option) => (
            <AnnotationStatusLabel status={option.value as string} />
          )}
          popupMatchSelectWidth={false}
        />
      </Form.Item>
      <Form.Item style={{ alignSelf: "flex-end" }}>
        <Button type="primary" htmlType="submit">
          Save changes
        </Button>
      </Form.Item>
    </Form>
  );
};
