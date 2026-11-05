import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders, screen, userEvent } from '../helpers/render';
import ImportBatchSummary, { type ImportBatchCounts } from '../../src/components/ImportBatchSummary';

const baseCounts: ImportBatchCounts = {
  selected: 5,
  checking: 0,
  ready: 1,
  uploading: 1,
  uploaded: 2,
  failed: 1,
  skipped: 0,
};

const renderSummary = (overrides: Partial<React.ComponentProps<typeof ImportBatchSummary>> = {}) => (
  renderWithProviders(
    <ImportBatchSummary
      counts={baseCounts}
      totalSizeLabel="120.0 MB"
      overallPercent={42}
      uploadedPercent={30}
      isUploading={false}
      uploadableCount={1}
      onUpload={vi.fn()}
      {...overrides}
    />,
  )
);

describe('ImportBatchSummary', () => {
  it('shows the uploaded/selected summary text', () => {
    renderSummary();

    expect(screen.getByText('2 of 5 uploaded')).toBeInTheDocument();
    expect(screen.getByText('5 selected · 120.0 MB')).toBeInTheDocument();
  });

  it('shows the overall percent on the progress bar, including for failed batches', () => {
    renderSummary();

    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('flags the progress bar as an exception once there are upload failures', () => {
    const { container } = renderSummary();

    expect(container.querySelector('.ant-progress-status-exception')).not.toBeNull();
  });

  it('only shows a legend badge for non-zero categories', () => {
    renderSummary();

    expect(screen.getByText('1 ready')).toBeInTheDocument();
    expect(screen.getByText('1 uploading')).toBeInTheDocument();
    expect(screen.getByText('2 uploaded')).toBeInTheDocument();
    expect(screen.getByText('1 failed')).toBeInTheDocument();
    expect(screen.queryByText(/checking$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/skipped$/)).not.toBeInTheDocument();
  });

  it('disables Upload when there is nothing uploadable, and calls onUpload when clicked', async () => {
    const onUpload = vi.fn();
    const { rerender } = renderSummary({ uploadableCount: 0, onUpload });

    expect(screen.getByRole('button', { name: /Upload/ })).toBeDisabled();

    rerender(
      <ImportBatchSummary
        counts={baseCounts}
        totalSizeLabel="120.0 MB"
        overallPercent={42}
        uploadedPercent={30}
        isUploading={false}
        uploadableCount={1}
        onUpload={onUpload}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Upload/ }));
    expect(onUpload).toHaveBeenCalledTimes(1);
  });

  it('disables Upload while a batch is uploading', () => {
    renderSummary({ isUploading: true });

    expect(screen.getByRole('button', { name: /Upload/ })).toBeDisabled();
  });

  it('shows a Retry button only when there are failures to retry, and calls onRetryFailed', async () => {
    const onRetryFailed = vi.fn();
    renderSummary({ onRetryFailed });

    const retryButton = screen.getByRole('button', { name: /Retry 1 failed/ });
    const user = userEvent.setup();
    await user.click(retryButton);
    expect(onRetryFailed).toHaveBeenCalledTimes(1);
  });

  it('hides Retry when there are no failures, or while uploading', () => {
    const { rerender } = renderSummary({
      counts: { ...baseCounts, failed: 0 },
      onRetryFailed: vi.fn(),
    });
    expect(screen.queryByRole('button', { name: /Retry/ })).not.toBeInTheDocument();

    rerender(
      <ImportBatchSummary
        counts={baseCounts}
        totalSizeLabel="120.0 MB"
        overallPercent={42}
        uploadedPercent={30}
        isUploading
        uploadableCount={1}
        onUpload={vi.fn()}
        onRetryFailed={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /Retry/ })).not.toBeInTheDocument();
  });

  it('shows a Cancel button only while uploading, and calls onCancel', async () => {
    const onCancel = vi.fn();
    renderSummary({ isUploading: true, onCancel });

    const cancelButton = screen.getByRole('button', { name: /Cancel/ });
    const user = userEvent.setup();
    await user.click(cancelButton);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('hides Cancel when not uploading', () => {
    renderSummary({ isUploading: false, onCancel: vi.fn() });
    expect(screen.queryByRole('button', { name: /Cancel/ })).not.toBeInTheDocument();
  });
});
