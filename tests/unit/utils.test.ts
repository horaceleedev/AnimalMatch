import { describe, expect, it } from 'vitest';

import type { Video } from '../../src/types';
import { getUniqueLocationsFromVideos } from '../../src/utils/utils';

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
