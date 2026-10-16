import { App as AntApp } from 'antd';
import { ClientResponseError } from 'pocketbase';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import useFormManager from '../../src/hooks/useFormManager';
import type { MetadataFieldsType, Video } from '../../src/types';
import { act, renderHook } from '../helpers/render';

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

// Mirrors production metadata fields, which include `id` so the hook can tell records apart.
const metadataFields: MetadataFieldsType = {
  id: { displayName: 'Id', type: 'text', inputType: 'text', isInternal: true },
  location_name: { displayName: 'Location', type: 'text', inputType: 'text' },
  habitat: { displayName: 'Habitat', type: 'select', valueEditorType: 'select' },
  notes: { displayName: 'Notes', type: 'rich_text' },
};

const formValues = (overrides: Partial<Video> = {}): Partial<Video> => ({
  id: 'video-1',
  location_name: 'Meru',
  habitat: 'forest',
  notes: '',
  ...overrides,
});

const renderFormManager = (
  record: Video,
  updateFunction: (id: string, data: Partial<Video>) => Promise<Video> = vi.fn(),
) => renderHook(
  ({ record: currentRecord }) => useFormManager(currentRecord, metadataFields, updateFunction),
  { initialProps: { record } },
);

describe('useFormManager', () => {
  const message = {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(AntApp, 'useApp').mockReturnValue({ message } as never);
    message.error.mockReset();
    message.success.mockReset();
    message.warning.mockReset();
  });

  it('initializes form state from the metadata fields on the processed record', () => {
    const { result } = renderFormManager(makeVideo({ notes: 'Initial notes' }));

    expect(result.current.formData).toEqual(formValues({ notes: 'Initial notes' }));
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.isSavingChanges).toBe(false);
  });

  it('tracks unsaved changes and resets the dirty state when values match the record again', () => {
    const { result } = renderFormManager(makeVideo());

    act(() => {
      result.current.handleValuesChange({}, formValues({ habitat: 'savanna' }));
    });

    expect(result.current.formData).toEqual(formValues({ habitat: 'savanna' }));
    expect(result.current.hasUnsavedChanges).toBe(true);

    act(() => {
      result.current.handleValuesChange({}, formValues());
    });

    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('saves only changed fields and reports success', async () => {
    let resolveUpdate!: (value: Video) => void;
    const updateFunction = vi.fn().mockImplementation(
      () => new Promise<Video>((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    const { result } = renderFormManager(makeVideo({ notes: 'Before' }), updateFunction);

    act(() => {
      result.current.handleValuesChange({}, formValues({ location_name: 'Nairobi', notes: 'After' }));
    });

    let pendingSave!: Promise<void>;
    act(() => {
      pendingSave = result.current.saveChanges();
    });

    expect(result.current.isSavingChanges).toBe(true);
    expect(updateFunction).toHaveBeenCalledWith('video-1', {
      location_name: 'Nairobi',
      notes: 'After',
    });

    await act(async () => {
      resolveUpdate(makeVideo({ location_name: 'Nairobi', notes: 'After' }));
      await pendingSave;
    });
    expect(message.success).toHaveBeenCalledWith('Changes saved successfully');
    expect(message.error).not.toHaveBeenCalled();
    expect(message.warning).not.toHaveBeenCalled();
    expect(result.current.isSavingChanges).toBe(false);
  });

  it('stays dirty after a successful save until the refreshed record arrives', async () => {
    const updateFunction = vi.fn().mockResolvedValue(makeVideo({ location_name: 'Nairobi' }));
    const { result, rerender } = renderFormManager(makeVideo(), updateFunction);

    act(() => {
      result.current.handleValuesChange({}, formValues({ location_name: 'Nairobi' }));
    });

    await act(async () => {
      await result.current.saveChanges();
    });

    expect(message.success).toHaveBeenCalledWith('Changes saved successfully');
    expect(result.current.hasUnsavedChanges).toBe(true);
    expect(result.current.formData).toEqual(formValues({ location_name: 'Nairobi' }));

    rerender({ record: makeVideo({ location_name: 'Nairobi' }) });

    expect(message.warning).not.toHaveBeenCalled();
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.formData).toEqual(formValues({ location_name: 'Nairobi' }));
  });

  it('uses the server message for ClientResponseError failures', async () => {
    const error = new ClientResponseError({
      status: 400,
      response: { message: 'Validation failed' },
    });
    const updateFunction = vi.fn().mockRejectedValue(error);
    const { result } = renderFormManager(makeVideo(), updateFunction);

    act(() => {
      result.current.handleValuesChange({}, formValues({ location_name: 'Changed' }));
    });

    await act(async () => {
      await result.current.saveChanges();
    });

    expect(message.error).toHaveBeenCalledWith('Validation failed', 10);
    expect(message.success).not.toHaveBeenCalled();
    expect(result.current.isSavingChanges).toBe(false);
  });

  it('falls back to a generic error message for unknown failures', async () => {
    const updateFunction = vi.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderFormManager(makeVideo(), updateFunction);

    act(() => {
      result.current.handleValuesChange({}, formValues({ location_name: 'Changed' }));
    });

    await act(async () => {
      await result.current.saveChanges();
    });

    expect(message.error).toHaveBeenCalledWith(
      'Your changes could not be saved. Please try again later.',
      10,
    );
    expect(message.success).not.toHaveBeenCalled();
    expect(result.current.isSavingChanges).toBe(false);
  });

  it('keeps the user\'s edits when a save fails', async () => {
    const updateFunction = vi.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderFormManager(makeVideo(), updateFunction);

    act(() => {
      result.current.handleValuesChange({}, formValues({ location_name: 'Changed', notes: 'Draft' }));
    });

    await act(async () => {
      await result.current.saveChanges();
    });

    expect(message.error).toHaveBeenCalled();
    expect(result.current.formData).toEqual(formValues({ location_name: 'Changed', notes: 'Draft' }));
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('warns when server updates overwrite unsaved changes for the same record', () => {
    const { result, rerender } = renderFormManager(makeVideo());

    act(() => {
      result.current.handleValuesChange({}, formValues({ location_name: 'Locally edited' }));
    });

    rerender({ record: makeVideo({ location_name: 'Server updated' }) });

    expect(message.warning).toHaveBeenCalledWith(
      'Your changes have been overwritten by new data from the server',
    );
    expect(result.current.formData).toEqual(formValues({ location_name: 'Server updated' }));
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('does not warn when switching to a different record with unsaved edits', () => {
    const { result, rerender } = renderFormManager(makeVideo());

    act(() => {
      result.current.handleValuesChange({}, formValues({ location_name: 'Locally edited' }));
    });

    rerender({ record: makeVideo({ id: 'video-2', location_name: 'Elsewhere' }) });

    expect(message.warning).not.toHaveBeenCalled();
    expect(result.current.formData).toEqual(formValues({ id: 'video-2', location_name: 'Elsewhere' }));
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('does not warn when the refreshed record matches the local edits', () => {
    const { result, rerender } = renderFormManager(makeVideo());

    act(() => {
      result.current.handleValuesChange({}, formValues({ location_name: 'Nairobi' }));
    });

    rerender({ record: makeVideo({ location_name: 'Nairobi' }) });

    expect(message.warning).not.toHaveBeenCalled();
    expect(result.current.formData).toEqual(formValues({ location_name: 'Nairobi' }));
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('applies server updates silently when there are no local edits', () => {
    const { result, rerender } = renderFormManager(makeVideo());

    rerender({ record: makeVideo({ habitat: 'savanna' }) });

    expect(message.warning).not.toHaveBeenCalled();
    expect(result.current.formData).toEqual(formValues({ habitat: 'savanna' }));
    expect(result.current.hasUnsavedChanges).toBe(false);
  });
});
