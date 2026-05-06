import { describe, expect, it } from 'vitest';
import type { RuleGroupType, RuleType } from 'react-querybuilder';

import { filterByQuery } from '../../src/lib/filtering/filterEngine';
import type { Crop, Individual, Video } from '../../src/types';

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
  name: 'Asha',
  notes: '',
  sex: 'female',
  updated: '2026-01-01T00:00:00.000Z',
  videos: [],
  ...overrides,
});

const makeCrop = (overrides: Partial<Crop> = {}): Crop => ({
  body_part: 'face',
  collectionId: 'crops',
  collectionName: 'crops',
  created: '2026-01-01T00:00:00.000Z',
  created_by: 'user-1',
  crop_coordinates: [0.1, 0.2, 0.3, 0.4],
  custom_tags: [],
  description: '',
  frame_number: 1,
  height: 300,
  id: 'crop-1',
  image: 'crop.jpg',
  imageUrl: 'https://example.com/crop.jpg',
  individual: 'individual-1',
  side: 'left',
  source_video: 'video-1',
  timestamp: 0.5,
  updated: '2026-01-01T00:00:00.000Z',
  width: 400,
  ...overrides,
});

const videos = [
  makeVideo({
    id: 'v1',
    filename: 'lion-dawn.mp4',
    habitat: 'forest',
    location_name: 'Meru',
    notes: 'Lion near river',
    recording_date: '2026-01-10',
    altitude: 10,
    num_individuals: 2,
    custom_tags: [],
    assignees: [],
    annotation_status: 'to annotate',
  }),
  makeVideo({
    id: 'v2',
    filename: 'elephant-noon.mp4',
    habitat: 'savanna',
    location_name: 'Nairobi',
    notes: 'Elephant herd near waterhole',
    recording_date: '2026-03-05',
    altitude: 120,
    num_individuals: 5,
    custom_tags: ['rare', 'herd'],
    assignees: ['user-1'],
    annotation_status: 'annotated',
  }),
  makeVideo({
    id: 'v3',
    filename: 'baboon-dusk.mp4',
    habitat: 'forest',
    location_name: 'Samburu',
    notes: 'Baboon troop at cliff',
    recording_date: '2026-05-20',
    altitude: 250,
    num_individuals: 3,
    custom_tags: ['cliff'],
    assignees: ['user-2', 'user-3'],
    annotation_status: 'in progress',
  }),
  makeVideo({
    id: 'v4',
    filename: 'hyena-night.mp4',
    habitat: 'wetland',
    location_name: 'Tana',
    notes: '',
    recording_date: '2025-12-31',
    altitude: 80,
    num_individuals: 1,
    custom_tags: ['rare'],
    assignees: [],
    annotation_status: 'reviewed',
  }),
];

const individuals = [
  makeIndividual({
    id: 'i1',
    name: 'Asha',
    created_by: 'user-1',
    videos: ['v1'],
    age: 'adult',
    sex: 'female',
    notes: 'Left ear notch',
    custom_tags: ['matriarch'],
  }),
  makeIndividual({
    id: 'i2',
    name: 'Biko',
    created_by: 'user-2',
    videos: ['v2', 'v3'],
    age: 'juvenile',
    sex: 'male',
    notes: 'Scar on nose',
    custom_tags: [],
  }),
  makeIndividual({
    id: 'i3',
    name: 'Chui',
    created_by: 'user-1',
    videos: ['v4'],
    age: 'adult',
    sex: 'male',
    notes: 'Night visitor',
    custom_tags: ['rare', 'camera-shy'],
  }),
  makeIndividual({
    id: 'i4',
    name: 'Duma',
    created_by: 'user-3',
    videos: [],
    age: 'unknown age',
    sex: 'unknown/other sex',
    notes: '',
    custom_tags: ['released'],
  }),
];

const crops = [
  makeCrop({
    id: 'c1',
    created_by: 'user-1',
    source_video: 'v1',
    individual: 'i1',
    body_part: 'face',
    side: 'left',
    description: 'Close face shot',
    custom_tags: ['clear'],
    frame_number: 10,
    timestamp: 0.5,
    width: 400,
    height: 300,
  }),
  makeCrop({
    id: 'c2',
    created_by: 'user-2',
    source_video: 'v2',
    individual: 'i2',
    body_part: 'ear',
    side: 'right',
    description: 'Right ear profile',
    custom_tags: [],
    frame_number: 24,
    timestamp: 1.2,
    width: 250,
    height: 260,
  }),
  makeCrop({
    id: 'c3',
    created_by: 'user-1',
    source_video: 'v3',
    individual: 'i3',
    body_part: 'full body',
    side: 'front',
    description: 'Front body in shade',
    custom_tags: ['rare', 'blurry'],
    frame_number: 300,
    timestamp: 12.5,
    width: 800,
    height: 600,
  }),
  makeCrop({
    id: 'c4',
    created_by: 'user-3',
    source_video: 'v4',
    individual: 'i3',
    body_part: 'butt',
    side: 'back',
    description: '',
    custom_tags: ['review'],
    frame_number: 180,
    timestamp: 8,
    width: 500,
    height: 450,
  }),
];

const rule = (field: string, operator: string, value: RuleType['value']): RuleType => ({
  field,
  operator,
  value,
});

const andQuery = (...rules: Array<RuleType | RuleGroupType>): RuleGroupType => ({
  combinator: 'and',
  rules,
});

const orQuery = (...rules: Array<RuleType | RuleGroupType>): RuleGroupType => ({
  combinator: 'or',
  rules,
});

const getIds = <T extends { id: string }>(records: T[]) => records.map(record => record.id);

type FilterCase<T extends { id: string }> = {
  expectedIds: string[];
  name: string;
  query: RuleGroupType;
  records: T[];
};

const videoCases: FilterCase<Video>[] = [
  {
    name: 'matches text equality case-insensitively',
    records: videos,
    query: andQuery(rule('filename', '=', 'LION-DAWN.MP4')),
    expectedIds: ['v1'],
  },
  {
    name: 'matches text inequality',
    records: videos,
    query: andQuery(rule('notes', '!=', 'baboon troop at cliff')),
    expectedIds: ['v1', 'v2', 'v4'],
  },
  {
    name: 'matches text contains',
    records: videos,
    query: andQuery(rule('notes', 'contains', 'WATER')),
    expectedIds: ['v2'],
  },
  {
    name: 'matches text does-not-contain',
    records: videos,
    query: andQuery(rule('filename', 'doesNotContain', 'night')),
    expectedIds: ['v1', 'v2', 'v3'],
  },
  {
    name: 'matches text begins-with',
    records: videos,
    query: andQuery(rule('filename', 'beginsWith', 'hyena')),
    expectedIds: ['v4'],
  },
  {
    name: 'matches text ends-with',
    records: videos,
    query: andQuery(rule('filename', 'endsWith', 'DUSK.MP4')),
    expectedIds: ['v3'],
  },
  {
    name: 'matches enum in',
    records: videos,
    query: andQuery(rule('habitat', 'in', ['forest', 'wetland'])),
    expectedIds: ['v1', 'v3', 'v4'],
  },
  {
    name: 'matches enum not-in',
    records: videos,
    query: andQuery(rule('annotation_status', 'notIn', ['annotated', 'reviewed'])),
    expectedIds: ['v1', 'v3'],
  },
  {
    name: 'matches number greater-than',
    records: videos,
    query: andQuery(rule('altitude', '>', 100)),
    expectedIds: ['v2', 'v3'],
  },
  {
    name: 'matches number between',
    records: videos,
    query: andQuery(rule('num_individuals', 'between', [2, 3])),
    expectedIds: ['v1', 'v3'],
  },
  {
    name: 'matches date before',
    records: videos,
    query: andQuery(rule('recording_date', '<', '2026-02-01')),
    expectedIds: ['v1', 'v4'],
  },
  {
    name: 'matches multiselect exact equality',
    records: videos,
    query: andQuery(rule('custom_tags', '=', ['rare'])),
    expectedIds: ['v4'],
  },
  {
    name: 'matches multiselect exact equality with multiple elements',
    records: videos,
    query: andQuery(rule('custom_tags', '=', ['rare', 'herd'])),
    expectedIds: ['v2'],
  },
  {
    name: 'matches multiselect exact equality with order sensitivity',
    records: videos,
    query: andQuery(rule('custom_tags', '=', ['herd', 'rare'])),
    expectedIds: [],
  },
  {
    name: 'matches multiselect in',
    records: videos,
    query: andQuery(rule('custom_tags', 'in', ['rare', 'cliff'])),
    expectedIds: ['v2', 'v3', 'v4'],
  },
  {
    name: 'matches multiselect not-in',
    records: videos,
    query: andQuery(rule('custom_tags', 'notIn', ['rare'])),
    expectedIds: ['v1', 'v3'],
  },
  {
    name: 'matches multiselect all-tags with custom $all operator',
    records: videos,
    query: andQuery(rule('custom_tags', '$all', ['rare', 'herd'])),
    expectedIds: ['v2'],
  },
  {
    name: 'matches multiselect is-empty through empty-array normalization',
    records: videos,
    query: andQuery(rule('custom_tags', 'null', null)),
    expectedIds: ['v1'],
  },
  {
    name: 'matches multiselect is-not-empty through empty-array normalization',
    records: videos,
    query: andQuery(rule('assignees', 'notNull', null)),
    expectedIds: ['v2', 'v3'],
  },
  {
    name: 'matches combined and-conditions',
    records: videos,
    query: andQuery(rule('habitat', '=', 'forest'), rule('num_individuals', '>=', 3)),
    expectedIds: ['v3'],
  },
  {
    name: 'matches combined or-conditions',
    records: videos,
    query: orQuery(rule('annotation_status', '=', 'reviewed'), rule('notes', 'contains', 'lion')),
    expectedIds: ['v1', 'v4'],
  },
  {
    name: 'matches nested groups across operator families',
    records: videos,
    query: andQuery(
      rule('habitat', '=', 'forest'),
      orQuery(rule('custom_tags', 'in', ['cliff']), rule('assignees', 'notNull', null))
    ),
    expectedIds: ['v3'],
  },
];

const individualCases: FilterCase<Individual>[] = [
  {
    name: 'matches text equality case-insensitively',
    records: individuals,
    query: andQuery(rule('name', '=', 'ASHA')),
    expectedIds: ['i1'],
  },
  {
    name: 'matches text contains',
    records: individuals,
    query: andQuery(rule('notes', 'contains', 'scar')),
    expectedIds: ['i2'],
  },
  {
    name: 'matches text does-not-contain',
    records: individuals,
    query: andQuery(rule('notes', 'doesNotContain', 'night')),
    expectedIds: ['i1', 'i2', 'i4'],
  },
  {
    name: 'matches select equality',
    records: individuals,
    query: andQuery(rule('age', '=', 'adult')),
    expectedIds: ['i1', 'i3'],
  },
  {
    name: 'matches select inequality',
    records: individuals,
    query: andQuery(rule('sex', '!=', 'male')),
    expectedIds: ['i1', 'i4'],
  },
  {
    name: 'matches select in',
    records: individuals,
    query: andQuery(rule('created_by', 'in', ['user-1', 'user-3'])),
    expectedIds: ['i1', 'i3', 'i4'],
  },
  {
    name: 'matches multiselect exact equality',
    records: individuals,
    query: andQuery(rule('custom_tags', '=', ['released'])),
    expectedIds: ['i4'],
  },
  {
    name: 'matches multiselect in',
    records: individuals,
    query: andQuery(rule('custom_tags', 'in', ['rare', 'released'])),
    expectedIds: ['i3', 'i4'],
  },
  {
    name: 'matches multiselect not-in',
    records: individuals,
    query: andQuery(rule('custom_tags', 'notIn', ['matriarch'])),
    expectedIds: ['i2', 'i3', 'i4'],
  },
  {
    name: 'matches multiselect all-tags with custom $all operator',
    records: individuals,
    query: andQuery(rule('custom_tags', '$all', ['rare', 'camera-shy'])),
    expectedIds: ['i3'],
  },
  {
    name: 'matches multiselect is-empty through empty-array normalization',
    records: individuals,
    query: andQuery(rule('custom_tags', 'null', null)),
    expectedIds: ['i2'],
  },
  {
    name: 'matches multiselect is-not-empty through empty-array normalization',
    records: individuals,
    query: andQuery(rule('custom_tags', 'notNull', null)),
    expectedIds: ['i1', 'i3', 'i4'],
  },
  {
    name: 'matches combined and-conditions',
    records: individuals,
    query: andQuery(rule('age', '=', 'adult'), rule('sex', '=', 'male')),
    expectedIds: ['i3'],
  },
  {
    name: 'matches nested groups across record fields',
    records: individuals,
    query: orQuery(
      rule('created_by', '=', 'user-1'),
      andQuery(rule('notes', 'contains', 'nose'), rule('sex', '=', 'male'))
    ),
    expectedIds: ['i1', 'i2', 'i3'],
  },
];

const cropCases: FilterCase<Crop>[] = [
  {
    name: 'matches text contains',
    records: crops,
    query: andQuery(rule('description', 'contains', 'profile')),
    expectedIds: ['c2'],
  },
  {
    name: 'matches text ends-with',
    records: crops,
    query: andQuery(rule('description', 'endsWith', 'shade')),
    expectedIds: ['c3'],
  },
  {
    name: 'matches select equality',
    records: crops,
    query: andQuery(rule('body_part', '=', 'face')),
    expectedIds: ['c1'],
  },
  {
    name: 'matches select inequality',
    records: crops,
    query: andQuery(rule('side', '!=', 'left')),
    expectedIds: ['c2', 'c3', 'c4'],
  },
  {
    name: 'matches select in',
    records: crops,
    query: andQuery(rule('source_video', 'in', ['v1', 'v3'])),
    expectedIds: ['c1', 'c3'],
  },
  {
    name: 'matches select not-in',
    records: crops,
    query: andQuery(rule('created_by', 'notIn', ['user-2'])),
    expectedIds: ['c1', 'c3', 'c4'],
  },
  {
    name: 'matches multiselect in',
    records: crops,
    query: andQuery(rule('custom_tags', 'in', ['rare', 'review'])),
    expectedIds: ['c3', 'c4'],
  },
  {
    name: 'matches multiselect all-tags with custom $all operator',
    records: crops,
    query: andQuery(rule('custom_tags', '$all', ['rare', 'blurry'])),
    expectedIds: ['c3'],
  },
  {
    name: 'matches multiselect is-empty through empty-array normalization',
    records: crops,
    query: andQuery(rule('custom_tags', 'null', null)),
    expectedIds: ['c2'],
  },
  {
    name: 'matches number greater-than',
    records: crops,
    query: andQuery(rule('frame_number', '>', 100)),
    expectedIds: ['c3', 'c4'],
  },
  {
    name: 'matches number between',
    records: crops,
    query: andQuery(rule('timestamp', 'between', [1, 10])),
    expectedIds: ['c2', 'c4'],
  },
  {
    name: 'matches combined and-conditions',
    records: crops,
    query: andQuery(
      rule('body_part', '=', 'full body'),
      rule('side', '=', 'front'),
      rule('created_by', '=', 'user-1')
    ),
    expectedIds: ['c3'],
  },
  {
    name: 'matches nested groups across operator families',
    records: crops,
    query: orQuery(rule('description', 'contains', 'face'), rule('custom_tags', 'in', ['review'])),
    expectedIds: ['c1', 'c4'],
  },
];

describe('filterByQuery', () => {
  it('returns the original array reference when there are no rules', () => {
    const query: RuleGroupType = { combinator: 'and', rules: [] };

    expect(filterByQuery(videos, query)).toBe(videos);
  });

  describe('video filters', () => {
    it.each(videoCases)('$name', ({ records, query, expectedIds }) => {
      expect(getIds(filterByQuery(records, query))).toEqual(expectedIds);
    });
  });

  describe('individual filters', () => {
    it.each(individualCases)('$name', ({ records, query, expectedIds }) => {
      expect(getIds(filterByQuery(records, query))).toEqual(expectedIds);
    });
  });

  describe('crop filters', () => {
    it.each(cropCases)('$name', ({ records, query, expectedIds }) => {
      expect(getIds(filterByQuery(records, query))).toEqual(expectedIds);
    });
  });
});
