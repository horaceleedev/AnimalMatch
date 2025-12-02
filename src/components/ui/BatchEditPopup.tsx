import { EditOutlined } from "@ant-design/icons"
import { Popover, Button } from "antd"
import { useState } from "react";

import { BatchEditingForm } from "./BatchEditingForm"

export function BatchEditPopup({
    selectionMode,
    selectedItems,
    uniqueValuesPerField,
}: {
    selectionMode: boolean;
    selectedItems: Set<string>;
    uniqueValuesPerField: Record<string, string[]>;
}) {
    const [open, setOpen] = useState(false);
    const disabled = !selectionMode || selectedItems.size === 0;
    function onSubmit() {
        setOpen(false);
    }
    function onOpenChange(newOpen: boolean) {
        setOpen(newOpen);
    }
    return (
      <Popover
        content={<BatchEditingForm uniqueValuesPerField={uniqueValuesPerField} onSubmit={onSubmit} />}
        trigger="click"
        arrow={false}
        placement="bottomLeft"
        open={!disabled && open}
        onOpenChange={onOpenChange}
      >
        <Button
          type="text"
          icon={<EditOutlined />}
          disabled={disabled}
        >
          Batch edit
        </Button>
      </Popover>

    )
}