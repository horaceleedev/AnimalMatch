import { describe, expect, it } from "vitest";

import {
  getMissingVideoMetadataFields,
  getNeedsMetadataWarning,
  prepareVideoUpdatePayload,
} from "../../src/lib/videoMetadata";
import type { Video } from "../../src/types";

const completeMetadata = {
  location_name: "Meru",
  recording_date: "2026-01-01 12:00:00",
  utm_easting: 640000,
  utm_northing: 120000,
  needs_metadata: true,
} as Video;

describe("video metadata completeness", () => {
  it("requires every metadata field", () => {
    expect(getMissingVideoMetadataFields({
      ...completeMetadata,
      recording_date: "",
      utm_northing: 0,
    })).toEqual(["recording date", "UTM northing"]);
  });

  it("only clears needs_metadata once the combined record is complete", () => {
    expect(prepareVideoUpdatePayload(
      { utm_northing: 120000 },
      { ...completeMetadata, utm_northing: 0 },
    )).toEqual({ utm_northing: 120000, needs_metadata: false });

    expect(prepareVideoUpdatePayload(
      { location_name: "Meru" },
      { ...completeMetadata, recording_date: "" },
    )).toEqual({ location_name: "Meru" });
  });

  it("respects an explicit manual override", () => {
    expect(prepareVideoUpdatePayload(
      { needs_metadata: false },
      { ...completeMetadata, location_name: "" },
    )).toEqual({ needs_metadata: false });
  });

  it("warns without blocking an incomplete manual override", () => {
    expect(getNeedsMetadataWarning({
      ...completeMetadata,
      location_name: "",
      needs_metadata: false,
    })).toBe("Required metadata is missing: location name. Are you sure you want to mark this video as having metadata?");
    expect(getNeedsMetadataWarning({ ...completeMetadata, needs_metadata: false })).toBeUndefined();
  });
});
