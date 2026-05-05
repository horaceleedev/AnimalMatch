import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import useSearchFilter from '../../src/hooks/useSearchFilter';
import type { MetadataFieldsType, Video } from '../../src/types';

// Minimal fixture — only the fields the hook actually reads matter for these tests.
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

const metadataFields: MetadataFieldsType = {
  location_name: { displayName: 'Location', type: 'text' },
  habitat: { displayName: 'Habitat', type: 'select' },
  annotation_status: { displayName: 'Annotation status', type: 'select' },
  custom_tags: { displayName: 'Custom tags', type: 'multiselect' },
  num_individuals: { displayName: 'Number of individuals', type: 'number' },
};

const videos = [
  makeVideo({ id: 'v1', location_name: 'Meru', habitat: 'forest', annotation_status: 'to annotate', custom_tags: [] }),
  makeVideo({ id: 'v2', location_name: 'Nairobi', habitat: 'savanna', annotation_status: 'annotated', custom_tags: ['rare'] }),
  makeVideo({ id: 'v3', location_name: 'Mombasa', habitat: 'beach', annotation_status: 'to annotate', custom_tags: ['elephant', 'herd'] }),
];

describe('useSearchFilter', () => {
  it('returns all records when the search query is empty', () => {
    const { result } = renderHook(() => useSearchFilter(videos, metadataFields));

    expect(result.current.filteredRecords).toEqual(videos);
  });

  it('filters records that match the search term (case-insensitive)', () => {
    const { result } = renderHook(() => useSearchFilter(videos, metadataFields));

    act(() => result.current.setSearchQuery('NAIROBI'));

    expect(result.current.filteredRecords).toHaveLength(1);
    expect(result.current.filteredRecords[0].id).toBe('v2');
  });

  it('trims leading and trailing whitespace from the search query', () => {
    const { result } = renderHook(() => useSearchFilter(videos, metadataFields));

    act(() => result.current.setSearchQuery('  meru  '));

    expect(result.current.filteredRecords).toHaveLength(1);
    expect(result.current.filteredRecords[0].id).toBe('v1');
  });

  it('returns multiple records when the term matches more than one', () => {
    const { result } = renderHook(() => useSearchFilter(videos, metadataFields));

    act(() => result.current.setSearchQuery('to annotate'));

    expect(result.current.filteredRecords).toHaveLength(2);
    expect(result.current.filteredRecords.map(v => v.id)).toEqual(['v1', 'v3']);
  });

  it('searches across array-valued fields (multiselect)', () => {
    const { result } = renderHook(() => useSearchFilter(videos, metadataFields));

    act(() => result.current.setSearchQuery('elephant'));

    expect(result.current.filteredRecords).toHaveLength(1);
    expect(result.current.filteredRecords[0].id).toBe('v3');
  });

  it('returns an empty array when no records match', () => {
    const { result } = renderHook(() => useSearchFilter(videos, metadataFields));

    act(() => result.current.setSearchQuery('zzznomatch'));

    expect(result.current.filteredRecords).toHaveLength(0);
  });

  it('resets to all records when the query is cleared', () => {
    const { result } = renderHook(() => useSearchFilter(videos, metadataFields));

    act(() => result.current.setSearchQuery('meru'));
    expect(result.current.filteredRecords).toHaveLength(1);

    act(() => result.current.setSearchQuery(''));
    expect(result.current.filteredRecords).toEqual(videos);
  });

  it('only searches within the declared metadataFields, not every record field', () => {
    // 'filename' is not in metadataFields, so a search for its value should match nothing.
    const videoWithDistinctFilename = makeVideo({ id: 'v4', filename: 'uniquefilename123.mp4', location_name: 'other' });
    const { result } = renderHook(() =>
      useSearchFilter([...videos, videoWithDistinctFilename], metadataFields),
    );

    act(() => result.current.setSearchQuery('uniquefilename123'));

    expect(result.current.filteredRecords).toHaveLength(0);
  });

  it('returns a stable filteredRecords reference when the query is unchanged', () => {
    const { result, rerender } = renderHook(() => useSearchFilter(videos, metadataFields));

    const first = result.current.filteredRecords;
    rerender();
    expect(result.current.filteredRecords).toBe(first);
  });

  it('matches numeric field values when searched as a string', () => {
    const recordsWithNumbers = [
      makeVideo({ id: 'v1', num_individuals: 3 }),
      makeVideo({ id: 'v2', num_individuals: 10 }),
      makeVideo({ id: 'v3', num_individuals: 3 }),
    ];
    const { result } = renderHook(() => useSearchFilter(recordsWithNumbers, metadataFields));

    act(() => result.current.setSearchQuery('10'));

    expect(result.current.filteredRecords).toHaveLength(1);
    expect(result.current.filteredRecords[0].id).toBe('v2');
  });
});
