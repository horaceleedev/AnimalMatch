import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Link } from 'react-router-dom';

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
vi.mock('../../src/lib/optimiseMp4ForWeb', () => ({
  optimiseMp4ForWeb: vi.fn(),
}));
vi.mock('../../src/lib/readDroppedFiles', () => ({
  readDroppedFiles: vi.fn(),
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
import { optimiseMp4ForWeb } from '../../src/lib/optimiseMp4ForWeb';
import { readDroppedFiles } from '../../src/lib/readDroppedFiles';
import { pocketBaseVideoUploadAdapter } from '../../src/importUploadAdapters';
import { useVideoStore } from '../../src/DataStores';
import { fireEvent, renderWithProviders, screen, userEvent, waitFor, within } from '../helpers/render';
import ImportsPage from '../../src/routes/ImportsPage';

const mockedIsValidVideoForImport = vi.mocked(isValidVideoForImport);
const mockedHashFileSample = vi.mocked(hashFileSample);
const mockedCreateVideoThumbnail = vi.mocked(createVideoThumbnail);
const mockedOptimiseMp4ForWeb = vi.mocked(optimiseMp4ForWeb);
const mockedReadDroppedFiles = vi.mocked(readDroppedFiles);
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

  it('auto-uploads a video added to the batch after Upload was pressed, without pressing Upload again', async () => {
    mockedUploadVideo.mockResolvedValue({ id: 'video', filename: 'ok' });

    await addTestVideos(['clip-a.mp4']);
    await userEvent.click(screen.getByRole('button', { name: /Upload/ }));
    await waitFor(() => expect(screen.getAllByText('uploaded')).toHaveLength(1));

    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeVideoFile('clip-b.mp4')] } });
    await screen.findByText('clip-b.mp4');

    await waitFor(() => expect(screen.getAllByText('uploaded')).toHaveLength(2));
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

  it('does not show a retry icon for a video that failed validation', async () => {
    mockedIsValidVideoForImport.mockResolvedValueOnce({ isValid: false, message: 'Unsupported video codec.' });

    renderWithProviders(<ImportsPage />);
    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeVideoFile('bad.mp4')] } });

    await screen.findByText('invalid');

    expect(screen.getByRole('button', { name: /Upload/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Retry upload for bad\.mp4/ })).not.toBeInTheDocument();
    expect(mockedUploadVideo).not.toHaveBeenCalled();
  });

  it('retries only the genuine upload failure when a batch also has a validation failure', async () => {
    mockedIsValidVideoForImport.mockImplementation(async (file) => (
      file.name === 'bad.mp4'
        ? { isValid: false, message: 'Unsupported video codec.' }
        : { isValid: true, needsWebOptimisation: false }
    ));
    mockedUploadVideo.mockRejectedValueOnce(new Error('Upload failed'));

    renderWithProviders(<ImportsPage />);
    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeVideoFile('good.mp4'), makeVideoFile('bad.mp4')] } });

    await screen.findByText('invalid');
    await waitFor(() => expect(screen.getByRole('button', { name: /Upload/ })).toBeEnabled());

    await userEvent.click(screen.getByRole('button', { name: /Upload/ }));
    await screen.findByText('failed');

    const retryAllButton = await screen.findByRole('button', { name: /Retry 1 failed/ });
    expect(screen.queryByRole('button', { name: /Retry upload for bad\.mp4/ })).not.toBeInTheDocument();

    mockedUploadVideo.mockResolvedValueOnce({ id: 'video-1', filename: 'good.mp4' });
    await userEvent.click(retryAllButton);

    await screen.findByText('uploaded');
    expect(mockedUploadVideo).toHaveBeenCalledTimes(2);
  });

  it('optimises a video for web playback before it becomes ready to upload', async () => {
    const optimisedFile = new File(['optimised content'], 'clip.mp4', { type: 'video/mp4' });
    mockedIsValidVideoForImport
      .mockResolvedValueOnce({ isValid: true, needsWebOptimisation: true, message: 'This MP4 is not web-optimised.' })
      .mockResolvedValueOnce({ isValid: true });
    mockedOptimiseMp4ForWeb.mockResolvedValueOnce({ file: optimisedFile, wasOptimised: true });

    await addTestVideos(['clip.mp4']);

    expect(mockedOptimiseMp4ForWeb).toHaveBeenCalledTimes(1);
    expect(screen.getByText('valid')).toBeInTheDocument();
  });

  it('marks a video invalid if the optimised file still fails validation', async () => {
    const optimisedFile = new File(['still broken'], 'clip.mp4', { type: 'video/mp4' });
    mockedIsValidVideoForImport
      .mockResolvedValueOnce({ isValid: true, needsWebOptimisation: true, message: 'This MP4 is not web-optimised.' })
      .mockResolvedValueOnce({ isValid: false, message: 'This file could not be read as a valid MP4.' });
    mockedOptimiseMp4ForWeb.mockResolvedValueOnce({ file: optimisedFile, wasOptimised: true });

    renderWithProviders(<ImportsPage />);
    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeVideoFile('clip.mp4')] } });

    await screen.findByText('invalid');
    expect(screen.getByRole('button', { name: /Upload/ })).toBeDisabled();
    expect(mockedUploadVideo).not.toHaveBeenCalled();
  });

  it('marks a video invalid if web optimisation itself throws', async () => {
    mockedIsValidVideoForImport.mockResolvedValueOnce({
      isValid: true,
      needsWebOptimisation: true,
      message: 'This MP4 is not web-optimised.',
    });
    mockedOptimiseMp4ForWeb.mockRejectedValueOnce(new Error('MP4 chunk offsets are too large to optimise in the browser.'));

    renderWithProviders(<ImportsPage />);
    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeVideoFile('clip.mp4')] } });

    await screen.findByText('invalid');
    expect(screen.getByRole('button', { name: /Upload/ })).toBeDisabled();
    expect(mockedUploadVideo).not.toHaveBeenCalled();
  });

  it('flags a duplicate video within the same batch and only uploads the first copy', async () => {
    mockedHashFileSample.mockResolvedValue({ hash: 'same-hash', bytesHashed: 100 });
    mockedUploadVideo.mockResolvedValueOnce({ id: 'video-1', filename: 'first.mp4' });

    await addTestVideos(['first.mp4', 'second.mp4']);

    expect(screen.getByText('duplicate video')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Upload/ }));

    await screen.findByText('uploaded');
    expect(mockedUploadVideo).toHaveBeenCalledTimes(1);
    expect(mockedUploadVideo).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'first.mp4' }),
      expect.any(Function),
      expect.any(AbortSignal),
    );
  });

  it('skips thumbnail generation for a duplicate video, since it will never be uploaded', async () => {
    mockedHashFileSample.mockResolvedValue({ hash: 'same-hash', bytesHashed: 100 });

    await addTestVideos(['first.mp4', 'second.mp4']);

    expect(screen.getByText('duplicate video')).toBeInTheDocument();
    expect(mockedCreateVideoThumbnail).toHaveBeenCalledTimes(1);
    expect(mockedCreateVideoThumbnail).toHaveBeenCalledWith(expect.objectContaining({ name: 'first.mp4' }));
  });

  it('lazily creates a thumbnail when a duplicate is selected as the keeper', async () => {
    mockedHashFileSample.mockResolvedValue({ hash: 'same-hash', bytesHashed: 100 });
    mockedUploadVideo.mockResolvedValueOnce({ id: 'video-2', filename: 'second.mp4' });

    await addTestVideos(['first.mp4', 'second.mp4']);
    expect(mockedCreateVideoThumbnail).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByText('Use this file instead'));

    await waitFor(() => expect(mockedCreateVideoThumbnail).toHaveBeenCalledTimes(2));
    expect(mockedCreateVideoThumbnail).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'second.mp4' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Upload/ })).toBeEnabled());

    await userEvent.click(screen.getByRole('button', { name: /Upload/ }));
    await screen.findByText('uploaded');

    expect(mockedUploadVideo).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'second.mp4', thumbnailFile: expect.any(File) }),
      expect.any(Function),
      expect.any(AbortSignal),
    );
  });

  it('promotes and thumbnails a duplicate when the original keeper is removed', async () => {
    mockedHashFileSample.mockResolvedValue({ hash: 'same-hash', bytesHashed: 100 });

    await addTestVideos(['first.mp4', 'second.mp4']);
    await userEvent.click(screen.getByRole('button', { name: /Remove first\.mp4 from the import list/ }));

    await waitFor(() => expect(mockedCreateVideoThumbnail).toHaveBeenCalledTimes(2));
    expect(mockedCreateVideoThumbnail).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'second.mp4' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Upload/ })).toBeEnabled());
  });

  it('does not let a failed thumbnail keeper block another copy', async () => {
    mockedHashFileSample.mockResolvedValue({ hash: 'same-hash', bytesHashed: 100 });
    mockedCreateVideoThumbnail.mockRejectedValueOnce(new Error('Thumbnail failed'));

    renderWithProviders(<ImportsPage />);
    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeVideoFile('first.mp4'), makeVideoFile('second.mp4')] } });

    await screen.findByText('invalid');
    await waitFor(() => expect(mockedCreateVideoThumbnail).toHaveBeenCalledTimes(2));
    expect(mockedCreateVideoThumbnail).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'second.mp4' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Upload/ })).toBeEnabled());
  });

  it('skips thumbnail generation for a video that already exists on the server', async () => {
    mockedUseVideoStore.mockImplementation((selector) => selector({
      processedRecords: [{ file_hash: 'existing-hash', filename: 'existing.mp4' }],
    } as never));
    mockedHashFileSample.mockResolvedValueOnce({ hash: 'existing-hash', bytesHashed: 100 });

    renderWithProviders(<ImportsPage />);
    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeVideoFile('dupe.mp4')] } });

    await screen.findByText('already uploaded');
    expect(mockedCreateVideoThumbnail).not.toHaveBeenCalled();
  });

  it('keeps an in-flight upload in the active group even if the user swaps the keeper mid-upload', async () => {
    mockedHashFileSample.mockResolvedValue({ hash: 'same-hash', bytesHashed: 100 });

    let resolveUpload: (result: { id: string; filename: string }) => void = () => {};
    const uploadPromise = new Promise<{ id: string; filename: string }>((resolve) => {
      resolveUpload = resolve;
    });
    mockedUploadVideo.mockReturnValueOnce(uploadPromise);

    await addTestVideos(['first.mp4', 'second.mp4']);

    await userEvent.click(screen.getByRole('button', { name: /Upload/ }));
    await screen.findByText('uploading');

    // Swapping while first.mp4 is uploading must not retroactively turn it into a duplicate -
    // second.mp4 legitimately becomes/stays first.mp4's duplicate instead, since first.mp4 has
    // already committed to uploading and a later swap can't un-claim that.
    await userEvent.click(screen.getByText('Use this file instead'));
    const firstRow = screen.getByText('first.mp4').closest('tr') as HTMLElement;
    expect(within(firstRow).getByText('uploading')).toBeInTheDocument();
    expect(within(firstRow).queryByText('duplicate video')).not.toBeInTheDocument();

    resolveUpload({ id: 'video-1', filename: 'first.mp4' });

    await within(firstRow).findByText('uploaded');
    expect(within(firstRow).queryByText('duplicate video')).not.toBeInTheDocument();
  });

  it('flags a video that matches an already-uploaded record and skips it', async () => {
    mockedUseVideoStore.mockImplementation((selector) => selector({
      processedRecords: [{ file_hash: 'existing-hash', filename: 'existing.mp4' }],
    } as never));
    mockedHashFileSample.mockResolvedValueOnce({ hash: 'existing-hash', bytesHashed: 100 });

    renderWithProviders(<ImportsPage />);
    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeVideoFile('dupe.mp4')] } });

    await screen.findByText('already uploaded');
    expect(screen.getByRole('button', { name: /Upload/ })).toBeDisabled();
    expect(mockedUploadVideo).not.toHaveBeenCalled();
  });

  it('shows a provisional "Videos to upload" count while some videos are still being checked', async () => {
    let resolveSecondHash: (result: { hash: string; bytesHashed: number }) => void = () => {};
    const secondHashPromise = new Promise<{ hash: string; bytesHashed: number }>((resolve) => {
      resolveSecondHash = resolve;
    });
    mockedHashFileSample.mockImplementation(async (file) => (
      file.name === 'second.mp4' ? secondHashPromise : { hash: `hash-${file.name}`, bytesHashed: file.size }
    ));

    renderWithProviders(<ImportsPage />);
    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeVideoFile('first.mp4'), makeVideoFile('second.mp4')] } });

    await screen.findByText('first.mp4');
    await screen.findByText('second.mp4');

    // first.mp4 has finished the pipeline, second.mp4 is still hashing.
    const header = (await screen.findByText('Videos to upload (1)')).closest('.ant-collapse-header') as HTMLElement;
    expect(within(header).getByLabelText('loading')).toBeInTheDocument();

    resolveSecondHash({ hash: 'hash-second.mp4', bytesHashed: 100 });

    const finalHeader = (await screen.findByText('Videos to upload (2)')).closest('.ant-collapse-header') as HTMLElement;
    expect(within(finalHeader).queryByLabelText('loading')).not.toBeInTheDocument();
  });

  it('hides the swap button on in-batch duplicates of a file that is already uploaded', async () => {
    mockedUseVideoStore.mockImplementation((selector) => selector({
      processedRecords: [{ file_hash: 'existing-hash', filename: 'existing.mp4' }],
    } as never));
    mockedHashFileSample.mockResolvedValue({ hash: 'existing-hash', bytesHashed: 100 });

    renderWithProviders(<ImportsPage />);
    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeVideoFile('dupe-a.mp4'), makeVideoFile('dupe-b.mp4')] } });

    // Every copy matches the server record, not just whichever one is the local "keeper".
    await screen.findAllByText('already uploaded');
    expect(screen.getAllByText('already uploaded')).toHaveLength(2);
    expect(screen.queryByText('duplicate video')).not.toBeInTheDocument();
    expect(screen.queryByText('Use this file instead')).not.toBeInTheDocument();
  });

  it('cancels a running batch: the in-flight video is cancelled, the queued one is never attempted', async () => {
    mockedUploadVideo.mockImplementationOnce((_video, _onProgress, signal) => new Promise((_resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new DOMException('Upload cancelled.', 'AbortError')));
    }));

    await addTestVideos(['clip-a.mp4', 'clip-b.mp4']);

    await userEvent.click(screen.getByRole('button', { name: /Upload/ }));
    await screen.findByText('uploading');

    const cancelButton = await screen.findByRole('button', { name: /Cancel/ });
    await userEvent.click(cancelButton);

    await screen.findByText('cancelled');
    expect(mockedUploadVideo).toHaveBeenCalledTimes(1);

    // The queued video was never attempted, so it's still shown as valid/ready, not failed or cancelled.
    expect(screen.queryByText('failed')).not.toBeInTheDocument();
    expect(screen.getAllByText('cancelled')).toHaveLength(1);
  });

  it('adds readable dropped files and warns when another dropped entry could not be read', async () => {
    const readableVideo = makeVideoFile('readable.mp4');
    mockedReadDroppedFiles.mockResolvedValueOnce({
      files: [readableVideo],
      failedEntryCount: 1,
    });

    renderWithProviders(<ImportsPage />);
    fireEvent.drop(screen.getByRole('button', { name: /Click or drag video files or folders here to import/ }), {
      dataTransfer: { items: [] },
    });

    await screen.findByText('readable.mp4');
    expect(await screen.findByText('Could not read 1 dropped item. The remaining files were added.')).toBeInTheDocument();
  });

  it('warns that leaving abandons the import session without affecting the original files', async () => {
    renderWithProviders(
      <>
        <ImportsPage />
        <Link to="/somewhere-else">Leave import page</Link>
      </>,
    );

    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeVideoFile('clip.mp4')] } });
    await waitFor(() => expect(screen.getByRole('button', { name: /Upload/ })).toBeEnabled());

    await userEvent.click(screen.getByRole('link', { name: 'Leave import page' }));

    expect(await screen.findByText(
      'This import session and its progress will be lost. Your original files are unaffected.',
    )).toBeInTheDocument();
  });

  it('offers to keep or cancel the active upload queue when leaving', async () => {
    mockedUploadVideo.mockImplementationOnce((_video, _onProgress, signal) => new Promise((_resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new DOMException('Upload cancelled.', 'AbortError')));
    }));

    renderWithProviders(
      <>
        <ImportsPage />
        <Link to="/somewhere-else">Leave import page</Link>
      </>,
    );

    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeVideoFile('clip.mp4')] } });
    await waitFor(() => expect(screen.getByRole('button', { name: /Upload/ })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: /Upload/ }));
    await screen.findByText('uploading');

    await userEvent.click(screen.getByRole('link', { name: 'Leave import page' }));

    expect(await screen.findByText(
      "The active upload queue will continue. Videos not yet queued and this page's progress and controls will be lost. Your original files are unaffected.",
    )).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave & keep uploading' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel uploads & leave' }));

    expect(mockedUploadVideo.mock.calls[0][2]?.aborted).toBe(true);
  });
});
