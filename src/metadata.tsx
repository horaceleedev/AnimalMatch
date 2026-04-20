import { blue, gray, green, orange } from '@ant-design/colors';

import Icon, { CalendarOutlined, ClockCircleOutlined, ColumnHeightOutlined, ColumnWidthOutlined, FileTextOutlined, IdcardOutlined, NumberOutlined, PlaySquareOutlined, TagsOutlined, UserOutlined } from "@ant-design/icons";
import Location from './assets/material_symbols/location_on_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import Forest from './assets/material_symbols/forest_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import CalendarMonth from './assets/material_symbols/calendar_month_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import PIN from './assets/material_symbols/pin_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import Cake from './assets/material_symbols/cake_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import WC from './assets/material_symbols/wc_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import Altitude from './assets/material_symbols/altitude_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react';
import BoundingBoxIcon from "./assets/material_symbols/activity_zone_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react";
import FaceZone from "./assets/material_symbols/familiar_face_and_zone_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react";
import PendingActions from "./assets/material_symbols/pending_actions_24dp_5F6368_FILL0_wght400_GRAD0_opsz24.svg?react";

import { MetadataFieldsType } from './types';

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
  'filepath': {
    displayName: 'Filepath',
    icon: <FileTextOutlined />,
    type: 'text',
    inputType: 'text',
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
  'issues': {
    displayName: 'Issues',
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
  'longitude': {
    displayName: 'Longitude',
    icon: <Icon component={Location} />,
    type: 'number',
    inputType: 'number',
  },
  'latitude': {
    displayName: 'Latitude',
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
  'num_individuals': {
    displayName: 'Number of individuals',
    icon: <NumberOutlined />,
    type: 'number',
    inputType: 'number',
  },
  'custom_tags': {
    displayName: 'Custom tags',
    icon: <TagsOutlined />,
    type: 'multiselect',
    valueEditorType: 'multiselect',
  },
  'assignees': {
    displayName: 'Assignees',
    icon: <UserOutlined />,
    type: 'multiselect',
    valueEditorType: 'multiselect',
    renderType: 'user_label',
  },
  'annotation_status': {
    displayName: 'Annotation status',
    icon: <Icon component={PendingActions} />,
    type: 'select',
    valueEditorType: 'select',
    presetOptions: ['to annotate', 'in progress', 'annotated', 'reviewed'],
    extraData: {
      colorMapping: {
        'to annotate': gray[1],
        'in progress': orange[4],
        'annotated': green[4],
        'reviewed': blue[4],
      }
    },
    renderType: 'annotation_status_label',
  },
};


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
  'created_by': {
    displayName: 'Created by',
    icon: <UserOutlined />,
    type: 'select',
    valueEditorType: 'select',
    renderType: 'user_label',
    isUneditable: true,
  },
  // 'is_identified': {
  //   displayName: 'Is identified',
  //   icon: <QuestionOutlined />,
  //   type: 'boolean',
  //   valueEditorType: 'radio', // TODO change this later
  //   displayBooleanValuesAs: ["Unidentified", "Identified"],
  //   isUneditable: true,
  // },
  'age': {
    displayName: 'Age',
    icon: <Icon component={Cake} />,
    type: 'select',
    valueEditorType: 'select',
    presetOptions: ['infant', 'juvenile', 'adolescent', 'adult', 'unknown age'],
  },
  'sex': {
    displayName: 'Sex',
    icon: <Icon component={WC} />,
    type: 'select',
    valueEditorType: 'select',
    presetOptions: ['male', 'female', 'unknown/other sex'],
  },
  'notes': {
    displayName: 'Notes',
    icon: <FileTextOutlined />,
    type: 'rich_text',
    inputType: 'text',
  },
  'former_ids': {
    displayName: 'Former IDs',
    icon: <IdcardOutlined />,
    type: 'text',
    inputType: 'text',
  },
  'family_group': {
    displayName: 'Family group',
    icon: <IdcardOutlined />,
    type: 'text',
    inputType: 'text',
  },
  'bond_group': {
    displayName: 'Bond group',
    icon: <IdcardOutlined />,
    type: 'text',
    inputType: 'text',
  },
  'issues': {
    displayName: 'Issues',
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
  'created_by': {
    displayName: 'Created by',
    icon: <UserOutlined />,
    type: 'select',
    valueEditorType: 'select',
    renderType: 'user_label',
    isUneditable: true,
  },
  'source_video': {
    displayName: 'Linked video',
    icon: <PlaySquareOutlined />,
    type: 'select',
    valueEditorType: 'select',
    renderType: 'video_link',
    isUneditable: true,
  },
  'individual': {
    displayName: 'Linked individual',
    icon: <IdcardOutlined />,
    type: 'select',
    valueEditorType: 'select',
    renderType: 'individual_link',
    isUneditable: true,
  },
  'body_part': {
    displayName: 'Body part',
    icon: <Icon component={FaceZone} />,
    type: 'select',
    valueEditorType: 'select',
    presetOptions: ['full body', 'face', 'butt', 'ear'],
  },
  'side': {
    displayName: 'Side',
    icon: <Icon component={FaceZone} />,
    type: 'select',
    valueEditorType: 'select',
    presetOptions: ['left', 'right', 'front', 'back'],
  },
  'description': {
    displayName: 'Description',
    icon: <FileTextOutlined />,
    type: 'rich_text',
    inputType: 'text',
  },
  'slide_num': {
    displayName: 'Slide number',
    icon: <NumberOutlined />,
    type: 'number',
    inputType: 'number',
  },
  'custom_tags': {
    displayName: 'Custom tags',
    icon: <TagsOutlined />,
    type: 'multiselect',
    valueEditorType: 'multiselect',
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
  'crop_coordinates': {
    displayName: 'Crop coordinates',
    icon: <Icon component={BoundingBoxIcon} />,
    type: 'text',
    inputType: 'text',
    isUneditable: true,
  },
  'width': {
    displayName: 'Width (px)',
    icon: <ColumnWidthOutlined />,
    type: 'number',
    inputType: 'number',
    isUneditable: true,
  },
  'height': {
    displayName: 'Height (px)',
    icon: <ColumnHeightOutlined />,
    type: 'number',
    inputType: 'number',
    isUneditable: true,
  },
};
