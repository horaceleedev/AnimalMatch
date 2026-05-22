import { describe, expect, it } from 'vitest';

import {
  ANY_BODY_PART,
  filterCropsByBodyPart,
  getAvailableBodyParts,
  getBodyPartOptions,
  isBodyPartOptionDisabled,
} from '../../src/components/crops/bodyPartFilters';
import type { Crop } from '../../src/types';

const makeCrop = (overrides: Partial<Crop>): Crop => ({
  collectionId: 'crops',
  collectionName: 'crops',
  created: '',
  updated: '',
  id: overrides.id ?? 'crop-id',
  image: '',
  imageUrl: overrides.imageUrl ?? '/crop.jpg',
  created_by: 'user-1',
  source_video: 'video-1',
  individual: overrides.individual ?? 'individual-1',
  body_part: overrides.body_part ?? 'full body',
  side: '',
  custom_tags: [],
  description: '',
  frame_number: 0,
  timestamp: 0,
  crop_coordinates: [0, 0, 1, 1],
  width: 150,
  height: 150,
  ...overrides,
});

describe('body part filter helpers', () => {
  it('builds selector options with the any-body-part option first', () => {
    expect(getBodyPartOptions(['face', 'ear', 'face', '', ANY_BODY_PART])).toEqual([
      ANY_BODY_PART,
      'face',
      'ear',
    ]);
  });

  it('disables unavailable body parts but keeps the any-body-part option enabled', () => {
    const availableBodyParts = new Set(['face']);

    expect(isBodyPartOptionDisabled(ANY_BODY_PART, availableBodyParts)).toBe(false);
    expect(isBodyPartOptionDisabled('face', availableBodyParts)).toBe(false);
    expect(isBodyPartOptionDisabled('ear', availableBodyParts)).toBe(true);
  });

  it('leaves all options enabled when no available-body-parts set is provided', () => {
    expect(isBodyPartOptionDisabled('ear')).toBe(false);
  });

  it('returns every crop when no specific body part is selected', () => {
    const crops = [
      makeCrop({ id: 'full-body-1', body_part: 'full body' }),
      makeCrop({ id: 'face-1', body_part: 'face' }),
    ];

    expect(filterCropsByBodyPart(crops, ANY_BODY_PART)).toBe(crops);
    expect(filterCropsByBodyPart(crops, '')).toBe(crops);
    expect(filterCropsByBodyPart(crops)).toBe(crops);
  });

  it('returns only crops that match the selected body part', () => {
    const crops = [
      makeCrop({ id: 'full-body-1', body_part: 'full body' }),
      makeCrop({ id: 'face-1', body_part: 'face' }),
      makeCrop({ id: 'face-2', body_part: 'face' }),
    ];

    expect(filterCropsByBodyPart(crops, 'face').map(crop => crop.id)).toEqual(['face-1', 'face-2']);
  });

  it('derives the set of available body parts present in the given crops', () => {
    const crops = [
      makeCrop({ id: 'face-1', body_part: 'face' }),
      makeCrop({ id: 'face-2', body_part: 'face' }),
      makeCrop({ id: 'ear-1', body_part: 'ear' }),
      makeCrop({ id: 'empty-1', body_part: '' }),
    ];

    expect(getAvailableBodyParts(crops)).toEqual(new Set(['face', 'ear']));
  });
});
