import { Checkbox } from "antd";

type SelectAllControlProps = {
  allSelected: boolean;
  someSelected: boolean;
  disabled: boolean;
  onToggle: (checked: boolean) => void;
};

export const SelectAllControl = ({
  allSelected,
  someSelected,
  disabled,
  onToggle,
}: SelectAllControlProps) => (
  <Checkbox
    checked={allSelected}
    indeterminate={someSelected}
    disabled={disabled}
    onChange={(event) => onToggle(event.target.checked)}
  >
    Select all
  </Checkbox>
);
