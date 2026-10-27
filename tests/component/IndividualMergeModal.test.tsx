import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientResponseError } from 'pocketbase';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const updateCrop = vi.fn().mockResolvedValue(undefined);
const updateIndividual = vi.fn().mockResolvedValue(undefined);
const deleteIndividual = vi.fn().mockResolvedValue(undefined);

type CropsStoreState = { update: typeof updateCrop };
type IndividualsStoreState = { update: typeof updateIndividual; delete: typeof deleteIndividual };

vi.mock('../../src/DataStores', () => ({
  useCropsStore: (selector: (state: CropsStoreState) => unknown) => selector({ update: updateCrop }),
  useIndividualsStore: (selector: (state: IndividualsStoreState) => unknown) => selector({
    update: updateIndividual,
    delete: deleteIndividual,
  }),
  // Used by IndividualLinkButton to render the source/target cards.
  useIndividualsStoreWithCrops: () => ({
    individuals: [
      { id: 'individual-source', name: 'Source Individual', crops: [] },
      { id: 'individual-target', name: 'Target Individual', crops: [] },
    ],
  }),
}));

import { renderWithProviders, screen, userEvent, waitFor } from '../helpers/render';
import IndividualMergeModal from '../../src/components/smart-components/IndividualMergeModal';
import type { Individual } from '../../src/types';

const makeIndividual = (overrides: Partial<Individual> = {}): Individual => ({
  id: 'individual-1',
  collectionId: 'individuals',
  collectionName: 'individuals',
  created: '',
  updated: '',
  name: 'Individual',
  created_by: '',
  videos: [],
  age: '',
  sex: '',
  notes: '',
  custom_tags: [],
  crops: [],
  ...overrides,
});

describe('IndividualMergeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges the source individual into the target and navigates to it', async () => {
    const setIsOpen = vi.fn();
    const source = makeIndividual({
      id: 'individual-source',
      name: 'Source Individual',
      videos: ['video-1', 'video-2'],
      crops: [
        { id: 'crop-1', individual: 'individual-source' } as Individual['crops'][number],
        { id: 'crop-2', individual: 'individual-source' } as Individual['crops'][number],
      ],
    });
    const target = makeIndividual({ id: 'individual-target', name: 'Target Individual' });

    const user = userEvent.setup();
    renderWithProviders(
      <IndividualMergeModal
        isOpen
        setIsOpen={setIsOpen}
        leftIndividual={source}
        rightIndividual={target}
      />,
    );

    await user.click(screen.getByRole('button', { name: /merge individuals/i }));

    await waitFor(() => {
      expect(updateCrop).toHaveBeenCalledWith('crop-1', { individual: 'individual-target' });
      expect(updateCrop).toHaveBeenCalledWith('crop-2', { individual: 'individual-target' });
      expect(updateIndividual).toHaveBeenCalledWith('individual-target', {
        'videos+': ['video-1', 'video-2'],
      });
      expect(deleteIndividual).toHaveBeenCalledWith('individual-source');
      expect(setIsOpen).toHaveBeenCalledWith(false);
      expect(mockNavigate).toHaveBeenCalledWith('/individuals/individual-target');
    });
  });

  it('swaps source and target when the swap button is clicked', async () => {
    const setIsOpen = vi.fn();
    const left = makeIndividual({ id: 'individual-left', name: 'Left', videos: ['video-left'] });
    const right = makeIndividual({ id: 'individual-right', name: 'Right', videos: ['video-right'] });

    const user = userEvent.setup();
    renderWithProviders(
      <IndividualMergeModal
        isOpen
        setIsOpen={setIsOpen}
        leftIndividual={left}
        rightIndividual={right}
      />,
    );

    // By default left is the source, right is the target.
    await user.click(screen.getByRole('button', { name: /swap source and target/i }));
    await user.click(screen.getByRole('button', { name: /merge individuals/i }));

    // After swapping, "right" becomes the source (deleted) and "left" becomes the target (kept).
    await waitFor(() => {
      expect(updateIndividual).toHaveBeenCalledWith('individual-left', {
        'videos+': ['video-right'],
      });
      expect(deleteIndividual).toHaveBeenCalledWith('individual-right');
      expect(mockNavigate).toHaveBeenCalledWith('/individuals/individual-left');
    });
  });

  it('shows an error message and keeps the modal open when the merge fails', async () => {
    deleteIndividual.mockRejectedValueOnce(
      new ClientResponseError({ response: { message: 'Cannot delete individual' }, status: 400 }),
    );
    const setIsOpen = vi.fn();
    const source = makeIndividual({ id: 'individual-source', name: 'Source Individual' });
    const target = makeIndividual({ id: 'individual-target', name: 'Target Individual' });

    const user = userEvent.setup();
    renderWithProviders(
      <IndividualMergeModal
        isOpen
        setIsOpen={setIsOpen}
        leftIndividual={source}
        rightIndividual={target}
      />,
    );

    await user.click(screen.getByRole('button', { name: /merge individuals/i }));

    expect(await screen.findByText('Cannot delete individual')).toBeInTheDocument();
    expect(setIsOpen).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders nothing when either individual is missing', () => {
    renderWithProviders(
      <IndividualMergeModal isOpen setIsOpen={vi.fn()} leftIndividual={undefined} rightIndividual={undefined} />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
