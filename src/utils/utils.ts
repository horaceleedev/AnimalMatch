import { countBy, orderBy } from "es-toolkit";

import { Individual, LocationInfo, MetadataFieldsType, Video } from "../types";

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
};

export const getUniqueValuesPerField = (metadataFields: MetadataFieldsType, processedRecords: Record<string, any>[]) => {
  let uniqueValuesPerField: Record<string, string[]> = {}; // an object where each key is a field name and its associated value is a list of unique values for that field
  Object.entries(metadataFields).forEach(([fieldValue, field]) => {
    if (field.type === 'select') {
      // Use preset options if available
      if (field.presetOptions) {
        uniqueValuesPerField[fieldValue] = field.presetOptions;
        return;
      }

      const uniqueValues = Array.from(new Set(processedRecords.map(x => x[fieldValue])));
      const uniqueValuesSorted = orderBy(uniqueValues, [x => x], ['asc']);
      uniqueValuesPerField[fieldValue] = uniqueValuesSorted;
      console.log(uniqueValuesSorted);
    } else if (field.type === 'multiselect') {
      const uniqueValues = Array.from(new Set(
        processedRecords.map(x => x[fieldValue]).flat()
      ));
      const uniqueValuesSorted = orderBy(uniqueValues, [x => x], ['asc']);
      uniqueValuesPerField[fieldValue] = uniqueValuesSorted;
      // console.log(uniqueValuesSorted);
    }
  });
  return uniqueValuesPerField;
};

export const float32ArrayToBase64 = (arr: Float32Array) => {
  // Create a Uint8Array view of the Float32Array's underlying buffer
  const bytes = new Uint8Array(arr.buffer);

  // Convert bytes to binary string
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  // Encode binary string to base64
  return btoa(binary);
};

export const base64ToFloat32Array = (b64: string) => {
  // Decode base64 to binary string
  const binary = atob(b64);

  // Create a Uint8Array with the right length
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // Interpret the bytes as 32‑bit floats (little‑endian)
  return new Float32Array(bytes.buffer);
};
