import { type RecordModel } from 'pocketbase';

export type RecordType = "video" | "individual" | "crop";
export interface RecordDetailModalProps {
  id?: string;
  exitModal?: () => void;
}

export interface UserRecord extends RecordModel {
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  id: string;
  username: string;
  verified: boolean;
  emailVisibility: boolean;
  email: string;
  name: string;
  avatar: string;
};
export interface User extends UserRecord {
  avatarUrl: string;
};

export interface VideoRecord extends RecordModel {
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  id: string;
  filename: string;
  file: string;
  thumbnail: string;
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
  thumbnailUrl: string;
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
  created_by: string;
  is_identified: boolean;
  videos: string[];
  age: string;
  sex: string;
  notes: string;
  custom_tags: string[];
};
export interface Individual extends IndividualRecord {
  crops: Crop[];
};

export interface CropRecord extends RecordModel {
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  id: string;
  image: string | Blob | File;
  created_by: string;
  source_video: string;
  individual: string;
  body_part: string;
  custom_tags: string[];
  description: string;
  frame_number: number;
  timestamp: number;
  bounding_box: [number, number, number, number]; // l, t, w, h normalized
};
export interface Crop extends CropRecord {
  imageUrl: string;
};

export type MetadataFieldsType = Record<string, {
  displayName: string;
  icon?: JSX.Element;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'rich_text';
  inputType?: string;
  valueEditorType?: string;
  presetOptions?: string[];
  renderType?: 'user_label' | 'video_link' | 'individual_link';
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