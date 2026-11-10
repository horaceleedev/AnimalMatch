import { countBy } from "es-toolkit";
import proj4 from "proj4";

import { Individual, LocationInfo, MetadataFieldsType, Video, VideoRecord } from "../types";

const isNonNullString = (value: unknown): value is string => typeof value === "string";

// Returns [lat, long] for placing a video on the map, using the video's coordinate_system (UTM is converted).
// Returns null if the video has no usable coordinates.
export const getVideoLatLong = (record: VideoRecord): [number, number] | null => {
  if (record.coordinate_system === 'latlong') {
    return [record.latitude, record.longitude];
  }
  if (record.coordinate_system === 'utm' && record.utm_zone) {
    // https://stackoverflow.com/a/18621244
    const [long, lat] = proj4(
      `+proj=utm +zone=${record.utm_zone}${record.utm_hemisphere === 'S' ? ' +south' : ''}`,
      "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs",
      [record.utm_easting, record.utm_northing],
    );
    return [lat, long];
  }
  return null;
};

export const getUniqueLocationsFromVideos = (allVideos: Video[]) => {
  const videos = allVideos.filter(x => x.lat !== null);
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
      if (video.lat === null) continue;
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
