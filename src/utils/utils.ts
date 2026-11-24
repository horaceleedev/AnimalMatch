import { countBy } from "es-toolkit";
import proj4 from "proj4";

import type { Deployment, DeploymentRecord, Individual, LocationInfo, MetadataFieldsType, Video } from "../types";

const isNonNullString = (value: unknown): value is string => typeof value === "string";

// Returns [lat, long] for a deployment, using its coordinate_system (UTM is converted).
// Returns null if the deployment has no usable coordinates.
export const getDeploymentLatLong = (record: DeploymentRecord): [number, number] | null => {
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

// Cameras sharing a location are told apart by camera ID
export const getDeploymentLabel = (d: DeploymentRecord) =>
  [d.locationID || 'Unnamed location', d.cameraID].filter(Boolean).join(' · ');

// One map location per deployment with coordinates (location id = deployment id)
export const getLocationsFromDeployments = (deployments: Deployment[], videos: Video[]): LocationInfo[] => {
  const numVideosPerDeployment = countBy(videos, v => v.deployment);
  return deployments.filter(d => d.lat !== null && d.long !== null).map(d => ({
    id: d.id,
    lat: d.lat!,
    long: d.long!,
    tooltipText: `${getDeploymentLabel(d)}: ${numVideosPerDeployment[d.id] ?? 0} videos`,
  }));
};

export const getUniqueLocationsFromIndividuals = (individuals: Individual[], allVideos: Video[], deployments: Deployment[]): LocationInfo[] => {
  if (allVideos.length === 0) {
    console.warn("Warning when computing individual locations: allVideos is empty (possibly because videos are still loading), returning empty unique locations");
    return [];
  }

  const videosById = new Map(allVideos.map(v => [v.id, v]));
  // Map from a deployment ID to a set of individual IDs seen there
  const individualIdsPerDeployment = new Map<string, Set<string>>();
  for (const indiv of individuals) {
    for (const videoId of indiv.videos) {
      const video = videosById.get(videoId);
      if (!video) {
        console.error(`Error when computing individual locations: video ${videoId} not found`);
        continue;
      }
      if (!video.deployment) continue;
      const individualIds = individualIdsPerDeployment.get(video.deployment) ?? new Set<string>();
      individualIds.add(indiv.id);
      individualIdsPerDeployment.set(video.deployment, individualIds);
    }
  }

  return deployments.filter(d => d.lat !== null && d.long !== null && individualIdsPerDeployment.has(d.id)).map(d => ({
    id: d.id,
    lat: d.lat!,
    long: d.long!,
    tooltipText: `${individualIdsPerDeployment.get(d.id)!.size} individuals in this location`,
  }));
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
