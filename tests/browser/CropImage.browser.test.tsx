import { expect, test, vi } from 'vitest';
import { ClientResponseError } from 'pocketbase';
import { Link, useLocation } from 'react-router-dom';

import { renderWithProviders } from '../helpers/browserRender';
import type { Crop } from '../../src/types';

// The crops store talks to PocketBase at import time, so stub the whole module and
// assert on what CropImage does with the update promise it gets back.
const { updateCrop } = vi.hoisted(() => ({ updateCrop: vi.fn() }));

vi.mock('../../src/DataStores.tsx', () => ({
  useCropsStore: (selector: (state: { update: typeof updateCrop }) => unknown) =>
    selector({ update: updateCrop }),
}));

// Imported after the mock so CropImage picks up the stubbed store.
const { default: CropImage } = await import('../../src/components/smart-components/CropImage');

// A 1x1 transparent gif, so the test never depends on a real crop image being served.
const TRANSPARENT_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const buildCrop = (overrides: Partial<Crop> = {}): Crop => ({
  collectionId: 'am_crops',
  collectionName: 'crops',
  created: '2026-01-01 00:00:00Z',
  updated: '2026-01-01 00:00:00Z',
  id: 'crop-1',
  image: 'crop.jpg',
  created_by: 'user-1',
  source_video: 'video-1',
  individual: 'individual-1',
  body_part: 'face',
  side: 'left',
  custom_tags: [],
  description: '',
  frame_number: 0,
  timestamp: 0,
  crop_coordinates: [0, 0, 1, 1],
  width: 100,
  height: 100,
  is_pinned: false,
  imageUrl: TRANSPARENT_GIF,
  ...overrides,
});

test('hides the pin button unless the caller opts in', async () => {
  const screen = await renderWithProviders(<CropImage crop={buildCrop()} />);

  await expect.element(screen.getByRole('img')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Pin crop' }).query()).toBeNull();
});

test('pins a crop without interrupting the user on success', async () => {
  updateCrop.mockResolvedValue(undefined);

  const screen = await renderWithProviders(<CropImage crop={buildCrop()} showPinButton />);

  await screen.getByRole('button', { name: 'Pin crop' }).click();

  expect(updateCrop).toHaveBeenCalledWith('crop-1', { is_pinned: true });
  // The icon flipping is the confirmation, so there should be no toast to dismiss.
  expect(document.querySelector('.ant-message-notice')).toBeNull();
});

test('unpins an already pinned crop', async () => {
  updateCrop.mockResolvedValue(undefined);

  const screen = await renderWithProviders(
    <CropImage crop={buildCrop({ is_pinned: true })} showPinButton />,
  );

  await screen.getByRole('button', { name: 'Unpin crop' }).click();

  expect(updateCrop).toHaveBeenCalledWith('crop-1', { is_pinned: false });
});

test('reports the server error when the user is not allowed to pin', async () => {
  updateCrop.mockRejectedValue(
    new ClientResponseError({ status: 403, response: { message: 'Only editors can make changes.' } }),
  );

  const screen = await renderWithProviders(<CropImage crop={buildCrop()} showPinButton />);

  await screen.getByRole('button', { name: 'Pin crop' }).click();

  await expect.element(screen.getByText('Only editors can make changes.')).toBeVisible();
});

test('falls back to a generic message when the server cannot be reached', async () => {
  updateCrop.mockRejectedValue(new Error('Failed to fetch'));

  const screen = await renderWithProviders(<CropImage crop={buildCrop()} showPinButton />);

  await screen.getByRole('button', { name: 'Pin crop' }).click();

  await expect.element(
    screen.getByText('Unable to pin this crop. Please try again later.'),
  ).toBeVisible();
});

test('blocks a second click while the first request is still in flight', async () => {
  let finishUpdate!: () => void;
  updateCrop.mockReturnValue(new Promise<void>((resolve) => { finishUpdate = () => resolve(); }));

  const screen = await renderWithProviders(<CropImage crop={buildCrop()} showPinButton />);
  const pin = screen.getByRole('button', { name: 'Pin crop' });

  await pin.click();

  // Disabled is what stops a second request going out; a click can't land while it holds.
  await expect.element(pin).toBeDisabled();

  finishUpdate();
  await expect.element(pin).toBeEnabled();
});

test('pinning does not follow the link wrapping the crop', async () => {
  updateCrop.mockResolvedValue(undefined);
  const CurrentPath = () => <span data-testid="path">{useLocation().pathname}</span>;

  const screen = await renderWithProviders(
    <>
      <Link to="/crops/crop-1">
        <CropImage crop={buildCrop()} showPinButton />
      </Link>
      <CurrentPath />
    </>,
  );

  await screen.getByRole('button', { name: 'Pin crop' }).click();

  expect(updateCrop).toHaveBeenCalledWith('crop-1', { is_pinned: true });
  await expect.element(screen.getByTestId('path')).toHaveTextContent('/');
});

test('stays quiet when PocketBase auto-cancels a superseded request', async () => {
  updateCrop.mockRejectedValue(new ClientResponseError({ isAbort: true }));

  const screen = await renderWithProviders(<CropImage crop={buildCrop()} showPinButton />);

  await screen.getByRole('button', { name: 'Pin crop' }).click();

  expect(document.querySelector('.ant-message-notice')).toBeNull();
});
