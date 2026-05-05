import { describe, expect, it } from 'vitest';

import type { MetadataFieldsType, Video } from '../../src/types';
import {
  getMultiselectValueCounts,
  getSharedStringArrayValue,
  getSharedStringValue,
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
});

describe('getMultiselectValueCounts', () => {
  it('counts how many records contain each multiselect value', () => {
    const counts = getMultiselectValueCounts([
      { custom_tags: ['ear', 'tail', null] },
      { custom_tags: ['tail'] },
      { custom_tags: undefined },
      { custom_tags: ['ear'] },
    ], 'custom_tags');

    expect(counts).toEqual({
      ear: 2,
      tail: 2,
    });
  });
});

describe('getSharedStringValue', () => {
  it('returns the shared value when every entry matches', () => {
    expect(getSharedStringValue(['annotated', 'annotated'])).toEqual({
      value: 'annotated',
      isMixed: false,
    });
  });

  it('returns a mixed state when entries differ', () => {
    expect(getSharedStringValue(['annotated', 'to annotate'])).toEqual({
      value: undefined,
      isMixed: true,
    });
  });
});

describe('getSharedStringArrayValue', () => {
  it('returns the shared sorted array when every entry matches', () => {
    expect(
      getSharedStringArrayValue([
        ['bob', 'alice'],
        ['alice', 'bob'],
      ]),
    ).toEqual({
      value: ['alice', 'bob'],
      isMixed: false,
    });
  });

  it('returns a mixed state when array contents differ', () => {
    expect(
      getSharedStringArrayValue([
        ['alice'],
        ['bob'],
      ]),
    ).toEqual({
      value: [],
      isMixed: true,
    });
  });
});
