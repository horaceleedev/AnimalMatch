import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/components/ui/BatchEditingForm", () => ({
  BatchEditingForm: ({
    onSubmit,
    recordType,
  }: {
    onSubmit?: () => void;
    recordType: string;
  }) => (
    <div>
      <span>Mock batch form for {recordType}</span>
      <button type="button" onClick={onSubmit}>
        Close form
      </button>
    </div>
  ),
}));

import { BatchEditPopup } from "../../src/components/ui/BatchEditPopup";
import { renderWithProviders, screen, userEvent } from "../helpers/render";

describe("BatchEditPopup", () => {
  it("renders a disabled button when nothing is selected", () => {
    renderWithProviders(
      <BatchEditPopup
        recordType="video"
        selectionMode
        selectedItems={new Set<string>()}
        uniqueValuesPerField={{}}
      />,
    );

    expect(screen.getByRole("button", { name: /Batch edit/ })).toBeDisabled();
  });

  it("opens the popup content when enabled and clicked", async () => {
    renderWithProviders(
      <BatchEditPopup
        recordType="video"
        selectionMode
        selectedItems={new Set(["video-1"])}
        uniqueValuesPerField={{}}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Batch edit/ }));

    expect(await screen.findByText("Mock batch form for video")).toBeInTheDocument();
  });
});
