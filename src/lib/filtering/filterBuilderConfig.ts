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
  { label: 'on', value: '=' },
  { label: 'after', value: '>=' },
  { label: 'before', value: '<' },
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
  { label: 'has any of', value: 'in' },
  { label: 'has all of', value: '$all' }, // custom operator handled in filterEngine.ts
  { label: 'is exactly', value: '=' },
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
  tags: 'in',
};

export const buildQueryBuilderFields = (
  metadataFields: MetadataFieldsType,
  uniqueValuesPerField: Record<string, string[]>
): Field[] =>
  Object.entries(metadataFields).map(([fieldName, metadataField]) => {
    const category = metadataTypeToCategory(metadataField.type);
    const valueEditorType =
      category === 'enum' && metadataField.valueEditorType === 'select'
        ? ((operator: string) => (MULTI_VALUE_OPERATORS.has(operator) ? 'multiselect' : 'select')) as Field['valueEditorType']
        : (metadataField.valueEditorType as Field['valueEditorType']);
    const output: Field = {
      name: fieldName,
      label: metadataField.displayName,
      icon: metadataField.icon,
      datatype: metadataField.type === 'rich_text' ? 'text' : metadataField.type,
      inputType: metadataField.inputType,
      renderType: metadataField.renderType,
      valueEditorType,
      defaultOperator: defaultOperatorByCategory[category],
      operators: operatorsByCategory[category],
    };

    if (metadataField.type === 'select' || metadataField.type === 'multiselect') {
      output.values = (uniqueValuesPerField[fieldName] ?? []).map(x => ({ name: x, value: x, label: x }));
    }
    if (metadataField.type === 'boolean') {
      output.values = [
        // @ts-ignore (temporary hack - name and value are expected to be strings)
        { name: true, value: true, label: metadataField.displayBooleanValuesAs?.[1] ?? 'True' },
        // @ts-ignore (temporary hack - name and value are expected to be strings)
        { name: false, value: false, label: metadataField.displayBooleanValuesAs?.[0] ?? 'False' },
      ];
    }

    return output;
  });
