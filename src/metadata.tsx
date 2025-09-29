import { Editor, type EditorType, type Editors, type ReactElement } from '@revolist/react-datagrid';

import Icon, { CalendarOutlined, ClockCircleOutlined, FileTextOutlined, IdcardOutlined, PlaySquareOutlined, QuestionOutlined, TagsOutlined } from "@ant-design/icons";
import Location from './assets/material_symbols/location_on_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import Forest from './assets/material_symbols/forest_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import CalendarMonth from './assets/material_symbols/calendar_month_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import PIN from './assets/material_symbols/pin_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import Cake from './assets/material_symbols/cake_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import WC from './assets/material_symbols/wc_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import Altitude from './assets/material_symbols/altitude_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import BoundingBoxIcon from "./assets/material_symbols/activity_zone_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react";
import FaceZone from "./assets/material_symbols/familiar_face_and_zone_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react";

import { MetadataFieldsType } from './types';
import { IndividualLinkButton, VideoLinkButton } from './components/smart-components/LinkButtons';

// -------- Column metadata --------

// based on VideoRecord fields (except 'collectionId', 'collectionName', 'created', 'file')
export const videoMetadataFields: MetadataFieldsType = {
  'id': {
    displayName: 'Id',
    icon: <Icon component={PIN} />,
    type: 'text',
    inputType: 'text',
    isInternal: true,
  },
  // 'updated': {
  //   displayName: 'Updated',
  //   icon: <Icon component={CalendarMonth} />,
  //   type: 'date',
  //   inputType: 'date',
  //   isInternal: true,
  // },
  'filename': {
    displayName: 'Filename',
    icon: <FileTextOutlined />,
    type: 'text',
    inputType: 'text',
    isUneditable: true,
  },
  'location_name': {
    displayName: 'Location name',
    icon: <Icon component={Location} />,
    type: 'select',
    valueEditorType: 'select',
  },
  'recording_date': {
    displayName: 'Recording date',
    icon: <Icon component={CalendarMonth} />,
    type: 'date',
    inputType: 'date',
  },
  'notes': {
    displayName: 'Notes',
    icon: <FileTextOutlined />,
    type: 'rich_text',
    inputType: 'text',
  },
  'month_of_SD_retrieval': {
    displayName: 'Month of SD retrieval',
    icon: <CalendarOutlined />,
    type: 'select',
    valueEditorType: 'select',
  },
  'habitat': {
    displayName: 'Habitat',
    icon: <Icon component={Forest} />,
    type: 'select',
    valueEditorType: 'select',
  },
  'utm_easting': {
    displayName: 'UTM easting',
    icon: <Icon component={Location} />,
    type: 'number',
    inputType: 'number',
  },
  'utm_northing': {
    displayName: 'UTM northing',
    icon: <Icon component={Location} />,
    type: 'number',
    inputType: 'number',
  },
  'altitude': {
    displayName: 'Altitude',
    icon: <Icon component={Altitude} />,
    type: 'number',
    inputType: 'number',
  },
  'custom_tags': {
    displayName: 'Custom tags',
    icon: <TagsOutlined />,
    type: 'multiselect',
    valueEditorType: 'multiselect',
  }
};

const CustomEditor = ({ close } : EditorType) => {
  return <button onClick={close}>Close</button>
};
export const CUSTOM_EDITOR_NAME = 'custom-editor';
export const tableColumns = [
  {
    prop: 'url',
    name: 'Video',
    autoSize: true,
    editor: CUSTOM_EDITOR_NAME,
  },
  {
    prop: 'filename',
    name: 'Filename',
    autoSize: true,
    editor: CUSTOM_EDITOR_NAME,
  },
  {
    prop: 'habitat',
    name: 'Habitat',
    autoSize: true,
    editor: CUSTOM_EDITOR_NAME,
  },
  {
    prop: 'id',
    name: 'Id',
    autoSize: true,
    editor: CUSTOM_EDITOR_NAME,
  },
  {
    prop: 'location_name',
    name: 'Location name',
    autoSize: true,
    editor: CUSTOM_EDITOR_NAME,
  },
  {
    prop: 'month_of_SD_retrieval',
    name: 'Month of SD retrieval',
    autoSize: true,
    editor: CUSTOM_EDITOR_NAME,
  },
  {
    prop: 'notes',
    name: 'Notes',
    autoSize: true,
    editor: CUSTOM_EDITOR_NAME,
  },
  {
    prop: 'recording_date',
    name: 'Recording date',
    autoSize: true,
    editor: CUSTOM_EDITOR_NAME,
  },
  {
    prop: 'updated',
    name: 'Updated',
    autoSize: true,
    editor: CUSTOM_EDITOR_NAME,
  },
  {
    prop: 'utm_easting',
    name: 'UTM easting',
    autoSize: true,
    editor: CUSTOM_EDITOR_NAME,
  },
  {
    prop: 'utm_northing',
    name: 'UTM northing',
    autoSize: true,
    editor: CUSTOM_EDITOR_NAME,
  },
  {
    prop: 'altitude',
    name: 'Altitude',
    autoSize: true,
    editor: CUSTOM_EDITOR_NAME,
  },
  {
    prop: 'custom_tags',
    name: 'Custom tags',
    autoSize: true,
    editor: CUSTOM_EDITOR_NAME,
  },
];
export const gridEditors: Editors = { [CUSTOM_EDITOR_NAME]: Editor(CustomEditor) };


export const individualsMetadataFields: MetadataFieldsType = {
  'id': {
    displayName: 'Id',
    icon: <Icon component={PIN} />,
    type: 'text',
    inputType: 'text',
    isInternal: true,
  },
  'name': {
    displayName: 'Name',
    icon: <IdcardOutlined />,
    type: 'text',
    inputType: 'text',
  },
  'is_named': {
    displayName: 'Is identified',
    icon: <QuestionOutlined />,
    type: 'boolean',
    inputType: 'text', // TODO change this later
    displayBooleanValuesAs: ["Unidentified", "Identified"],
    isUneditable: true,
  },
  'age': {
    displayName: 'Age',
    icon: <Icon component={Cake} />,
    type: 'select',
    valueEditorType: 'select',
  },
  'sex': {
    displayName: 'Sex',
    icon: <Icon component={WC} />,
    type: 'select',
    valueEditorType: 'select',
  },
  'notes': {
    displayName: 'Notes',
    icon: <FileTextOutlined />,
    type: 'rich_text',
    inputType: 'text',
  },
  'custom_tags': {
    displayName: 'Custom tags',
    icon: <TagsOutlined />,
    type: 'multiselect',
    valueEditorType: 'multiselect',
  },
};


export const cropsMetadataFields: MetadataFieldsType = {
  'id': {
    displayName: 'Id',
    icon: <Icon component={PIN} />,
    type: 'text',
    inputType: 'text',
    isInternal: true,
  },
  'source_video': {
    displayName: 'Linked video',
    icon: <PlaySquareOutlined />,
    type: 'select',
    valueEditorType: 'select',
    size: 'large',
    labelRender: (option) => <VideoLinkButton id={option.value as string} />,
    isUneditable: true,
  },
  'individual': {
    displayName: 'Linked individual',
    icon: <IdcardOutlined />,
    type: 'select',
    valueEditorType: 'select',
    size: 'large',
    labelRender: (option) => <IndividualLinkButton id={option.value as string} />,
    isUneditable: true,
  },
  'body_part': {
    displayName: 'Body part',
    icon: <Icon component={FaceZone} />,
    type: 'select',
    valueEditorType: 'select',
  },
  'custom_tags': {
    displayName: 'Custom tags',
    icon: <TagsOutlined />,
    type: 'multiselect',
    valueEditorType: 'multiselect',
  },
  'description': {
    displayName: 'Description',
    icon: <FileTextOutlined />,
    type: 'rich_text',
    inputType: 'text',
  },
  'frame_number': {
    displayName: 'Frame number',
    icon: <ClockCircleOutlined />,
    type: 'number',
    inputType: 'number',
    isUneditable: true,
  },
  'timestamp': {
    displayName: 'Timestamp (s)',
    icon: <ClockCircleOutlined />,
    type: 'number',
    inputType: 'number',
    isUneditable: true,
  },
  'bounding_box': {
    displayName: 'Bounding box',
    icon: <Icon component={BoundingBoxIcon} />,
    type: 'text',
    inputType: 'text',
    isUneditable: true,
  },
};
