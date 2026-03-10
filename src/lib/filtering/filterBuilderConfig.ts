import type { Field } from 'react-querybuilder';
import type { MetadataFieldsType } from '../../types';

type FieldCategory = 'text' | 'number' | 'date' | 'boolean' | 'enum' | 'tags';
type QueryBuilderOperator = { value: string; label: string };

const MULTI_VALUE_OPERATORS = new Set(['in', 'notIn']); // Operators rather than fields that require multi-value input

const TEXT_OPERATORS: QueryBuilderOperator[] = [
  { label: 'is', value: '=' },
  { label: 'is not', value: '!=' },
  { label: 'contains', value: 'contains' },
  { label: 'does not contain', value: 'doesNotContain' },
  { label: 'begins with', value: 'beginsWith' },
  { label: 'ends with', value: 'endsWith' },
  { label: 'is empty', value: 'null' },
  { label: 'is not empty', value: 'notNull' },
];

const NUMBER_OPERATORS: QueryBuilderOperator[] = [
  { label: 'is', value: '=' },
  { label: 'is not', value: '!=' },
  { label: 'greater than', value: '>' },
  { label: 'at least', value: '>=' },
  { label: 'less than', value: '<' },
  { label: 'at most', value: '<=' },
  { label: 'between', value: 'between' },
  { label: 'not between', value: 'notBetween' },
  { label: 'is empty', value: 'null' },
  { label: 'is not empty', value: 'notNull' },
];

const DATE_OPERATORS: QueryBuilderOperator[] = [
  { label: 'is', value: '=' },
  { label: 'is not', value: '!=' },
  { label: 'after', value: '>' },
  { label: 'on or after', value: '>=' },
  { label: 'before', value: '<' },
  { label: 'on or before', value: '<=' },
  { label: 'between', value: 'between' },
  { label: 'not between', value: 'notBetween' },
  { label: 'is empty', value: 'null' },
  { label: 'is not empty', value: 'notNull' },
];

const BOOLEAN_OPERATORS: QueryBuilderOperator[] = [
  { label: 'is', value: '=' },
  { label: 'is not', value: '!=' },
];

const ENUM_OPERATORS: QueryBuilderOperator[] = [
  { label: 'is', value: '=' },
  { label: 'is not', value: '!=' },
  { label: 'is any of', value: 'in' },
  { label: 'is none of', value: 'notIn' },
  { label: 'is empty', value: 'null' },
  { label: 'is not empty', value: 'notNull' },
];

const TAG_OPERATORS: QueryBuilderOperator[] = [
  { label: 'has', value: '=' },
  { label: 'does not have', value: '!=' },
  { label: 'has any of', value: 'in' },
  { label: 'has none of', value: 'notIn' },
  { label: 'is empty', value: 'null' },
  { label: 'is not empty', value: 'notNull' },
];

const operatorsByCategory: Record<FieldCategory, QueryBuilderOperator[]> = {
  text: TEXT_OPERATORS,
  number: NUMBER_OPERATORS,
  date: DATE_OPERATORS,
  boolean: BOOLEAN_OPERATORS,
  enum: ENUM_OPERATORS,
  tags: TAG_OPERATORS,
};

const metadataTypeToCategory = (type: MetadataFieldsType[string]['type']): FieldCategory => {
  switch (type) {
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    case 'boolean':
      return 'boolean';
    case 'select':
      return 'enum';
    case 'multiselect':
      return 'tags';
    case 'rich_text':
    case 'text':
    default:
      return 'text';
  }
};

const defaultOperatorByCategory: Record<FieldCategory, string> = {
  text: 'contains',
  number: '=',
  date: '=',
  boolean: '=',
  enum: '=',
  tags: '=',
};

export const buildQueryBuilderFields = (
  metadataFields: MetadataFieldsType,
  uniqueValuesPerField: Record<string, string[]>
): Field[] =>
  Object.entries(metadataFields).map(([fieldValue, field]) => {
    const category = metadataTypeToCategory(field.type);
    const valueEditorType =
      category === 'enum' && field.valueEditorType === 'select'
        ? ((operator: string) => (MULTI_VALUE_OPERATORS.has(operator) ? 'multiselect' : 'select')) as Field['valueEditorType']
        : (field.valueEditorType as Field['valueEditorType']);
    const output: Field = {
      name: fieldValue,
      label: field.displayName,
      icon: field.icon,
      datatype: field.type === 'rich_text' ? 'text' : field.type,
      inputType: field.inputType,
      valueEditorType,
      defaultOperator: defaultOperatorByCategory[category],
      operators: operatorsByCategory[category],
    };

    if (field.type === 'select' || field.type === 'multiselect') {
      output.values = (uniqueValuesPerField[fieldValue] ?? []).map(x => ({ name: x, value: x }));
    }

    return output;
  });
