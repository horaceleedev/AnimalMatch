// This file contains the 'stores' which store the global state and data of the app
import { create } from 'zustand';
import proj4 from "proj4";
import PocketBase, { ClientResponseError, RecordModel } from 'pocketbase';
import dayjs from 'dayjs';

import type { Video, VideoRecord, LocationInfo, Individual, IndividualRecord, CropRecord, Crop } from "./types.ts";
import { cropsMetadataFields, individualsMetadataFields, videoMetadataFields } from "./metadata.tsx";
import { getUniqueLocationsFromVideos, getUniqueValuesPerField } from './utils/utils.ts';

const pb = new PocketBase('http://127.0.0.1:8090');

// Create a Zustand store for a PocketBase collection with real-time updates
interface CollectionStore<TRecord, TProcessed, TExtra> {
  unprocessedRecords: TRecord[];
  processedRecords: TProcessed[];
  uniqueValuesPerField: Record<string, string[]>;
  extra: TExtra;
  fetch: () => Promise<void>;
  subscribe: () => void;
  unsubscribe: () => void;
  update: (id: string, data: Partial<TProcessed>) => Promise<void>;
};
const createRealtimeCollectionStore = <TRecord extends RecordModel, TProcessed extends RecordModel, TExtra extends Record<string, any> = {}>(opts: {
  collectionName: string;
  sortField?: string;
  extraInitialState?: TExtra;
  processRecords: (records: TRecord[]) => { processedRecords: TProcessed[]; uniqueValuesPerField: Record<string, string[]>; extra?: TExtra };
  ignoredUpdateKeys?: string[];
}) => {
  const { collectionName, sortField, extraInitialState = {}, processRecords, ignoredUpdateKeys = [] } = opts;

  return create<CollectionStore<TRecord, TProcessed, TExtra>>()((set) => ({
    unprocessedRecords: [] as TRecord[],
    processedRecords: [] as TProcessed[],
    uniqueValuesPerField: {} as Record<string, string[]>,
    extra: extraInitialState as TExtra,
    fetch: async () => {
      let records: TRecord[] = [];
      try {
        records = await pb.collection(collectionName).getFullList<TRecord>({
          sort: sortField,
        });
      } catch (e) {
        handlePocketBaseError(e);
        return;
      }
      const { processedRecords, uniqueValuesPerField, extra } = processRecords(records);
      set({ unprocessedRecords: records, processedRecords, uniqueValuesPerField, extra });
    },
    subscribe: () => {
      console.log(`Subscribing to ${collectionName}`);
      pb.collection(collectionName).subscribe<TRecord>('*', function (e) {
        set((state) => {
          let records = [...state.unprocessedRecords];
          const { action, record } = e;
          if (action === 'create') {
            records = [...records, record];
            // TODO sort records by sortField
          } else if (action === 'update') {
            records = records.map((item: TRecord) => item.id === record.id ? record : item);
            // TODO sort records by sortField
          } else if (action === 'delete') {
            records = records.filter((item: TRecord) => item.id !== record.id);
            // TODO sort records by sortField
          } else {
            console.error(`Unknown action: ${action}`);
            return {};
          }
          const { processedRecords, uniqueValuesPerField, extra } = processRecords(records);
          return {
            unprocessedRecords: records,
            processedRecords,
            uniqueValuesPerField,
            extra,
          };
        });
      }, { /* other options like expand, custom headers, etc. */ });
    },
    unsubscribe: () => {
      console.log(`Unsubscribing from ${collectionName}`);
      pb.collection(collectionName).unsubscribe('*');
    },
    update: async (id: string, data: Partial<TProcessed>) => {
      // remove some keys before sending to backend
      const payload = { ...data };
      for (const k of ignoredUpdateKeys) {
        if (k in payload) delete payload[k];
      }
      await pb.collection(collectionName).update(id, payload);
    },
  }));
};


// --- Video store ---
export const useVideoStore = createRealtimeCollectionStore<VideoRecord, Video, { uniqueLocations: LocationInfo[] }>({
  collectionName: 'videos',
  sortField: 'filename',
  extraInitialState: { uniqueLocations: [] },
  processRecords: (records: VideoRecord[]) => {
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

    return { processedRecords: processedVideos, uniqueValuesPerField, extra: { uniqueLocations } };
  },
  // For now ignore the recording_date/url/lat/long key
  // TODO later maybe convert back from URLs to filenames (and verify what happens in the backend)
  ignoredUpdateKeys: ['recording_date', 'url', 'lat', 'long'],
});


// --- Individuals store ---
export const useIndividualsStore = createRealtimeCollectionStore<IndividualRecord, Individual>({
  collectionName: 'individuals',
  sortField: 'name',
  processRecords: (records: IndividualRecord[]) => {
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
    return { processedRecords: processedIndividuals, uniqueValuesPerField };
  },
  // For now ignore the images/imageUrls key
  // TODO later maybe convert back from URLs to filenames (and verify what happens in the backend)
  ignoredUpdateKeys: ['images', 'imageUrls'],
});


// --- Crops store ---
export const useCropsStore = createRealtimeCollectionStore<CropRecord, Crop>({
  collectionName: 'crops',
  sortField: 'individual',
  processRecords: (records: CropRecord[]) => {
    const processedCrops: Crop[] = records.map((record: CropRecord) => {
      return {
        ...record,
        imageUrl: `http://127.0.0.1:8090/api/files/${record.collectionId}/${record.id}/${record.image}`,
      };
    });
    console.log('Processed crops', processedCrops);

    const uniqueValuesPerField = getUniqueValuesPerField(cropsMetadataFields, processedCrops);
    return { processedRecords: processedCrops, uniqueValuesPerField };
  },
  // For now ignore the image/imageUrl key
  // TODO later maybe convert back from URLs to filenames (and verify what happens in the backend)
  ignoredUpdateKeys: ['image', 'imageUrl'],
});


const handlePocketBaseError = (e: unknown) => {
  if (e instanceof ClientResponseError && e.isAbort) {
    // ignore error due to auto-cancellation (https://github.com/pocketbase/pocketbase/discussions/637#discussioncomment-3728552)
    console.info('This error was caught but ignored:', e)
    return;
  }
  throw e;
}