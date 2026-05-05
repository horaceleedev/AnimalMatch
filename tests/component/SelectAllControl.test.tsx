import { describe, expect, it, vi } from "vitest";

import { SelectAllControl } from "../../src/components/ui/SelectAllControl";
import { renderWithProviders, screen, userEvent } from "../helpers/render";

describe("SelectAllControl", () => {
  it("calls onToggle with the next checked state when clicked", async () => {
    const onToggle = vi.fn();

    renderWithProviders(
      <SelectAllControl
        allSelected={false}
        someSelected={false}
        disabled={false}
        onToggle={onToggle}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox", { name: "Select all" }));

    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("renders as disabled when disabled is true", () => {
    renderWithProviders(
      <SelectAllControl
        allSelected={false}
        someSelected={false}
        disabled
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Select all" })).toBeDisabled();
  });
});
