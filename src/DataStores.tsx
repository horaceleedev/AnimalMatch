// This file contains the 'stores' which store the global state and data of the app
import { create } from 'zustand';
import proj4 from "proj4";
import PocketBase from 'pocketbase';
import { orderBy } from "es-toolkit";
import dayjs from 'dayjs';

import type { Video, VideoRecord, LocationInfo, Individual, IndividualRecord } from "./types.ts";
import { individualsMetadataFields, videoMetadataFields } from "./metadata.tsx";
import { getUniqueLocationsFromVideos } from './utils/utils.ts';

const pb = new PocketBase('http://127.0.0.1:8090');

interface VideoStore {
  videos: Video[];
  uniqueLocations: LocationInfo[];
  uniqueValuesPerField: Record<string, string[]>;
  fetchVideos: () => void;
};

export const useVideoStore = create<VideoStore>()((set) => ({
  videos: [],
  uniqueLocations: [],
  uniqueValuesPerField: {},
  fetchVideos: async () => {
    const records: VideoRecord[] = await pb.collection('videos').getFullList<VideoRecord>({
      sort: 'filename',
    });
    const processedVideos: Video[] = records.map((record: VideoRecord) => {
      // https://stackoverflow.com/a/18621244
      const [long, lat] = proj4("+proj=utm +zone=29", "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs",[record.utm_easting, record.utm_northing]);
      return {
        ...record,
        recording_date: dayjs(record.recording_date).format("YYYY-MM-DD HH:mm:ss"),
        url: `http://127.0.0.1:8090/api/files/${record.collectionId}/${record.id}/${record.file}`,
        lat,
        long,
      };
    });
    console.log('Fetched videos', processedVideos);

    const uniqueLocations = getUniqueLocationsFromVideos(processedVideos);
    // console.log(uniqueLocations)

    let uniqueValuesPerField: Record<string, string[]> = {}; // an object where each key is a field name and its associated value is a list of unique values for that field
    Object.entries(videoMetadataFields).forEach(([fieldValue, field]) => {
      if (field.type === 'select') {
        const uniqueValues = Array.from(new Set(processedVideos.map(x => x[fieldValue])));
        const uniqueValuesSorted = orderBy(uniqueValues, [x => x], ['asc']);
        uniqueValuesPerField[fieldValue] = uniqueValuesSorted;
        console.log(uniqueValuesSorted);
      } else if (field.type === 'multiselect') {
        const uniqueValues = Array.from(new Set(
          processedVideos.map(x => x[fieldValue]).flat()
        ));
        const uniqueValuesSorted = orderBy(uniqueValues, [x => x], ['asc']);
        uniqueValuesPerField[fieldValue] = uniqueValuesSorted;
        // console.log(uniqueValuesSorted);
      }
    });

    set({ videos: processedVideos, uniqueLocations: uniqueLocations, uniqueValuesPerField: uniqueValuesPerField });
  },
}));

interface IndividualsStore {
  individuals: Individual[];
  uniqueValuesPerField: Record<string, string[]>;
  fetchIndividuals: () => void;
};

export const useIndividualsStore = create<IndividualsStore>()((set) => ({
  individuals: [],
  uniqueValuesPerField: {},
  fetchIndividuals: async () => {
    const records: IndividualRecord[] = await pb.collection('individuals').getFullList<IndividualRecord>({
      sort: 'name',
    });
    const processedIndividuals: Individual[] = records.map((record: IndividualRecord) => {
      return {
        ...record,
        images: record.images.map(imageFilename => 
          `http://127.0.0.1:8090/api/files/${record.collectionId}/${record.id}/${imageFilename}`
        ),
      };
    });
    console.log('Fetched individuals', processedIndividuals);

    let uniqueValuesPerField: Record<string, string[]> = {}; // an object where each key is a field name and its associated value is a list of unique values for that field
    Object.entries(individualsMetadataFields).forEach(([fieldValue, field]) => {
      if (field.type === 'select') {
        const uniqueValues = Array.from(new Set(processedIndividuals.map(x => x[fieldValue])));
        const uniqueValuesSorted = orderBy(uniqueValues, [x => x], ['asc']);
        uniqueValuesPerField[fieldValue] = uniqueValuesSorted;
        console.log(uniqueValuesSorted);
      } else if (field.type === 'multiselect') {
        const uniqueValues = Array.from(new Set(
          processedIndividuals.map(x => x[fieldValue]).flat()
        ));
        const uniqueValuesSorted = orderBy(uniqueValues, [x => x], ['asc']);
        uniqueValuesPerField[fieldValue] = uniqueValuesSorted;
        // console.log(uniqueValuesSorted);
      }
    });

    set({ individuals: processedIndividuals, uniqueValuesPerField: uniqueValuesPerField });
  }
}));