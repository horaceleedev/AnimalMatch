// This file contains the 'stores' which store the global state and data of the app
import { create } from 'zustand';
import proj4 from "proj4";
import PocketBase from 'pocketbase';
import dayjs from 'dayjs';

import type { Video, VideoRecord, LocationInfo, Individual, IndividualRecord } from "./types.ts";
import { individualsMetadataFields, videoMetadataFields } from "./metadata.tsx";
import { getUniqueLocationsFromVideos, getUniqueValuesPerField } from './utils/utils.ts';

const pb = new PocketBase('http://127.0.0.1:8090');

interface VideoStore {
  unprocessedVideos: VideoRecord[];
  videos: Video[];
  uniqueLocations: LocationInfo[];
  uniqueValuesPerField: Record<string, string[]>;
  fetchVideos: () => void;
  subscribe: () => void;
  unsubscribe: () => void;
};

export const useVideoStore = create<VideoStore>()((set) => ({
  unprocessedVideos: [],
  videos: [],
  uniqueLocations: [],
  uniqueValuesPerField: {},
  fetchVideos: async () => {
    const records: VideoRecord[] = await pb.collection('videos').getFullList<VideoRecord>({
      sort: 'filename',
    });
    const { processedVideos, uniqueLocations, uniqueValuesPerField } = processVideos(records);
    set({ unprocessedVideos: records, videos: processedVideos, uniqueLocations: uniqueLocations, uniqueValuesPerField: uniqueValuesPerField });
  },
  subscribe: () => {
    console.log('Subscribing to videos');
    // Subscribe to changes in any video record
    pb.collection('videos').subscribe<VideoRecord>('*', function (e) {
      const { action, record } = e;
      if (action === 'create') {
        set((state) => {
          const records = [...state.unprocessedVideos, record];
          // TODO sort records by filename or some other field
          const { processedVideos, uniqueValuesPerField } = processVideos(records);
          return {
            unprocessedVideos: records,
            videos: processedVideos,
            uniqueValuesPerField: uniqueValuesPerField,
          };
        });
      } else if (action === 'update') {
        set((state) => {
          const records = state.unprocessedVideos.map(item => item.id === record.id ? record : item);
          // TODO sort records by filename or some other field
          const { processedVideos, uniqueValuesPerField } = processVideos(records);
          return {
            unprocessedVideos: records,
            videos: processedVideos,
            uniqueValuesPerField: uniqueValuesPerField,
          };
        });
      } else if (action === 'delete') {
        set((state) => {
          const records = state.unprocessedVideos.filter(item => item.id !== record.id);
          // TODO sort records by filename or some other field
          const { processedVideos, uniqueValuesPerField } = processVideos(records);
          return {
            unprocessedVideos: records,
            videos: processedVideos,
            uniqueValuesPerField: uniqueValuesPerField,
          };
        });
      } else {
        console.error(`Unknown action: ${action}`);
      }
    }, { /* other options like expand, custom headers, etc. */ });
  },
  unsubscribe: () => {
    console.log('Unsubscribing from videos');
    pb.collection('videos').unsubscribe('*'); // remove all '*' topic subscriptions
  },
}));

const processVideos = (records: VideoRecord[]) => {
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
  console.log('Processed videos', processedVideos);

  const uniqueLocations = getUniqueLocationsFromVideos(processedVideos);
  // console.log(uniqueLocations)
  const uniqueValuesPerField = getUniqueValuesPerField(videoMetadataFields, processedVideos);

  return { processedVideos, uniqueLocations, uniqueValuesPerField };
};

interface IndividualsStore {
  unprocessedIndividuals: IndividualRecord[];
  individuals: Individual[];
  uniqueValuesPerField: Record<string, string[]>;
  fetchIndividuals: () => void;
  subscribe: () => void;
  unsubscribe: () => void;
};

export const useIndividualsStore = create<IndividualsStore>()((set) => ({
  unprocessedIndividuals: [],
  individuals: [],
  uniqueValuesPerField: {},
  fetchIndividuals: async () => {
    console.log('Fetching individuals');
    const records: IndividualRecord[] = await pb.collection('individuals').getFullList<IndividualRecord>({
      sort: 'name',
    });
    const { processedIndividuals, uniqueValuesPerField } = processIndividuals(records);
    set({ unprocessedIndividuals: records, individuals: processedIndividuals, uniqueValuesPerField: uniqueValuesPerField });
  },
  subscribe: () => {
    console.log('Subscribing to individuals');
    // Subscribe to changes in any individual record
    pb.collection('individuals').subscribe<IndividualRecord>('*', function (e) {
      const { action, record } = e;
      if (action === 'create') {
        set((state) => {
          const records = [...state.unprocessedIndividuals, record];
          // TODO sort records by name or some other field
          const { processedIndividuals, uniqueValuesPerField } = processIndividuals(records);
          return {
            unprocessedIndividuals: records,
            individuals: processedIndividuals,
            uniqueValuesPerField: uniqueValuesPerField,
          };
        });
      } else if (action === 'update') {
        set((state) => {
          const records = state.unprocessedIndividuals.map(item => item.id === record.id ? record : item);
          // TODO sort records by name or some other field
          const { processedIndividuals, uniqueValuesPerField } = processIndividuals(records);
          return {
            unprocessedIndividuals: records,
            individuals: processedIndividuals,
            uniqueValuesPerField: uniqueValuesPerField,
          };
        });
      } else if (action === 'delete') {
        set((state) => {
          const records = state.unprocessedIndividuals.filter(item => item.id !== record.id);
          // TODO sort records by name or some other field
          const { processedIndividuals, uniqueValuesPerField } = processIndividuals(records);
          return {
            unprocessedIndividuals: records,
            individuals: processedIndividuals,
            uniqueValuesPerField: uniqueValuesPerField,
          };
        });
      } else {
        console.error(`Unknown action: ${action}`);
      }
    }, { /* other options like expand, custom headers, etc. */ });
  },
  unsubscribe: () => {
    console.log('Unsubscribing from individuals');
    pb.collection('individuals').unsubscribe('*'); // remove all '*' topic subscriptions
  },
}));

const processIndividuals = (records: IndividualRecord[]) => {
  const processedIndividuals: Individual[] = records.map((record: IndividualRecord) => {
    return {
      ...record,
      imageUrls: record.images.map(imageFilename => 
        `http://127.0.0.1:8090/api/files/${record.collectionId}/${record.id}/${imageFilename}`
      ),
    };
  });
  console.log('Processed individuals', processedIndividuals);

  const uniqueValuesPerField = getUniqueValuesPerField(individualsMetadataFields, processedIndividuals);
  return { processedIndividuals, uniqueValuesPerField };
};
