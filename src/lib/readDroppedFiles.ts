export type FileWithRelativePath = File & { webkitRelativePath?: string };

const isFileSystemFileEntry = (entry: FileSystemEntry): entry is FileSystemFileEntry => entry.isFile;
const isFileSystemDirectoryEntry = (entry: FileSystemEntry): entry is FileSystemDirectoryEntry => entry.isDirectory;

const withRelativePath = (file: File, entry: FileSystemEntry): FileWithRelativePath => {
  try {
    // Drops don't get webkitRelativePath set for us.
    Object.defineProperty(file, "webkitRelativePath", {
      value: entry.fullPath.replace(/^\//, ""),
      configurable: true,
    });
  } catch {
   // This errors harmlessly sometimes
  }

  return file as FileWithRelativePath;
};

const readEntryAsFile = (entry: FileSystemFileEntry): Promise<FileWithRelativePath> => (
  new Promise((resolve, reject) => {
    entry.file((file) => resolve(withRelativePath(file, entry)), reject);
  })
);

// readEntries recursively called until it returns empty.
const readAllDirectoryEntries = (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> => (
  new Promise((resolve, reject) => {
    const entries: FileSystemEntry[] = [];

    const readBatch = () => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(entries);
          return;
        }

        entries.push(...batch);
        readBatch();
      }, reject);
    };

    readBatch();
  })
);

const readEntry = async (entry: FileSystemEntry): Promise<FileWithRelativePath[]> => {
  if (isFileSystemFileEntry(entry)) {
    return [await readEntryAsFile(entry)];
  }

  if (isFileSystemDirectoryEntry(entry)) {
    const childEntries = await readAllDirectoryEntries(entry.createReader());
    const nestedFiles = await Promise.all(childEntries.map(readEntry));
    return nestedFiles.flat();
  }

  return [];
};

const readItem = async (item: DataTransferItem): Promise<FileWithRelativePath[]> => {
  const entry = item.webkitGetAsEntry?.();
  if (entry) return readEntry(entry);

  // Entry support isn't universal (older browsers, non-OS-drag sources) - a
  // plain file still works via getAsFile(), a folder just can't recurse.
  const file = item.getAsFile();
  return file ? [file as FileWithRelativePath] : [];
};

// Items must be read synchronously within the drop handler, before any
// awaits, or the browser invalidates them.
export const readDroppedFiles = async (items: DataTransferItemList): Promise<FileWithRelativePath[]> => {
  const itemsSnapshot = Array.from(items);
  const nestedFiles = await Promise.all(itemsSnapshot.map(readItem));
  return nestedFiles.flat();
};
