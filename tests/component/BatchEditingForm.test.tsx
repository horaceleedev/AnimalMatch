import { beforeEach, describe, expect, it, vi } from "vitest";

const selectionMocks = vi.hoisted(() => ({
  selectedVideos: [] as Array<Record<string, unknown>>,
  updateSelectedVideos: vi.fn(async (updatedFields: unknown) => updatedFields),
}));

vi.mock("../../src/DataStores", () => ({
  useUsersStore: (selector: (state: { processedRecords: never[] }) => unknown) =>
    selector({ processedRecords: [] }),
}));

vi.mock("../../src/hooks/useSelectionStore", () => ({
  useSelectedVideos: () => selectionMocks.selectedVideos,
  useUpdateSelectedVideos: () => selectionMocks.updateSelectedVideos,
  useSelectedIndividuals: () => [],
  useUpdateSelectedIndividuals: () => vi.fn(),
  useSelectedCrops: () => [],
  useUpdateSelectedCrops: () => vi.fn(),
}));

import { BatchEditingForm } from "../../src/components/ui/BatchEditingForm";
import { renderWithProviders, screen, userEvent, waitFor } from "../helpers/render";

describe("BatchEditingForm", () => {
  beforeEach(() => {
    selectionMocks.updateSelectedVideos.mockClear();
    selectionMocks.selectedVideos.splice(
      0,
      selectionMocks.selectedVideos.length,
      {
        id: "video-1",
        assignees: [],
        annotation_status: "to annotate",
        custom_tags: [],
        location_name: "Meru",
      },
      {
        id: "video-2",
        assignees: [],
        annotation_status: "to annotate",
        custom_tags: [],
        location_name: "Nanyuki",
      },
    );
  });

  it("updates the location name for the selected videos", async () => {
    renderWithProviders(
      <BatchEditingForm
        recordType="video"
        uniqueValuesPerField={{ location_name: ["Meru", "Nairobi", "Nanyuki"] }}
      />,
    );
    const user = userEvent.setup();

    expect(screen.getByText("Mixed")).toBeInTheDocument();
    await user.click(screen.getByRole("combobox", { name: "Location name" }));
    await user.click(await screen.findByText("Nairobi"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(selectionMocks.updateSelectedVideos).toHaveBeenCalledWith({
        location_name: "Nairobi",
      });
    });
  });
});
