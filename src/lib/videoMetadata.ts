import dayjs from "dayjs";

import type { Video } from "../types";

type VideoMetadata = Pick<Video, "location_name" | "recording_date" | "utm_easting" | "utm_northing" | "needs_metadata">;

const requiredVideoMetadata = [
  {
    key: "location_name",
    label: "location name",
    isPresent: (value: unknown) => typeof value === "string" && value.trim().length > 0,
  },
  {
    key: "recording_date",
    label: "recording date",
    isPresent: (value: unknown) => typeof value === "string" && dayjs(value).isValid(),
  },
  {
    key: "utm_easting",
    label: "UTM easting",
    isPresent: (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0,
  },
  {
    key: "utm_northing",
    label: "UTM northing",
    isPresent: (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0,
  },
] as const;

export const getMissingVideoMetadataFields = (video: Partial<VideoMetadata>): string[] => (
  requiredVideoMetadata
    .filter(({ key, isPresent }) => !isPresent(video[key]))
    .map(({ label }) => label)
);

export const getNeedsMetadataWarning = (video: Partial<VideoMetadata>): string | undefined => {
  if (video.needs_metadata !== false) return undefined;

  const missingFields = getMissingVideoMetadataFields(video);
  if (missingFields.length === 0) return undefined;

  return `Required metadata is missing: ${missingFields.join(", ")}. Are you sure you want to mark this video as having metadata?`;
};

export const prepareVideoUpdatePayload = (
  payload: Partial<Video>,
  currentVideo?: Video,
): Partial<Video> => {
  // An explicit choice is a manual override and must not be second-guessed.
  if ("needs_metadata" in payload) return payload;

  const combinedVideo = { ...currentVideo, ...payload };
  return getMissingVideoMetadataFields(combinedVideo).length === 0
    ? { ...payload, needs_metadata: false }
    : payload;
};
