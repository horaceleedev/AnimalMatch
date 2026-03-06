import { formatQuery, type RuleGroupType } from 'react-querybuilder';
import sift from 'sift';

export type QueryDefinition = RuleGroupType;

const hasGroupNot = (group: QueryDefinition): boolean =>
  Boolean(group.not) ||
  group.rules.some(rule => 'rules' in rule && hasGroupNot(rule));

export const filterByQuery = <T extends Record<string, unknown>>(
  records: T[],
  query: QueryDefinition
): T[] => {
  if (!query.rules || query.rules.length === 0) return records;

  if (hasGroupNot(query)) {
    console.warn('Query group inversion (not) is not supported by mongodb export. Ignoring "not".');
  }

  const mongoQueryText = formatQuery(query, 'mongodb');
  let mongoQuery: Record<string, unknown>;

  try {
    mongoQuery = JSON.parse(mongoQueryText) as Record<string, unknown>;
  } catch (error) {
    console.error('Failed to parse mongodb query output from react-querybuilder:', error, mongoQueryText);
    return records;
  }

  try {
    const normalizedQuery = normalizeMongoQueryStrings(mongoQuery);
    const normalizedRecords = records.map(record => normalizeRecordStrings(record));
    const matcher = sift(normalizedQuery);
    return records.filter((_, index) => matcher(normalizedRecords[index]));
  } catch (error) {
    console.error('Failed to apply sift query:', error, mongoQuery);
    return records;
  }
};

const normalizeRecordStrings = (value: unknown): unknown => {
  if (typeof value === 'string') return value.toLowerCase();
  if (Array.isArray(value)) return value.map(normalizeRecordStrings);
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      output[k] = normalizeRecordStrings(v);
    }
    return output;
  }
  return value;
};

const normalizeMongoQueryStrings = (value: unknown): unknown => {
  if (typeof value === 'string') {
    // Keep Mongo-style field references used in $expr/$where payloads.
    if (value.startsWith('$')) return value;
    return value.toLowerCase();
  }
  if (Array.isArray(value)) return value.map(normalizeMongoQueryStrings);
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      output[k] = normalizeMongoQueryStrings(v);
    }
    return output;
  }
  return value;
};
