import { countBy } from "es-toolkit";

import { Individual, LocationInfo, MetadataFieldsType, Video } from "../types";

const isNonNullString = (value: unknown): value is string => typeof value === "string";

export type SharedStringValue = { value: string | undefined; isMixed: boolean };
export type SharedStringArrayValue = { value: string[]; isMixed: boolean };

export const getSortedUniqueStrings = (values: unknown[]) =>
  Array.from(new Set(values.filter(isNonNullString))).sort((a, b) => a.localeCompare(b));

export const getSharedStringValue = (values: unknown[]): SharedStringValue => {
  if (values.length === 0) {
    return { value: undefined, isMixed: false };
  }

  const normalizedValues = values.map((value) => (typeof value === "string" ? value : undefined));
  const firstValue = normalizedValues[0];
  const allMatch = normalizedValues.every((value) => value === firstValue);

  return {
    value: allMatch ? firstValue : undefined,
    isMixed: !allMatch,
  };
};

export const getSharedStringArrayValue = (values: unknown[]): SharedStringArrayValue => {
  if (values.length === 0) {
    return { value: [], isMixed: false };
  }

  const normalizedValues = values.map((value) =>
    Array.isArray(value) ? getSortedUniqueStrings(value) : [],
  );
  const firstValue = normalizedValues[0];
  const allMatch = normalizedValues.every(
    (normalizedValue) =>
      normalizedValue.length === firstValue.length &&
      normalizedValue.every((entry, index) => entry === firstValue[index]),
  );

  return {
    value: allMatch ? firstValue : [],
    isMixed: !allMatch,
  };
};

export const getUniqueLocationsFromVideos = (videos: Video[]) => {
  const numVideosPerUniqueLocation = countBy(videos, x => JSON.stringify([x.lat, x.long]));
  const uniqueLocations = Object.entries(numVideosPerUniqueLocation).map(([latLongString, numVideos]) => {
    const [lat, long] = JSON.parse(latLongString);
    return {
      id: latLongString,
      lat: lat,
      long: long,
      tooltipText: `${numVideos} videos in this location`,
    } as LocationInfo;
  });
  return uniqueLocations;
};

export const getUniqueLocationsFromIndividuals = (individuals: Individual[], allVideos: Video[]) => {
  if (allVideos.length === 0) {
    console.warn("Warning when computing individual locations: allVideos is empty (possibly because videos are still loading), returning empty unique locations");
    return [];
  }

  const videos: Video[] = []; // list of videos where the individuals appear in
  for (const indiv of individuals) {
    for (const videoId of indiv.videos) {
      const video = allVideos.find(v => v.id === videoId);
      if (!video) {
        console.error(`Error when computing individual locations: video ${videoId} not found`);
      } else {
        videos.push(video);
      }
    }
  }
  
  const numVideosPerUniqueLocation = countBy(videos, x => JSON.stringify([x.lat, x.long]));
  const uniqueLocations = Object.entries(numVideosPerUniqueLocation).map(([latLongString, numVideos]) => {
    const [lat, long] = JSON.parse(latLongString);
    return {
      id: latLongString,
      lat: lat,
      long: long,
      tooltipText: `${numVideos} individuals in this location`,
    } as LocationInfo;
  });
  return uniqueLocations;
}

export const getUniqueValuesPerField = (
  metadataFields: MetadataFieldsType,
  processedRecords: Record<string, unknown>[],
) => {
  const uniqueValuesPerField: Record<string, string[]> = {}; // an object where each key is a field name and its associated value is a list of unique values for that field
  Object.entries(metadataFields).forEach(([fieldValue, field]) => {
    if (field.type === 'select') {
      // Use preset options if available
      if (field.presetOptions) {
        uniqueValuesPerField[fieldValue] = field.presetOptions;
        return;
      }

      const uniqueValuesSorted = getSortedUniqueStrings(processedRecords.map(x => x[fieldValue]));
      uniqueValuesPerField[fieldValue] = uniqueValuesSorted;
      console.log(uniqueValuesSorted);
    } else if (field.type === 'multiselect') {
      const uniqueValuesSorted = getSortedUniqueStrings(
        processedRecords.flatMap(x => x[fieldValue] ?? []),
      );
      uniqueValuesPerField[fieldValue] = uniqueValuesSorted;
      // console.log(uniqueValuesSorted);
    }
  });
  return uniqueValuesPerField;
}

export const getMultiselectValueCounts = <T extends Record<string, unknown>>(
  records: T[],
  fieldValue: keyof T & string,
) => {
  const counts: Record<string, number> = {};

  for (const record of records) {
    const values = record[fieldValue];
    if (!Array.isArray(values)) continue;

    for (const value of values) {
      if (!isNonNullString(value)) continue;
      counts[value] = (counts[value] ?? 0) + 1;
    }
  }

  return counts;
};
