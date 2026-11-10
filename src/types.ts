import { type RecordModel } from 'pocketbase';
import { type ValueEditorType } from 'react-querybuilder';

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

export type CoordinateSystem = 'latlong' | 'utm';

export interface VideoRecord extends RecordModel {
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  id: string;
  filename: string;
  file: string;
  thumbnail: string;
  location_name: string;
  notes: string;
  recording_date: string;
  utm_easting: number;
  utm_northing: number;
  coordinate_system: '' | CoordinateSystem;
  utm_zone: number;
  utm_hemisphere: '' | 'N' | 'S';
  latitude: number;
  longitude: number;
  custom_tags: string[];
  assignees: string[];
  annotation_status: string;
};
export interface Video extends VideoRecord {
  url: string;
  thumbnailUrl: string;
  // Derived from latitude/longitude or UTM fields, only used for the map; null if the video has no coordinates
  lat: number | null;
  long: number | null;
};

export interface IndividualRecord extends RecordModel {
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  id: string;
  name: string;
  created_by: string;
  // is_identified: boolean;
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
  side: string;
  custom_tags: string[];
  description: string;
  frame_number: number;
  timestamp: number;
  crop_coordinates: [number, number, number, number]; // l, t, w, h normalized
  width: number; // width of crop image in px
  height: number; // height of crop image in px
};
export interface Crop extends CropRecord {
  imageUrl: string;
};

export type MetadataFieldsType = Record<string, {
  displayName: string;
  icon?: JSX.Element;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'rich_text';
  inputType?: string;
  valueEditorType?: ValueEditorType;
  presetOptions?: string[];
  extraData?: Record<string, any>;
  renderType?: 'user_label' | 'video_link' | 'individual_link' | 'annotation_status_label';
  displayBooleanValuesAs?: string[];
  allowAddingNewOptions?: boolean;
  isInternal?: boolean;
  isUneditable?: boolean;
  // Only shown in the edit form when the record's coordinate_system matches
  coordinateSystem?: CoordinateSystem;
}>;

export interface LocationInfo {
  id: string;
  lat: number;
  long: number;
  tooltipText: string;
};