import React, { useMemo } from 'react';
import { Select, Space } from 'antd';

export const ANY_BODY_PART = "any body part";

type BodyPartSelectProps = {
  bodyPartOptions: string[];
  selectedBodyPart: string;
  setSelectedBodyPart: (bodyPart: string) => void;
  availableBodyParts?: Set<string>;
  label?: string;
};

const BodyPartSelect: React.FC<BodyPartSelectProps> = ({
  bodyPartOptions,
  selectedBodyPart,
  setSelectedBodyPart,
  availableBodyParts,
  label = "Show crops of:",
}: BodyPartSelectProps) => {
  const options = useMemo(() => {
    const uniqueBodyParts = Array.from(new Set(bodyPartOptions.filter(Boolean)));
    return [ANY_BODY_PART, ...uniqueBodyParts.filter(bodyPart => bodyPart !== ANY_BODY_PART)];
  }, [bodyPartOptions]);

  return (
    <Space>
      <span>{label}</span>
      <Select
        variant="borderless"
        popupMatchSelectWidth={false}
        value={selectedBodyPart}
        onChange={setSelectedBodyPart}
        options={
          options.map(bodyPart => ({
            value: bodyPart,
            label: bodyPart,
            disabled: Boolean(availableBodyParts && bodyPart !== ANY_BODY_PART && !availableBodyParts.has(bodyPart)),
          }))
        }
      />
    </Space>
  );
};

export default BodyPartSelect;
