import { create } from "zustand";
import { useVideosStoreWithUsers, useVideoStore } from "../DataStores";
import { useCallback } from "react";

type State = {
  selectionMode: boolean;
  selectedItems: Set<string>;
};

type Actions = {
  toggleSelectionMode: () => void;
  addSelection: (itemId: string) => void;
  removeSelection: (itemId: string) => void;
  toggleItemSelection: (itemId: string) => void;
  clearSelection: () => void;
};

export const useSelectionStore = create<State & Actions>((set) => ({
  selectionMode: false,
  selectedItems: new Set<string>(),

  toggleSelectionMode: () =>
    set((state) => ({ selectionMode: !state.selectionMode })),

  addSelection: (itemId: string) =>
    set(({ selectedItems }) => {
      selectedItems.add(itemId);
      return { selectedItems: new Set(selectedItems) };
    }),

  removeSelection: (itemId: string) =>
    set(({ selectedItems }) => {
      selectedItems.delete(itemId);
      return { selectedItems: new Set(selectedItems) };
    }),

  toggleItemSelection: (itemId: string) =>
    set(({ selectedItems, addSelection, removeSelection }) => {
      if (selectedItems.has(itemId)) {
        removeSelection(itemId);
      } else {
        addSelection(itemId);
      }
      return { selectedItems: new Set(selectedItems) };
    }),

  clearSelection: () => set({ selectedItems: new Set<string>() }),
}));

/**
 * Get the set of all annotation statuses of the currently selected videos.
 */
export const useSelectedAnnotationStatuses = () => {
  const { selectedItems } = useSelectionStore();
  const videos = useVideoStore((state) => state.processedRecords);
  const annotationStatuses = new Set<string>();
  selectedItems.forEach((videoId) => {
    const video = videos.find((v) => v.id === videoId);
    if (video) {
      annotationStatuses.add(video.annotation_status);
    }
  });
  return annotationStatuses;
};

/**
 * Get the set of all custom tags of the currently selected videos.
 */
export const useSelectedCustomTags = () => {
  const { selectedItems } = useSelectionStore();
  const videos = useVideoStore((state) => state.processedRecords);
  const customTags = new Set<string>();
  selectedItems.forEach((videoId) => {
    const video = videos.find((v) => v.id === videoId);
    if (video) {
      video.custom_tags.forEach((tag) => customTags.add(tag));
    }
  });
  return customTags;
};

/**
 * Get the set of all assignees for the currently selected videos.
 */
export const useSelectedAssignees = () => {
  const { selectedItems } = useSelectionStore();
  const videos = useVideoStore((state) => state.processedRecords);
  const assignees = new Set<string>();
  selectedItems.forEach((videoId) => {
    const video = videos.find((v) => v.id === videoId);
    if (video) {
      video.assignees.forEach((assignee) => assignees.add(assignee));
    }
  });
  return assignees;
};

/**
 * Update the specified fields for all currently selected videos.
 */
export const useUpdateSelectedVideos = () => {
  const { selectedItems, clearSelection } = useSelectionStore();
  const { updateVideo } = useVideosStoreWithUsers();

  return useCallback((
    updatedFields: Partial<{
      custom_tags: string[];
      assignees: string[];
      annotation_status: string;
    }>,
  ) => {
    selectedItems.forEach((videoId) => {
      updateVideo(videoId, updatedFields);
    });

    clearSelection();
  }, [selectedItems, clearSelection, updateVideo]);
};
