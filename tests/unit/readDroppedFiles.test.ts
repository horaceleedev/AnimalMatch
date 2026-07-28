import { describe, expect, it } from 'vitest';

import { readDroppedFiles } from '../../src/lib/readDroppedFiles';

const makeFileEntry = (fullPath: string, file: File): FileSystemFileEntry => ({
  isFile: true,
  isDirectory: false,
  fullPath,
  name: file.name,
  filesystem: {} as FileSystem,
  file: (successCallback: (file: File) => void) => successCallback(file),
  getParent: () => {},
  toURL: () => '',
} as unknown as FileSystemFileEntry);

// Splits entries across multiple readEntries() batches (plus a trailing empty
// batch), matching the real DirectoryReader contract this code relies on.
const makeDirectoryEntry = (fullPath: string, childBatches: FileSystemEntry[][]): FileSystemDirectoryEntry => {
  let batchIndex = 0;

  const reader: FileSystemDirectoryReader = {
    readEntries: (successCallback: (entries: FileSystemEntry[]) => void) => {
      const batch = batchIndex < childBatches.length ? childBatches[batchIndex] : [];
      batchIndex += 1;
      successCallback(batch);
    },
  } as unknown as FileSystemDirectoryReader;

  return {
    isFile: false,
    isDirectory: true,
    fullPath,
    name: fullPath.split('/').pop() ?? '',
    filesystem: {} as FileSystem,
    createReader: () => reader,
    getParent: () => {},
    toURL: () => '',
  } as unknown as FileSystemDirectoryEntry;
};

const makeItem = (entry: FileSystemEntry | null, file?: File): DataTransferItem => ({
  kind: 'file',
  type: file?.type ?? '',
  webkitGetAsEntry: () => entry,
  getAsFile: () => file ?? null,
} as unknown as DataTransferItem);

const asItemList = (items: DataTransferItem[]) => items as unknown as DataTransferItemList;

describe('readDroppedFiles', () => {
  it('flattens a nested directory drop and reconstructs each relative path', async () => {
    const rootVideo = new File(['a'], 'root.mp4', { type: 'video/mp4' });
    const nestedVideo = new File(['b'], 'nested.mp4', { type: 'video/mp4' });
    const deeplyNestedVideo = new File(['c'], 'deep.mp4', { type: 'video/mp4' });

    const deepDir = makeDirectoryEntry('/videos/sub/deep', [
      [makeFileEntry('/videos/sub/deep/deep.mp4', deeplyNestedVideo)],
    ]);
    const subDir = makeDirectoryEntry('/videos/sub', [
      [makeFileEntry('/videos/sub/nested.mp4', nestedVideo), deepDir],
    ]);
    const rootDir = makeDirectoryEntry('/videos', [
      [makeFileEntry('/videos/root.mp4', rootVideo)],
      [subDir],
    ]);

    const result = await readDroppedFiles(asItemList([makeItem(rootDir)]));

    expect(result.map((file) => file.name).sort()).toEqual(['deep.mp4', 'nested.mp4', 'root.mp4']);

    const byName = Object.fromEntries(result.map((file) => [file.name, file.webkitRelativePath]));
    expect(byName['root.mp4']).toBe('videos/root.mp4');
    expect(byName['nested.mp4']).toBe('videos/sub/nested.mp4');
    expect(byName['deep.mp4']).toBe('videos/sub/deep/deep.mp4');
  });

  it('reads a plain dropped file via its entry', async () => {
    const file = new File(['content'], 'clip.mp4', { type: 'video/mp4' });
    const entry = makeFileEntry('/clip.mp4', file);

    const result = await readDroppedFiles(asItemList([makeItem(entry)]));

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('clip.mp4');
    expect(result[0].webkitRelativePath).toBe('clip.mp4');
  });

  it('falls back to getAsFile when an item has no entry backing it', async () => {
    const file = new File(['content'], 'clip.mp4', { type: 'video/mp4' });

    const result = await readDroppedFiles(asItemList([makeItem(null, file)]));

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(file);
  });

  it('ignores an item that has neither an entry nor a file', async () => {
    const result = await readDroppedFiles(asItemList([makeItem(null)]));

    expect(result).toEqual([]);
  });
});
