import { useMemo, useState } from 'react';
import { pick } from 'es-toolkit';
import { RecordModel } from 'pocketbase';

import { MetadataFieldsType } from '../types.ts';

/**
 * Filters a list of records by a text search query applied across all metadata fields.
 *
 * @param records - The list of records to filter.
 * @param metadataFields - The metadata field definitions; only fields defined here are searched.
 * @returns An object with:
 *   - `filteredRecords`: The records matching the current search query.
 *   - `setSearchQuery`: Callback to update the search query (pass to `QueryOperationsButtons` as `handleSearch`).
 */
function useSearchFilter<T extends RecordModel>(
  records: T[],
  metadataFields: MetadataFieldsType,
): { filteredRecords: T[]; setSearchQuery: (query: string) => void } {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records;
    const lowerSearchQuery = searchQuery.toLowerCase().trim();
    return records.filter(record => {
      // Concatenate all searchable metadata field values into a single string for searching
      const searchableString = Object.values(
        // Pick only the metadata fields that are relevant for searching
        pick(record, Object.keys(metadataFields)),
      )
        .map(val => (Array.isArray(val) ? val.join(', ') : String(val ?? '')))
        .join('\n')
        .toLowerCase();
      return searchableString.includes(lowerSearchQuery);
    });
  }, [searchQuery, records, metadataFields]);

  return { filteredRecords, setSearchQuery };
}

export default useSearchFilter;
