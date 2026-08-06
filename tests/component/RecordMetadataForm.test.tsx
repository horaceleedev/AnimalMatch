import { describe, expect, it, vi } from "vitest";

import RecordMetadataForm from "../../src/components/detail-views/RecordMetadataForm";
import type { MetadataFieldsType, Video } from "../../src/types";
import { renderWithProviders, screen, userEvent } from "../helpers/render";

const metadataFields: MetadataFieldsType = {
  needs_metadata: {
    displayName: "Needs metadata",
    type: "boolean",
    valueEditorType: "radio",
    displayBooleanValuesAs: ["Has metadata", "Needs metadata"],
  },
};

describe("RecordMetadataForm warnings", () => {
  it("shows a non-blocking warning for a manual metadata override", async () => {
    renderWithProviders(
      <RecordMetadataForm
        processedRecord={{ id: "video-1", needs_metadata: true } as Video}
        metadataFields={metadataFields}
        uniqueValuesPerField={{}}
        updateFunction={vi.fn()}
        getFieldWarning={(_fieldName, formData) => (
          formData.needs_metadata === false ? "Required video metadata is missing." : undefined
        )}
      />,
    );

    await userEvent.click(screen.getByRole("radio", { name: "Has metadata" }));

    expect(await screen.findByText("Required video metadata is missing.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });
});
