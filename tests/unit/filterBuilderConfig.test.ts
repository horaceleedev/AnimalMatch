import { describe, expect, it } from 'vitest';

import { cropsMetadataFields, individualsMetadataFields, videoMetadataFields } from '../../src/metadata';
import { buildQueryBuilderFields } from '../../src/lib/filtering/filterBuilderConfig';

describe('buildQueryBuilderFields', () => {
  it('uses a multi-select editor for select fields with in/notIn operators', () => {
    const fields = buildQueryBuilderFields(videoMetadataFields, {
      annotation_status: ['to annotate', 'annotated'],
      habitat: ['forest', 'savanna'],
      location_name: ['Meru', 'Nairobi'],
    });
    const habitatField = fields.find(field => field.name === 'habitat');

    expect(habitatField?.operators?.map(operator => operator.value)).toEqual([
      '=',
      '!=',
      'in',
      'notIn',
      'null',
      'notNull',
    ]);
    expect(typeof habitatField?.valueEditorType).toBe('function');
    expect(habitatField?.valueEditorType?.('=')).toBe('select');
    expect(habitatField?.valueEditorType?.('in')).toBe('multiselect');
    expect(habitatField?.valueEditorType?.('notIn')).toBe('multiselect');
  });

  it('preserves render-aware field metadata for UI value rendering', () => {
    const fields = buildQueryBuilderFields(videoMetadataFields, {
      assignees: ['user-1', 'user-2'],
    });
    const assigneesField = fields.find(field => field.name === 'assignees');

    expect(assigneesField?.renderType).toBe('user_label');
    expect(assigneesField?.valueEditorType).toBe('multiselect');
    expect(assigneesField?.values).toEqual([
      { name: 'user-1', value: 'user-1' },
      { name: 'user-2', value: 'user-2' },
    ]);
  });

  it('assigns text-style operators to rich text fields and normalizes datatype to text', () => {
    const fields = buildQueryBuilderFields(individualsMetadataFields, {});
    const notesField = fields.find(field => field.name === 'notes');

    expect(notesField?.datatype).toBe('text');
    expect(notesField?.defaultOperator).toBe('contains');
    expect(notesField?.operators?.map(operator => operator.value)).toEqual([
      '=',
      '!=',
      'contains',
      'doesNotContain',
      'beginsWith',
      'endsWith',
      'null',
      'notNull',
    ]);
  });

  it('populates configured option values for select and multiselect crop fields', () => {
    const fields = buildQueryBuilderFields(cropsMetadataFields, {
      body_part: ['face', 'ear'],
      custom_tags: ['clear', 'review'],
      side: ['left', 'right'],
    });
    const bodyPartField = fields.find(field => field.name === 'body_part');
    const customTagsField = fields.find(field => field.name === 'custom_tags');

    expect(bodyPartField?.values).toEqual([
      { name: 'face', value: 'face' },
      { name: 'ear', value: 'ear' },
    ]);
    expect(customTagsField?.values).toEqual([
      { name: 'clear', value: 'clear' },
      { name: 'review', value: 'review' },
    ]);
  });
});
