import { create } from "zustand";
import {
  useCropsStore,
  useIndividualsStore,
  useVideosStoreWithUsers,
  useVideoStore,
} from "../DataStores";
import { useCallback, useMemo } from "react";
import { getSortedUniqueStrings } from "../utils/utils";
import type { Crop, Individual, RecordType, Video } from "../types";

type State = {
  selectionMode: boolean;
  selectedRecordType?: RecordType;
  selectedItems: Set<string>;
};

type Actions = {
  setSelectionMode: (selectionMode: boolean, recordType: RecordType) => void;
  addSelection: (itemId: string) => void;
  addSelections: (itemIds: string[]) => void;
  removeSelection: (itemId: string) => void;
  removeSelections: (itemIds: string[]) => void;
  toggleItemSelection: (itemId: string) => void;
  pruneSelection: (itemIds: string[]) => void;
  clearSelection: () => void;
};

export const useSelectionStore = create<State & Actions>((set) => ({
  selectionMode: false,
  selectedRecordType: undefined,
  selectedItems: new Set<string>(),

  setSelectionMode: (selectionMode, recordType) =>
    set((state) => {
      if (!selectionMode) {
        return {
          selectionMode: false,
          selectedRecordType: undefined,
          selectedItems: new Set<string>(),
        };
      }

      if (state.selectedRecordType && state.selectedRecordType !== recordType) {
        return {
          selectionMode: true,
          selectedRecordType: recordType,
          selectedItems: new Set<string>(),
        };
      }

      return {
        selectionMode: true,
        selectedRecordType: recordType,
      };
    }),

  addSelection: (itemId: string) =>
    set(({ selectedItems }) => {
      const nextSelectedItems = new Set(selectedItems);
      nextSelectedItems.add(itemId);
      return { selectedItems: nextSelectedItems };
    }),

  addSelections: (itemIds: string[]) =>
    set(({ selectedItems }) => {
      const nextSelectedItems = new Set(selectedItems);
      itemIds.forEach((itemId) => nextSelectedItems.add(itemId));
      return { selectedItems: nextSelectedItems };
    }),

  removeSelection: (itemId: string) =>
    set(({ selectedItems }) => {
      const nextSelectedItems = new Set(selectedItems);
      nextSelectedItems.delete(itemId);
      return { selectedItems: nextSelectedItems };
    }),

  removeSelections: (itemIds: string[]) =>
    set(({ selectedItems }) => {
      const nextSelectedItems = new Set(selectedItems);
      itemIds.forEach((itemId) => nextSelectedItems.delete(itemId));
      return { selectedItems: nextSelectedItems };
    }),

  toggleItemSelection: (itemId: string) =>
    set(({ selectedItems }) => {
      const nextSelectedItems = new Set(selectedItems);
      if (nextSelectedItems.has(itemId)) {
        nextSelectedItems.delete(itemId);
      } else {
        nextSelectedItems.add(itemId);
      }
      return { selectedItems: nextSelectedItems };
    }),

  pruneSelection: (itemIds: string[]) =>
    set(({ selectedItems }) => {
      const allowedItems = new Set(itemIds);
      const nextSelectedItems = new Set(
        Array.from(selectedItems).filter((itemId) => allowedItems.has(itemId)),
      );

      if (nextSelectedItems.size === selectedItems.size) {
        let isDifferent = false;
        for (const itemId of nextSelectedItems) {
          if (!selectedItems.has(itemId)) {
            isDifferent = true;
            break;
          }
        }
        if (!isDifferent) {
          return {};
        }
      }

      return { selectedItems: nextSelectedItems };
    }),

  clearSelection: () => set({ selectedItems: new Set<string>() }),
}));

export const useSelectedVideos = (): Video[] => {
  const { selectedItems, selectedRecordType } = useSelectionStore();
  const videos = useVideoStore((state) => state.processedRecords);

  return useMemo(() => {
    if (selectedRecordType !== "video") {
      return [];
    }

    return videos.filter((video) => selectedItems.has(video.id));
  }, [selectedItems, selectedRecordType, videos]);
};

export const useSelectedIndividuals = (): Individual[] => {
  const { selectedItems, selectedRecordType } = useSelectionStore();
  const individuals = useIndividualsStore((state) => state.processedRecords);

  return useMemo(() => {
    if (selectedRecordType !== "individual") {
      return [];
    }

    return individuals.filter((individual) => selectedItems.has(individual.id));
  }, [individuals, selectedItems, selectedRecordType]);
};

export const useSelectedCrops = (): Crop[] => {
  const { selectedItems, selectedRecordType } = useSelectionStore();
  const crops = useCropsStore((state) => state.processedRecords);

  return useMemo(() => {
    if (selectedRecordType !== "crop") {
      return [];
    }

    return crops.filter((crop) => selectedItems.has(crop.id));
  }, [crops, selectedItems, selectedRecordType]);
};

/**
 * Update the specified fields for all currently selected videos.
 */
export const useUpdateSelectedVideos = () => {
  const selectedVideos = useSelectedVideos();
  const { clearSelection } = useSelectionStore();
  const { updateVideo } = useVideosStoreWithUsers();

  return useCallback(async (
    updatedFields: Partial<{
      assignees: string[];
      annotation_status: string;
      custom_tags: {
        add: string[];
        remove: string[];
      };
    }>,
  ) => {
    const updates = selectedVideos.flatMap((video) => {
      const payload: Partial<{
        assignees: string[];
        annotation_status: string;
        custom_tags: string[];
      }> = {};

      if (updatedFields.assignees) {
        payload.assignees = updatedFields.assignees;
      }
      if (updatedFields.annotation_status) {
        payload.annotation_status = updatedFields.annotation_status;
      }
      if (updatedFields.custom_tags) {
        const nextTags = new Set(video.custom_tags);
        updatedFields.custom_tags.add.forEach((tag) => nextTags.add(tag));
        updatedFields.custom_tags.remove.forEach((tag) => nextTags.delete(tag));
        payload.custom_tags = getSortedUniqueStrings(Array.from(nextTags));
      }

      if (Object.keys(payload).length === 0) {
        return [];
      }

      return [updateVideo(video.id, payload)];
    });

    if (updates.length === 0) {
      return;
    }

    await Promise.all(updates);
    clearSelection();
  }, [selectedVideos, clearSelection, updateVideo]);
};

export const useUpdateSelectedIndividuals = () => {
  const selectedIndividuals = useSelectedIndividuals();
  const { clearSelection } = useSelectionStore();
  const updateIndividual = useIndividualsStore((state) => state.update);

  return useCallback(async (
    updatedFields: Partial<{
      age: string;
      sex: string;
      custom_tags: {
        add: string[];
        remove: string[];
      };
    }>,
  ) => {
    const updates = selectedIndividuals.flatMap((individual) => {
      const payload: Partial<{
        age: string;
        sex: string;
        custom_tags: string[];
      }> = {};

      if (updatedFields.age !== undefined) {
        payload.age = updatedFields.age;
      }
      if (updatedFields.sex !== undefined) {
        payload.sex = updatedFields.sex;
      }
      if (updatedFields.custom_tags) {
        const nextTags = new Set(individual.custom_tags);
        updatedFields.custom_tags.add.forEach((tag) => nextTags.add(tag));
        updatedFields.custom_tags.remove.forEach((tag) => nextTags.delete(tag));
        payload.custom_tags = getSortedUniqueStrings(Array.from(nextTags));
      }

      if (Object.keys(payload).length === 0) {
        return [];
      }

      return [updateIndividual(individual.id, payload)];
    });

    if (updates.length === 0) {
      return;
    }

    await Promise.all(updates);
    clearSelection();
  }, [clearSelection, selectedIndividuals, updateIndividual]);
};

export const useUpdateSelectedCrops = () => {
  const selectedCrops = useSelectedCrops();
  const { clearSelection } = useSelectionStore();
  const updateCrop = useCropsStore((state) => state.update);

  return useCallback(async (
    updatedFields: Partial<{
      body_part: string;
      side: string;
      custom_tags: {
        add: string[];
        remove: string[];
      };
    }>,
  ) => {
    const updates = selectedCrops.flatMap((crop) => {
      const payload: Partial<{
        body_part: string;
        side: string;
        custom_tags: string[];
      }> = {};

      if (updatedFields.body_part !== undefined) {
        payload.body_part = updatedFields.body_part;
      }
      if (updatedFields.side !== undefined) {
        payload.side = updatedFields.side;
      }
      if (updatedFields.custom_tags) {
        const nextTags = new Set(crop.custom_tags);
        updatedFields.custom_tags.add.forEach((tag) => nextTags.add(tag));
        updatedFields.custom_tags.remove.forEach((tag) => nextTags.delete(tag));
        payload.custom_tags = getSortedUniqueStrings(Array.from(nextTags));
      }

      if (Object.keys(payload).length === 0) {
        return [];
      }

      return [updateCrop(crop.id, payload)];
    });

    if (updates.length === 0) {
      return;
    }

    await Promise.all(updates);
    clearSelection();
  }, [clearSelection, selectedCrops, updateCrop]);
};
