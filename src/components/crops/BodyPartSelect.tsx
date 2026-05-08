import React, { useMemo } from 'react';
import { Select, Space } from 'antd';

import { getBodyPartOptions, isBodyPartOptionDisabled } from './bodyPartFilters';
export { ANY_BODY_PART } from './bodyPartFilters';

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
        value={selectedBodyPart}
        onChange={setSelectedBodyPart}
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
