import { countBy } from "es-toolkit";

import { Individual, LocationInfo, Video } from "../types";

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
}