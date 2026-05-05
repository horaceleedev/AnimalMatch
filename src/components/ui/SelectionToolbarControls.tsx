import { Space, Switch } from "antd";

import type { RecordSelectionUi } from "../../hooks/useRecordSelectionUi";
import { BatchEditPopup } from "./BatchEditPopup";
import { SelectAllControl } from "./SelectAllControl";

type SelectionToolbarControlsProps = {
  selectionUi: RecordSelectionUi;
  showBatchEdit: boolean;
  uniqueValuesPerField: Record<string, string[]>;
};

export const SelectionToolbarControls = ({
  selectionUi,
  showBatchEdit,
  uniqueValuesPerField,
}: SelectionToolbarControlsProps) => (
  <Space size="small">
    <Switch
      checked={selectionUi.selectionModeActive}
      onChange={selectionUi.toggleSelectionMode}
      checkedChildren="Exit"
      unCheckedChildren="Multi-select"
    />

    {selectionUi.selectionModeActive && (
      <SelectAllControl
        allSelected={selectionUi.allFilteredItemsSelected}
        someSelected={selectionUi.someFilteredItemsSelected}
        disabled={!selectionUi.hasFilteredItems}
        onToggle={selectionUi.setAllFilteredSelected}
      />
    )}

    {showBatchEdit && selectionUi.selectionModeActive && (
      <BatchEditPopup
        recordType={selectionUi.recordType}
        selectionMode={selectionUi.selectionModeActive}
        selectedItems={selectionUi.selectedItems}
        uniqueValuesPerField={uniqueValuesPerField}
      />
    )}
  </Space>
);
