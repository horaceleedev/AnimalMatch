import { describe, expect, it, vi } from "vitest";

import type { RecordSelectionUi } from "../../src/hooks/useRecordSelectionUi";
import { SelectionToolbarControls } from "../../src/components/ui/SelectionToolbarControls";
import { renderWithProviders, screen, userEvent } from "../helpers/render";

const makeSelectionUi = (
  overrides: Partial<RecordSelectionUi> = {},
): RecordSelectionUi => ({
  recordType: "video",
  selectionModeActive: false,
  selectedItems: new Set<string>(),
  allFilteredItemsSelected: false,
  someFilteredItemsSelected: false,
  hasFilteredItems: true,
  toggleSelectionMode: vi.fn(),
  toggleItemSelection: vi.fn(),
  setAllFilteredSelected: vi.fn(),
  ...overrides,
});

describe("SelectionToolbarControls", () => {
  it("always renders the multi-select switch and toggles it", async () => {
    const selectionUi = makeSelectionUi();

    renderWithProviders(
      <SelectionToolbarControls
        selectionUi={selectionUi}
        showBatchEdit
        uniqueValuesPerField={{}}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("switch", { name: /Exit Multi-select/ }));

    expect(selectionUi.toggleSelectionMode).toHaveBeenCalled();
    expect(screen.queryByRole("checkbox", { name: "Select all" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Batch edit/ })).not.toBeInTheDocument();
  });

  it("shows select all and batch edit when selection mode is active", () => {
    renderWithProviders(
      <SelectionToolbarControls
        selectionUi={makeSelectionUi({
          selectionModeActive: true,
          selectedItems: new Set(["video-1"]),
          someFilteredItemsSelected: true,
        })}
        showBatchEdit
        uniqueValuesPerField={{ custom_tags: [] }}
      />,
    );

    expect(screen.getByRole("switch", { name: /Exit Multi-select/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select all" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Batch edit/ })).toBeInTheDocument();
  });

  it("hides batch edit when the feature is disabled even if selection mode is active", () => {
    renderWithProviders(
      <SelectionToolbarControls
        selectionUi={makeSelectionUi({
          selectionModeActive: true,
          selectedItems: new Set(["video-1"]),
        })}
        showBatchEdit={false}
        uniqueValuesPerField={{}}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Select all" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Batch edit/ })).not.toBeInTheDocument();
  });
});
