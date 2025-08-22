import { type RecordModel } from 'pocketbase';

export interface VideoRecord extends RecordModel {
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  id: string;
  file: string;
  filename: string;
  habitat: string;
  location_name: string;
  month_of_SD_retrieval: string;
  notes: string;
  recording_date: string;
  utm_easting: number;
  utm_northing: number;
  custom_tags: string[];
};
export interface Video extends VideoRecord {
  url: string;
  lat: number;
  long: number;
};

export interface IndividualRecord extends RecordModel {
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  id: string;
  name: string;
  is_named: boolean;
  videos: string[];
  images: string[];
  age: string;
  sex: string;
  notes: string;
  custom_tags: string[];
};
export interface Individual extends IndividualRecord {
  imageUrls: string[];
};

export type MetadataFieldsType = Record<string, {
  displayName: string;
  icon?: JSX.Element;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'rich_text';
  inputType?: string;
  valueEditorType?: string;
  displayBooleanValuesAs?: string[];
  isInternal?: boolean;
  isUneditable?: boolean;
}>;

export interface LocationInfo {
  id: string;
  lat: number;
  long: number;
  tooltipText: string;
};