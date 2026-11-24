import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Deployment, Individual, MetadataFieldsType, Video } from '../../src/types';
import {
  getUniqueLocationsFromIndividuals,
  getLocationsFromDeployments,
  getUniqueValuesPerField,
  getDeploymentLatLong,
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
  deployment: 'Meru',
  month_of_SD_retrieval: 'January',
  notes: '',
  num_individuals: 1,
  recording_date: '2026-01-01',
  thumbnail: 'thumb.jpg',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  updated: '2026-01-01T00:00:00.000Z',
  url: 'https://example.com/video.mp4',
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

const makeDeployment = (overrides: Partial<Deployment> = {}): Deployment => ({
  id: 'deployment-1',
  collectionId: 'deployments',
  collectionName: 'deployments',
  locationID: '',
  locationName: '',
  latitude: 0,
  longitude: 0,
  deploymentStart: '',
  deploymentEnd: '',
  cameraID: '',
  cameraModel: '',
  habitat: '',
  deploymentComments: '',
  coordinate_system: '',
  utm_easting: 0,
  utm_northing: 0,
  utm_zone: 0,
  utm_hemisphere: '',
  lat: null,
  long: null,
  ...overrides,
});

describe('getDeploymentLatLong', () => {
  it('uses lat/long when coordinate_system is latlong, ignoring UTM fields', () => {
    expect(getDeploymentLatLong(makeDeployment({
      coordinate_system: 'latlong', latitude: 11.5, longitude: -15.6, utm_easting: 500000, utm_northing: 1000000, utm_zone: 29, utm_hemisphere: 'N',
    }))).toEqual([11.5, -15.6]);
    // 0 is a real coordinate once the system is explicit
    expect(getDeploymentLatLong(makeDeployment({ coordinate_system: 'latlong' }))).toEqual([0, 0]);
  });

  it('converts UTM using the stored zone and hemisphere, ignoring lat/long fields', () => {
    // Easting 500000 is the zone's central meridian: zone 29 is centred on -9 degrees longitude
    const [lat, long] = getDeploymentLatLong(makeDeployment({
      coordinate_system: 'utm', latitude: 50, longitude: 50, utm_easting: 500000, utm_northing: 1000000, utm_zone: 29, utm_hemisphere: 'N',
    }))!;
    expect(lat).toBeCloseTo(9.047, 3);
    expect(long).toBeCloseTo(-9, 5);

    const [southLat, southLong] = getDeploymentLatLong(makeDeployment({ coordinate_system: 'utm', utm_easting: 500000, utm_northing: 9000000, utm_zone: 33, utm_hemisphere: 'S' }))!;
    expect(southLat).toBeCloseTo(-9.047, 3);
    expect(southLong).toBeCloseTo(15, 5);
  });

  it('returns null when there are no usable coordinates', () => {
    expect(getDeploymentLatLong(makeDeployment({ latitude: 11.5, longitude: -15.6 }))).toBeNull();
    // UTM without a zone can't be converted
    expect(getDeploymentLatLong(makeDeployment({ coordinate_system: 'utm', utm_easting: 500000, utm_northing: 1000000 }))).toBeNull();
  });
});

describe('getLocationsFromDeployments', () => {
  it('gives one location per deployment with coordinates, keyed by deployment id', () => {
    const locations = getLocationsFromDeployments(
      [
        makeDeployment({ id: 'd1', locationName: 'Meru', cameraID: 'cam-1', lat: 0.123, long: 36.456 }),
        makeDeployment({ id: 'd2', locationName: '', lat: 1.5, long: 37.5 }),
        makeDeployment({ id: 'd3', lat: null, long: null }),
      ],
      [
        makeVideo({ id: 'video-1', deployment: 'd1' }),
        makeVideo({ id: 'video-2', deployment: 'd1' }),
        makeVideo({ id: 'video-3', deployment: 'd3' }),
      ],
    );

    expect(locations).toEqual([
      { id: 'd1', lat: 0.123, long: 36.456, tooltipText: 'Meru · cam-1: 2 videos' },
      { id: 'd2', lat: 1.5, long: 37.5, tooltipText: 'Unnamed location: 0 videos' },
    ]);
  });
});

describe('getUniqueLocationsFromIndividuals', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const deployments = [
    makeDeployment({ id: 'd1', lat: 1.23, long: 36.54 }),
    makeDeployment({ id: 'd2', lat: 2.5, long: 37.5 }),
    makeDeployment({ id: 'd3', lat: null, long: null }),
  ];

  it('returns an empty array and warns when videos are not yet loaded', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const locations = getUniqueLocationsFromIndividuals([
      makeIndividual({ videos: ['video-1'] }),
    ], [], deployments);

    expect(locations).toEqual([]);
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('allVideos is empty'));
  });

  it('logs and skips linked videos that are not found', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const locations = getUniqueLocationsFromIndividuals(
      [makeIndividual({ id: 'individual-1', videos: ['video-1', 'missing-video'] })],
      [makeVideo({ id: 'video-1', deployment: 'd1' })],
      deployments,
    );

    expect(locations).toEqual([
      { id: 'd1', lat: 1.23, long: 36.54, tooltipText: '1 individuals in this location' },
    ]);
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('missing-video'));
  });

  it('groups individuals by the deployments of their linked videos, skipping deployments without coordinates', () => {
    const locations = getUniqueLocationsFromIndividuals(
      [
        makeIndividual({ id: 'individual-1', videos: ['video-1'] }),
        makeIndividual({ id: 'individual-2', videos: ['video-2', 'video-3', 'video-4'] }),
      ],
      [
        makeVideo({ id: 'video-1', deployment: 'd1' }),
        makeVideo({ id: 'video-2', deployment: 'd1' }),
        makeVideo({ id: 'video-3', deployment: 'd2' }),
        makeVideo({ id: 'video-4', deployment: 'd3' }),
      ],
      deployments,
    );

    expect(locations).toEqual([
      { id: 'd1', lat: 1.23, long: 36.54, tooltipText: '2 individuals in this location' },
      { id: 'd2', lat: 2.5, long: 37.5, tooltipText: '1 individuals in this location' },
    ]);
  });

  it('counts an individual once per location even if it appears in several videos there', () => {
    const locations = getUniqueLocationsFromIndividuals(
      [makeIndividual({ id: 'individual-1', videos: ['video-1', 'video-2'] })],
      [
        makeVideo({ id: 'video-1', deployment: 'd1' }),
        makeVideo({ id: 'video-2', deployment: 'd1' }),
      ],
      deployments,
    );

    expect(locations).toEqual([
      { id: 'd1', lat: 1.23, long: 36.54, tooltipText: '1 individuals in this location' },
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
