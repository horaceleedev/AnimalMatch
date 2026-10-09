import { describe, expect, it, vi } from 'vitest';

import type { Individual, MetadataFieldsType, Video } from '../../src/types';
import {
  getUniqueLocationsFromIndividuals,
  getUniqueLocationsFromVideos,
  getUniqueValuesPerField,
} from '../../src/utils/utils';

// This is an example of a pure unit test, identical to unit tests in any non frontend codebase.
// Just some representative input data and an assertion on the returned value.
const makeVideo = (overrides: Partial<Video> = {}): Video => ({
  altitude: 0,
  annotation_status: 'to annotate',
  assignees: [],
  collectionId: 'videos',
  collectionName: 'videos',
  created: '2026-01-01T00:00:00.000Z',
  custom_tags: [],
  file: 'video.mp4',
  filename: 'video.mp4',
  habitat: 'forest',
  id: 'video-1',
  lat: 0,
  location_name: 'Meru',
  long: 0,
  month_of_SD_retrieval: 'January',
  notes: '',
  num_individuals: 1,
  recording_date: '2026-01-01',
  thumbnail: 'thumb.jpg',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  updated: '2026-01-01T00:00:00.000Z',
  url: 'https://example.com/video.mp4',
  utm_easting: 0,
  utm_northing: 0,
  ...overrides,
});

const makeIndividual = (overrides: Partial<Individual> = {}): Individual => ({
  age: 'adult',
  collectionId: 'individuals',
  collectionName: 'individuals',
  created: '2026-01-01T00:00:00.000Z',
  created_by: 'user-1',
  crops: [],
  custom_tags: [],
  id: 'individual-1',
  name: 'Milo',
  notes: '',
  sex: 'unknown',
  updated: '2026-01-01T00:00:00.000Z',
  videos: [],
  ...overrides,
});

describe('getUniqueLocationsFromVideos', () => {
  // A small fixture builder like makeVideo keeps the test focused on the fields that matter for this behaviour.
  it('groups videos that share the same coordinates', () => {
    const locations = getUniqueLocationsFromVideos([
      makeVideo({ id: 'video-1', lat: 0.123, long: 36.456 }),
      makeVideo({ id: 'video-2', lat: 0.123, long: 36.456 }),
      makeVideo({ id: 'video-3', lat: 1.5, long: 37.5 }),
    ]);

    // For a pure function test we usually assert directly on the returned structure.
    expect(locations).toEqual([
      {
        id: '[0.123,36.456]',
        lat: 0.123,
        long: 36.456,
        tooltipText: '2 videos in this location',
      },
      {
        id: '[1.5,37.5]',
        lat: 1.5,
        long: 37.5,
        tooltipText: '1 videos in this location',
      },
    ]);
  });
});

describe('getUniqueLocationsFromIndividuals', () => {
  it('returns an empty array and warns when videos are not yet loaded', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const locations = getUniqueLocationsFromIndividuals([
      makeIndividual({ videos: ['video-1'] }),
    ], []);

    expect(locations).toEqual([]);
    expect(consoleWarn).toHaveBeenCalledWith(
      'Warning when computing individual locations: allVideos is empty (possibly because videos are still loading), returning empty unique locations',
    );
  });

  it('logs missing linked videos and groups the remaining linked video locations', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const locations = getUniqueLocationsFromIndividuals(
      [
        makeIndividual({ id: 'individual-1', videos: ['video-1', 'missing-video'] }),
        makeIndividual({ id: 'individual-2', videos: ['video-2', 'video-3'] }),
      ],
      [
        makeVideo({ id: 'video-1', lat: 1.23, long: 36.54 }),
        makeVideo({ id: 'video-2', lat: 1.23, long: 36.54 }),
        makeVideo({ id: 'video-3', lat: 2.5, long: 37.5 }),
      ],
    );

    expect(locations).toEqual([
      {
        id: '[1.23,36.54]',
        lat: 1.23,
        long: 36.54,
        tooltipText: '2 individuals in this location',
      },
      {
        id: '[2.5,37.5]',
        lat: 2.5,
        long: 37.5,
        tooltipText: '1 individuals in this location',
      },
    ]);
    expect(consoleError).toHaveBeenCalledWith(
      'Error when computing individual locations: video missing-video not found',
    );
  });
});

describe('getUniqueValuesPerField', () => {
  it('filters nullish values out of select and multiselect fields', () => {
    const metadataFields: MetadataFieldsType = {
      side: {
        displayName: 'Side',
        type: 'select',
        valueEditorType: 'select',
      },
      custom_tags: {
        displayName: 'Custom tags',
        type: 'multiselect',
        valueEditorType: 'multiselect',
      },
    };

    const uniqueValues = getUniqueValuesPerField(metadataFields, [
      { side: 'left', custom_tags: ['ear', null] },
      { side: null, custom_tags: ['tail', undefined] },
      { side: 'right', custom_tags: null },
    ]);

    expect(uniqueValues).toEqual({
      side: ['left', 'right'],
      custom_tags: ['ear', 'tail'],
    });
  });

  it('uses preset select options instead of deriving them from records', () => {
    const metadataFields: MetadataFieldsType = {
      annotation_status: {
        displayName: 'Annotation status',
        type: 'select',
        valueEditorType: 'select',
        presetOptions: ['annotated', 'to annotate', 'validated'],
      },
    };

    const uniqueValues = getUniqueValuesPerField(metadataFields, [
      { annotation_status: 'to annotate' },
      { annotation_status: 'unexpected value' },
    ]);

    expect(uniqueValues).toEqual({
      annotation_status: ['annotated', 'to annotate', 'validated'],
    });
  });

  it('sorts unique select and multiselect values alphabetically and ignores non-strings', () => {
    const metadataFields: MetadataFieldsType = {
      habitat: {
        displayName: 'Habitat',
        type: 'select',
        valueEditorType: 'select',
      },
      custom_tags: {
        displayName: 'Custom tags',
        type: 'multiselect',
        valueEditorType: 'multiselect',
      },
    };

    const uniqueValues = getUniqueValuesPerField(metadataFields, [
      { habitat: 'savanna', custom_tags: ['zebra', 'alpha', 1] },
      { habitat: 'forest', custom_tags: ['beta', 'alpha', false] },
      { habitat: 'savanna', custom_tags: undefined },
      { habitat: 10, custom_tags: ['zebra'] },
    ]);

    expect(uniqueValues).toEqual({
      habitat: ['forest', 'savanna'],
      custom_tags: ['alpha', 'beta', 'zebra'],
    });
  });
});
