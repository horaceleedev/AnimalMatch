import { useCallback, useEffect, useMemo } from "react";

import { useSelectionStore } from "./useSelectionStore";
import type { RecordType } from "../types";

export type RecordSelectionUi = {
  recordType: RecordType;
  selectionModeActive: boolean;
  selectedItems: Set<string>;
  allFilteredItemsSelected: boolean;
  someFilteredItemsSelected: boolean;
  hasFilteredItems: boolean;
  toggleSelectionMode: () => void;
  toggleItemSelection: (itemId: string) => void;
  setAllFilteredSelected: (checked: boolean) => void;
};

export const useRecordSelectionUi = (
  recordType: RecordType,
  filteredItemIds: string[],
): RecordSelectionUi => {
  const {
    addSelections,
    pruneSelection,
    removeSelections,
    selectedItems,
    selectedRecordType,
    selectionMode,
    setSelectionMode,
    toggleItemSelection,
  } = useSelectionStore();

  const selectionModeActive = selectionMode && selectedRecordType === recordType;

  useEffect(() => {
    if (!selectionModeActive) {
      return;
    }
    pruneSelection(filteredItemIds);
  }, [filteredItemIds, pruneSelection, selectionModeActive]);

  const numSelectedInFilteredSet = useMemo(
    () => filteredItemIds.filter((itemId) => selectedItems.has(itemId)).length,
    [filteredItemIds, selectedItems],
  );

  const allFilteredItemsSelected =
    filteredItemIds.length > 0 &&
    numSelectedInFilteredSet === filteredItemIds.length;
  const someFilteredItemsSelected =
    numSelectedInFilteredSet > 0 && !allFilteredItemsSelected;

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(!selectionModeActive, recordType);
  }, [recordType, selectionModeActive, setSelectionMode]);

  const setAllFilteredSelected = useCallback((checked: boolean) => {
    if (checked) {
      addSelections(filteredItemIds);
    } else {
      removeSelections(filteredItemIds);
    }
  }, [addSelections, filteredItemIds, removeSelections]);

  return {
    recordType,
    selectionModeActive,
    selectedItems,
    allFilteredItemsSelected,
    someFilteredItemsSelected,
    hasFilteredItems: filteredItemIds.length > 0,
    toggleSelectionMode,
    toggleItemSelection,
    setAllFilteredSelected,
  };
};
