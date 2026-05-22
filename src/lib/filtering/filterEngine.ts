import dayjs from 'dayjs';
import { defaultRuleProcessorMongoDB, formatQuery, type RuleGroupType } from 'react-querybuilder';
import sift from 'sift';

import { cropsMetadataFields, individualsMetadataFields, videoMetadataFields } from '../../metadata';

export type QueryDefinition = RuleGroupType;

const DATE_FIELD_NAMES = new Set(
  [...Object.entries(videoMetadataFields), ...Object.entries(individualsMetadataFields), ...Object.entries(cropsMetadataFields)]
    .filter(([, field]) => field.type === 'date')
    .map(([fieldName]) => fieldName)
);

const hasGroupNot = (group: QueryDefinition): boolean =>
  Boolean(group.not) ||
  group.rules.some(rule => 'rules' in rule && hasGroupNot(rule));

const ruleProcessor = (rule: any) => {
  // Handle custom $all operator
  // This operator is used for tag fields to check if all specified tags are present in the record's tags array.
  if (rule.operator === '$all') {
    return `{ "${rule.field}": { "$all": ${JSON.stringify(rule.value)} } }`;
  }
  return defaultRuleProcessorMongoDB(rule);
};

export const filterByQuery = <T extends Record<string, unknown>>(
  records: T[],
  query: QueryDefinition
): T[] => {
  if (!query.rules || query.rules.length === 0) return records;

  if (hasGroupNot(query)) {
    console.warn('Query group inversion (not) is not supported by mongodb export. Ignoring "not".');
  }

  const mongoQueryText = formatQuery(query, { format: 'mongodb', ruleProcessor });
  let mongoQuery: Record<string, unknown>;

  try {
    mongoQuery = JSON.parse(mongoQueryText) as Record<string, unknown>;
  } catch (error) {
    console.error('Failed to parse mongodb query output from react-querybuilder:', error, mongoQueryText);
    return records;
  }

  try {
    const normalizedQuery = normalizeMongoQueryStrings(normalizeDateQueryOperators(mongoQuery));
    const normalizedRecords = records.map(record => normalizeRecordStrings(record));
    const matcher = sift(normalizedQuery);
    return records.filter((_, index) => matcher(normalizedRecords[index]));
  } catch (error) {
    console.error('Failed to apply sift query:', error, mongoQuery);
    return records;
  }
};

const normalizeRecordStrings = (value: unknown): unknown => {
  if (typeof value === 'string') {
    if (value === '') return null; // Normalise empty strings to null for isEmpty operator
    return value.toLowerCase();
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return null; // Normalise empty arrays to null for isEmpty operator
    return value.map(normalizeRecordStrings);
  }
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      output[k] = normalizeRecordStrings(v);
    }
    return output;
  }
  return value;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isDateOnlyString = (value: unknown): value is string =>
  typeof value === 'string' && DATE_ONLY_PATTERN.test(value);

const nextDayString = (value: string): string =>
  dayjs(value).add(1, 'day').format('YYYY-MM-DD');

const normalizeDateFieldQuery = (value: unknown): unknown => {
  if (isDateOnlyString(value)) {
    return {
      $gte: value,
      $lt: nextDayString(value),
    };
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const output: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '$eq' && isDateOnlyString(v)) {
        output.$gte = v;
        output.$lt = nextDayString(v);
        continue;
      }

      output[k] = normalizeDateQueryOperators(v);
    }

    return output;
  }

  return value;
};

const normalizeDateQueryOperators = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeDateQueryOperators);

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      output[k] = DATE_FIELD_NAMES.has(k)
        ? normalizeDateFieldQuery(v)
        : normalizeDateQueryOperators(v);
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
