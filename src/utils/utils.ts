import { countBy } from "es-toolkit";

import { Individual, LocationInfo, MetadataFieldsType, Video } from "../types";

const isNonNullString = (value: unknown): value is string => typeof value === "string";

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

  const videosById = new Map(allVideos.map(v => [v.id, v]));
  // Map from a unique location (as a JSON string of [lat, long]) to a set of individual IDs seen at that location
  const individualIdsPerLocation = new Map<string, Set<string>>();
  for (const indiv of individuals) {
    for (const videoId of indiv.videos) {
      const video = videosById.get(videoId);
      if (!video) {
        console.error(`Error when computing individual locations: video ${videoId} not found`);
        continue;
      }
      const latLongString = JSON.stringify([video.lat, video.long]);
      const individualIds = individualIdsPerLocation.get(latLongString) ?? new Set<string>();
      individualIds.add(indiv.id);
      individualIdsPerLocation.set(latLongString, individualIds);
    }
  }

  return Array.from(individualIdsPerLocation, ([latLongString, individualIds]) => {
    const [lat, long] = JSON.parse(latLongString);
    return {
      id: latLongString,
      lat: lat,
      long: long,
      tooltipText: `${individualIds.size} individuals in this location`,
    } as LocationInfo;
  });
}

export const getUniqueValuesPerField = (metadataFields: MetadataFieldsType, processedRecords: Record<string, any>[]) => {
  let uniqueValuesPerField: Record<string, string[]> = {}; // an object where each key is a field name and its associated value is a list of unique values for that field
  Object.entries(metadataFields).forEach(([fieldName, metadataField]) => {
    if (metadataField.type === 'select') {
      // Use preset options if available
      if (metadataField.presetOptions) {
        uniqueValuesPerField[fieldName] = metadataField.presetOptions;
        return;
      }

      const uniqueValues = Array.from(
        new Set(processedRecords.map(x => x[fieldName]).filter(isNonNullString))
      );
      const uniqueValuesSorted = [...uniqueValues].sort((a, b) => a.localeCompare(b));
      uniqueValuesPerField[fieldName] = uniqueValuesSorted;
      console.log(uniqueValuesSorted);
    } else if (metadataField.type === 'multiselect') {
      const uniqueValues = Array.from(
        new Set(processedRecords.flatMap(x => x[fieldName] ?? []).filter(isNonNullString))
      );
      const uniqueValuesSorted = [...uniqueValues].sort((a, b) => a.localeCompare(b));
      uniqueValuesPerField[fieldName] = uniqueValuesSorted;
      // console.log(uniqueValuesSorted);
    }
  });
  return uniqueValuesPerField;
}
