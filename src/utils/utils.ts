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

  let videos: Video[] = []; // list of videos where the individuals appear in
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
