import { beforeEach, describe, expect, it, vi } from 'vitest';

// not sure I like having to mock all these but alternatives worse?
vi.mock('../../src/lib/importVideoValidation', () => ({
  isValidVideoForImport: vi.fn(),
}));
vi.mock('../../src/lib/fileHashing', () => ({
  hashFileSample: vi.fn(),
}));
vi.mock('../../src/lib/videoThumbnail', () => ({
  createVideoThumbnail: vi.fn(),
}));
vi.mock('../../src/importUploadAdapters', () => ({
  pocketBaseVideoUploadAdapter: { uploadVideo: vi.fn() },
}));
vi.mock('../../src/DataStores', () => ({
  useVideoStore: vi.fn(),
}));

import { isValidVideoForImport } from '../../src/lib/importVideoValidation';
import { hashFileSample } from '../../src/lib/fileHashing';
import { createVideoThumbnail } from '../../src/lib/videoThumbnail';
import { pocketBaseVideoUploadAdapter } from '../../src/importUploadAdapters';
import { useVideoStore } from '../../src/DataStores';
import { fireEvent, renderWithProviders, screen, userEvent, waitFor } from '../helpers/render';
import ImportsPage from '../../src/routes/ImportsPage';

const mockedIsValidVideoForImport = vi.mocked(isValidVideoForImport);
const mockedHashFileSample = vi.mocked(hashFileSample);
const mockedCreateVideoThumbnail = vi.mocked(createVideoThumbnail);
const mockedUploadVideo = vi.mocked(pocketBaseVideoUploadAdapter.uploadVideo);
const mockedUseVideoStore = vi.mocked(useVideoStore);

const makeVideoFile = (filename: string) => new File(['fake video content'], filename, { type: 'video/mp4' });

const addTestVideos = async (filenames: string[]) => {
  renderWithProviders(<ImportsPage />);

  const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
  fireEvent.change(fileInput, { target: { files: filenames.map(makeVideoFile) } });

  for (const filename of filenames) {
    await screen.findByText(filename);
  }
  await waitFor(() => expect(screen.getByRole('button', { name: /Upload/ })).toBeEnabled());
};

describe('ImportsPage retries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedIsValidVideoForImport.mockResolvedValue({ isValid: true, needsWebOptimisation: false });
    // Hash keyed by filename so multiple test videos don't collide as duplicates.
    mockedHashFileSample.mockImplementation(async (file) => ({ hash: `hash-${file.name}`, bytesHashed: file.size }));
    mockedCreateVideoThumbnail.mockResolvedValue(new File(['thumb'], 'thumb.jpg', { type: 'image/jpeg' }));
    mockedUseVideoStore.mockImplementation((selector) => selector({ processedRecords: [] } as never));
  });

  it('shows a retry icon on a failed row, and retries just that video', async () => {
    mockedUploadVideo.mockRejectedValueOnce(new Error('Upload failed'));
    await addTestVideos(['clip.mp4']);

    await userEvent.click(screen.getByRole('button', { name: /Upload/ }));
    await screen.findByText('failed');

    const retryButton = await screen.findByRole('button', { name: /Retry upload for clip\.mp4/ });

    mockedUploadVideo.mockResolvedValueOnce({ id: 'video-1', filename: 'clip.mp4' });
    await userEvent.click(retryButton);

    await screen.findByText('uploaded');
    expect(mockedUploadVideo).toHaveBeenCalledTimes(2);
  });

  it('hides the retry icon again once the retry succeeds', async () => {
    mockedUploadVideo.mockRejectedValueOnce(new Error('Upload failed'));
    await addTestVideos(['clip.mp4']);

    await userEvent.click(screen.getByRole('button', { name: /Upload/ }));
    const retryButton = await screen.findByRole('button', { name: /Retry upload for clip\.mp4/ });

    mockedUploadVideo.mockResolvedValueOnce({ id: 'video-1', filename: 'clip.mp4' });
    await userEvent.click(retryButton);

    await screen.findByText('uploaded');
    expect(screen.queryByRole('button', { name: /Retry upload for clip\.mp4/ })).not.toBeInTheDocument();
  });

  it('retries all failed videos via the batch summary Retry button', async () => {
    mockedUploadVideo.mockRejectedValue(new Error('Upload failed'));
    await addTestVideos(['clip-a.mp4', 'clip-b.mp4']);

    await userEvent.click(screen.getByRole('button', { name: /Upload/ }));
    await waitFor(() => expect(screen.getAllByText('failed')).toHaveLength(2));

    mockedUploadVideo.mockResolvedValue({ id: 'video', filename: 'ok' });
    const retryAllButton = await screen.findByRole('button', { name: /Retry 2 failed/ });
    await userEvent.click(retryAllButton);

    await waitFor(() => expect(screen.getAllByText('uploaded')).toHaveLength(2));
    expect(mockedUploadVideo).toHaveBeenCalledTimes(4);
  });
});
