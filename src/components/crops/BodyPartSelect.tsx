import React, { useMemo } from 'react';
import { Select, Space } from 'antd';

import { ANY_BODY_PART, getBodyPartOptions, isBodyPartOptionDisabled } from './bodyPartFilters';

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
  const options = useMemo(() => getBodyPartOptions(bodyPartOptions), [bodyPartOptions]);

  return (
    <Space>
      <span>{label}</span>
      <Select
        variant="borderless"
        popupMatchSelectWidth={false}
        value={selectedBodyPart || ANY_BODY_PART}
        onChange={(value) => setSelectedBodyPart(value === ANY_BODY_PART ? '' : value)}
        options={
          options.map(bodyPart => ({
            value: bodyPart,
            label: bodyPart,
            disabled: isBodyPartOptionDisabled(bodyPart, availableBodyParts),
          }))
        }
      />
    </Space>
  );
};

export default BodyPartSelect;
