import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/components/dashboards/QueryOperationsButtons', () => ({
  default: () => <div data-testid="query-operations-buttons" />,
}));

import IndividualsDashboardView from '../../src/components/dashboards/IndividualsDashboardView';
import { individualsMetadataFields } from '../../src/metadata';
import type { Crop, Individual, Video } from '../../src/types';
import { renderWithProviders, screen, userEvent, waitFor } from '../helpers/render';

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

const makeIndividual = (overrides: Partial<Individual>): Individual => ({
  collectionId: 'individuals',
  collectionName: 'individuals',
  created: '',
  updated: '',
  id: overrides.id ?? 'individual-1',
  name: overrides.name ?? 'Individual 1',
  created_by: 'user-1',
  videos: ['video-1'],
  age: 'adult',
  sex: 'female',
  notes: '',
  custom_tags: [],
  crops: [],
  ...overrides,
});

const makeVideo = (overrides: Partial<Video> = {}): Video => ({
  collectionId: 'videos',
  collectionName: 'videos',
  created: '',
  updated: '',
  id: 'video-1',
  filename: 'video.mp4',
  file: '',
  thumbnail: '',
  thumbnailUrl: '',
  url: '',
  habitat: '',
  location_name: '',
  month_of_SD_retrieval: '',
  notes: '',
  recording_date: '',
  utm_easting: 0,
  utm_northing: 0,
  altitude: 0,
  num_individuals: 1,
  custom_tags: [],
  assignees: [],
  annotation_status: '',
  lat: 0,
  long: 0,
  ...overrides,
});

const queryImage = (src: string) => document.querySelector(`img[src="${src}"]`);

describe('IndividualsDashboardView', () => {
  it('filters individual card crop thumbnails by selected body part', async () => {
    const individuals = [
      makeIndividual({
        id: 'individual-1',
        name: 'Individual 1',
        crops: [
          makeCrop({ id: 'full-body-1', imageUrl: '/full-body-1.jpg', individual: 'individual-1', body_part: 'full body' }),
          makeCrop({ id: 'face-1', imageUrl: '/face-1.jpg', individual: 'individual-1', body_part: 'face' }),
        ],
      }),
      makeIndividual({
        id: 'individual-2',
        name: 'Individual 2',
        crops: [
          makeCrop({ id: 'ear-2', imageUrl: '/ear-2.jpg', individual: 'individual-2', body_part: 'ear' }),
        ],
      }),
    ];

    renderWithProviders(
      <IndividualsDashboardView
        individuals={individuals}
        videos={[makeVideo()]}
        uniqueValuesPerField={{}}
        individualsMetadataFields={individualsMetadataFields}
      />
    );

    expect(queryImage('/full-body-1.jpg')).toBeInTheDocument();
    expect(queryImage('/face-1.jpg')).toBeInTheDocument();
    expect(queryImage('/ear-2.jpg')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByText('any body part'));
    await user.click(await screen.findByText('face'));

    await waitFor(() => {
      expect(queryImage('/face-1.jpg')).toBeInTheDocument();
      expect(queryImage('/full-body-1.jpg')).not.toBeInTheDocument();
      expect(queryImage('/ear-2.jpg')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Individual 1')).toBeInTheDocument();
    expect(screen.getByText('Individual 2')).toBeInTheDocument();
  });
});
