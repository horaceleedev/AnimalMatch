import React, { useState } from 'react';
import { expect, test } from 'vitest';
import type { RuleGroupType, RuleType } from 'react-querybuilder';

import QueryOperationsButtons from '../../src/components/dashboards/QueryOperationsButtons';
import type { MetadataFieldsType } from '../../src/types';
import { renderWithProviders } from '../helpers/browserRender';

const initialQuery: RuleGroupType = { combinator: 'and', rules: [] };

type HarnessProps = {
  initialGroupFields?: string[];
  initialGroupOrders?: Array<'asc' | 'desc'>;
  initialQuery?: RuleGroupType;
  initialSortFields?: string[];
  initialSortOrders?: Array<'asc' | 'desc'>;
  metadataFields: MetadataFieldsType;
  uniqueValuesPerField: Record<string, string[]>;
};

const QueryOperationsButtonsHarness = ({
  initialGroupFields,
  initialGroupOrders,
  initialQuery,
  initialSortFields,
  initialSortOrders,
  metadataFields,
  uniqueValuesPerField,
}: HarnessProps) => {
  const [groupFields, setGroupFields] = useState<string[]>(initialGroupFields ?? []);
  const [groupOrders, setGroupOrders] = useState<Array<'asc' | 'desc'>>(initialGroupOrders ?? []);
  const [query, setQuery] = useState<RuleGroupType>(initialQuery ?? { combinator: 'and', rules: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortFields, setSortFields] = useState<string[]>(initialSortFields ?? []);
  const [sortOrders, setSortOrders] = useState<Array<'asc' | 'desc'>>(initialSortOrders ?? []);

  return (
    <>
      <QueryOperationsButtons
        metadataFields={metadataFields}
        uniqueValuesPerField={uniqueValuesPerField}
        sortFields={sortFields}
        setSortFields={setSortFields}
        sortOrders={sortOrders}
        setSortOrders={setSortOrders}
        groupFields={groupFields}
        setGroupFields={setGroupFields}
        groupOrders={groupOrders}
        setGroupOrders={setGroupOrders}
        query={query}
        setQuery={setQuery}
        handleSearch={setSearchQuery}
      />
      <pre data-testid="query-state">{JSON.stringify(query)}</pre>
      <output data-testid="search-state">{searchQuery}</output>
    </>
  );
};

const textFirstMetadataFields: MetadataFieldsType = {
  notes: {
    displayName: 'Notes',
    type: 'text',
    inputType: 'text',
  },
  habitat: {
    displayName: 'Habitat',
    type: 'select',
    valueEditorType: 'select',
  },
  custom_tags: {
    displayName: 'Custom tags',
    type: 'multiselect',
    valueEditorType: 'multiselect',
  },
};

const selectFirstMetadataFields: MetadataFieldsType = {
  habitat: {
    displayName: 'Habitat',
    type: 'select',
    valueEditorType: 'select',
  },
  notes: {
    displayName: 'Notes',
    type: 'text',
    inputType: 'text',
  },
  custom_tags: {
    displayName: 'Custom tags',
    type: 'multiselect',
    valueEditorType: 'multiselect',
  },
};

const renderAwareSelectMetadataFields: MetadataFieldsType = {
  annotation_status: {
    displayName: 'Annotation status',
    type: 'select',
    valueEditorType: 'select',
    renderType: 'annotation_status_label',
  },
  notes: {
    displayName: 'Notes',
    type: 'text',
    inputType: 'text',
  },
};

const uniqueValuesPerField = {
  habitat: ['forest', 'savanna', 'wetland'],
  custom_tags: ['rare', 'clear', 'review'],
  annotation_status: ['to annotate', 'in progress', 'annotated'],
};

const getQueryState = (): RuleGroupType =>
  JSON.parse(document.querySelector('[data-testid="query-state"]')?.textContent ?? '{}') as RuleGroupType;

const getSearchState = (): string =>
  document.querySelector('[data-testid="search-state"]')?.textContent ?? '';

const clickVisibleSearchClearIcon = () => {
  const clearIcon = document.querySelector(
    '.ant-input-clear-icon:not(.ant-input-clear-icon-hidden)'
  ) as HTMLElement | null;

  if (!clearIcon) throw new Error('Search clear icon not found');
  clearIcon.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
  clearIcon.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, composed: true }));
  clearIcon.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
};

const setInputValue = (input: HTMLInputElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (!valueSetter) throw new Error('Could not find the HTMLInputElement value setter');

  input.focus();
  valueSetter.call(input, value);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, data: value }));
  input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
};

const openRuleSelect = (selectorQuery: string) => {
  const selector = document.querySelector(selectorQuery) as HTMLElement | null;
  const combobox = selector?.closest('.ant-select')?.querySelector('[role="combobox"]') as HTMLElement | null;

  if (!selector) throw new Error(`Could not find Ant Select selector for "${selectorQuery}"`);
  selector.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
  combobox?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true }));
};

const clickFirstDropdownOption = () => {
  const option = document.querySelector('.ant-select-item-option-content') as HTMLElement | null;
  if (!option) throw new Error('Could not find any dropdown option');
  option.click();
};

const clickPopoverIconButton = () => {
  const button = document.querySelector('.ant-popover:not(.ant-popover-hidden) .ant-btn-icon-only') as HTMLElement | null;
  if (!button) throw new Error('Could not find popover icon-only button');
  button.click();
};

const getValueEditorInput = (): HTMLInputElement => {
  const input = document.querySelector('input.rule-value, .rule-value input, .rule-value textarea');
  if (!(input instanceof HTMLInputElement)) {
    const markup = document.querySelector('.rule-value')?.innerHTML ?? 'rule-value not found';
    throw new Error(`Value input not found. rule-value markup: ${markup}`);
  }
  return input;
};

test('forwards search input changes to the parent handler', async () => {
  await renderWithProviders(
    <QueryOperationsButtonsHarness
      metadataFields={textFirstMetadataFields}
      uniqueValuesPerField={uniqueValuesPerField}
    />,
  );

  const searchInput = document.querySelector('input[placeholder="Search"]') as HTMLInputElement | null;
  if (!searchInput) throw new Error('Search input not found');

  setInputValue(searchInput, 'lion');

  expect(getSearchState()).toBe('lion');
});

test('clears search input and forwards the empty state', async () => {
  await renderWithProviders(
    <QueryOperationsButtonsHarness
      metadataFields={textFirstMetadataFields}
      uniqueValuesPerField={uniqueValuesPerField}
    />,
  );

  const searchInput = document.querySelector('input[placeholder="Search"]') as HTMLInputElement | null;
  if (!searchInput) throw new Error('Search input not found');

  setInputValue(searchInput, 'lion');
  expect(getSearchState()).toBe('lion');

  setInputValue(searchInput, '');
  expect(getSearchState()).toBe('');
});

test('clears search input through the clear icon', async () => {
  await renderWithProviders(
    <QueryOperationsButtonsHarness
      metadataFields={textFirstMetadataFields}
      uniqueValuesPerField={uniqueValuesPerField}
    />,
  );

  const searchInput = document.querySelector('input[placeholder="Search"]') as HTMLInputElement | null;
  if (!searchInput) throw new Error('Search input not found');

  setInputValue(searchInput, 'lion');
  expect(getSearchState()).toBe('lion');

  clickVisibleSearchClearIcon();
  await Promise.resolve();
  expect(getSearchState()).toBe('');
});

test('sets sort field and clears sort selection', async () => {
  const screen = await renderWithProviders(
    <QueryOperationsButtonsHarness
      initialSortFields={['habitat']}
      initialSortOrders={['asc']}
      metadataFields={textFirstMetadataFields}
      uniqueValuesPerField={uniqueValuesPerField}
    />,
  );

  await expect.element(screen.getByRole('button', { name: 'Sorted by Habitat' })).toBeVisible();
  await screen.getByRole('button', { name: 'Sorted by Habitat' }).click();

  clickPopoverIconButton();
  await expect.element(screen.getByRole('button', { name: 'Sort' })).toBeVisible();
});

test('sets group field and clears group selection', async () => {
  const screen = await renderWithProviders(
    <QueryOperationsButtonsHarness
      initialGroupFields={['habitat']}
      initialGroupOrders={['asc']}
      metadataFields={textFirstMetadataFields}
      uniqueValuesPerField={uniqueValuesPerField}
    />,
  );

  await expect.element(screen.getByRole('button', { name: 'Grouped by Habitat' })).toBeVisible();
  await screen.getByRole('button', { name: 'Grouped by Habitat' }).click();

  clickPopoverIconButton();
  await expect.element(screen.getByRole('button', { name: 'Group' })).toBeVisible();
});

test('creates a text rule and clears it from the filter popover', async () => {
  const screen = await renderWithProviders(
    <QueryOperationsButtonsHarness
      metadataFields={textFirstMetadataFields}
      uniqueValuesPerField={uniqueValuesPerField}
    />,
  );

  await screen.getByRole('button', { name: 'Filter' }).click();
  await screen.getByRole('button', { name: '+ Rule' }).click();

  setInputValue(getValueEditorInput(), 'lion');

  expect(getQueryState()).toEqual(expect.objectContaining({
    combinator: 'and',
    rules: [
      expect.objectContaining({
        field: 'notes',
        operator: 'contains',
        value: 'lion',
        valueSource: 'value',
      }),
    ],
  }));
  await expect.element(screen.getByRole('button', { name: 'Filtered by Notes' })).toBeVisible();

  await screen.getByRole('button', { name: 'Clear all' }).click();

  expect(getQueryState()).toEqual(initialQuery);
  await expect.element(screen.getByRole('button', { name: 'Filter' })).toBeVisible();
});

test('switches select filters to multi-value mode for "is any of"', async () => {
  const screen = await renderWithProviders(
    <QueryOperationsButtonsHarness
      metadataFields={selectFirstMetadataFields}
      uniqueValuesPerField={uniqueValuesPerField}
    />,
  );

  await screen.getByRole('button', { name: 'Filter' }).click();
  await screen.getByRole('button', { name: '+ Rule' }).click();

  openRuleSelect('.rule-operators .ant-select-selector');
  await screen.getByText('is any of').click();

  const queryAfterOperatorChange = getQueryState();
  // multi-select operators should set the value to an array, even if no values have been selected yet
  expect(Array.isArray((queryAfterOperatorChange.rules[0] as RuleType).value)).toBe(true);

  expect(document.querySelector('.rule-value .ant-select-multiple')).not.toBeNull();
  expect(getQueryState()).toEqual(expect.objectContaining({
    combinator: 'and',
    rules: [
      expect.objectContaining({
        field: 'habitat',
        operator: 'in',
        valueSource: 'value',
      }),
    ],
  }));
  await expect.element(screen.getByRole('button', { name: 'Filtered by Habitat' })).toBeVisible();
});

test('hides value editor for "is empty" operators', async () => {
  const screen = await renderWithProviders(
    <QueryOperationsButtonsHarness
      metadataFields={selectFirstMetadataFields}
      uniqueValuesPerField={uniqueValuesPerField}
    />,
  );

  await screen.getByRole('button', { name: 'Filter' }).click();
  await screen.getByRole('button', { name: '+ Rule' }).click();

  openRuleSelect('.rule-operators .ant-select-selector');
  await screen.getByText('is empty').click();

  expect(getQueryState()).toEqual(expect.objectContaining({
    combinator: 'and',
    rules: [expect.objectContaining({ field: 'habitat', operator: 'null', valueSource: 'value' })],
  }));
  expect(document.querySelector('.rule-value input, .rule-value textarea, .rule-value .ant-select')).toBeNull();
});

test('hides value editor for "is not empty" operators', async () => {
  const screen = await renderWithProviders(
    <QueryOperationsButtonsHarness
      metadataFields={selectFirstMetadataFields}
      uniqueValuesPerField={uniqueValuesPerField}
    />,
  );

  await screen.getByRole('button', { name: 'Filter' }).click();
  await screen.getByRole('button', { name: '+ Rule' }).click();

  openRuleSelect('.rule-operators .ant-select-selector');
  await screen.getByText('is not empty').click();

  expect(getQueryState()).toEqual(expect.objectContaining({
    combinator: 'and',
    rules: [expect.objectContaining({ field: 'habitat', operator: 'notNull', valueSource: 'value' })],
  }));
  expect(document.querySelector('.rule-value input, .rule-value textarea, .rule-value .ant-select')).toBeNull();
});

test('preserves render-aware labels when select filters switch to multi-value mode', async () => {
  const screen = await renderWithProviders(
    <QueryOperationsButtonsHarness
      metadataFields={renderAwareSelectMetadataFields}
      uniqueValuesPerField={uniqueValuesPerField}
    />,
  );

  await screen.getByRole('button', { name: 'Filter' }).click();
  await screen.getByRole('button', { name: '+ Rule' }).click();

  openRuleSelect('.rule-operators .ant-select-selector');
  await screen.getByText('is any of').click();

  expect(document.querySelector('.rule-value .ant-select-multiple')).not.toBeNull();

  openRuleSelect('.rule-value .ant-select-selector');
  clickFirstDropdownOption();

  const nextQuery = getQueryState();
  expect(nextQuery).toEqual(expect.objectContaining({
    combinator: 'and',
    rules: [
      expect.objectContaining({
        field: 'annotation_status',
        operator: 'in',
        valueSource: 'value',
      }),
    ],
  }));

  const rawSelectedValue = (nextQuery.rules[0] as RuleType).value;
  expect(Array.isArray(rawSelectedValue)).toBe(true);
  const selectedValues = (rawSelectedValue as string[]).map(String);
  expect(selectedValues.length).toBeGreaterThan(0);
  expect(uniqueValuesPerField.annotation_status).toContain(selectedValues[0]);

  const expectedRenderedLabel = selectedValues[0]
    .split(' ')
    .map(part => part.charAt(0).toLocaleUpperCase() + part.slice(1))
    .join(' ');
  expect(document.querySelector('.rule-value')?.textContent?.toLocaleLowerCase()).toContain(
    expectedRenderedLabel.toLocaleLowerCase()
  );
});

test('allows deselecting render-aware multiselect values', async () => {
  const screen = await renderWithProviders(
    <QueryOperationsButtonsHarness
      initialQuery={{
        combinator: 'and',
        rules: [
          {
            field: 'annotation_status',
            operator: 'in',
            value: ['to annotate'],
            valueSource: 'value',
          },
        ],
      }}
      metadataFields={renderAwareSelectMetadataFields}
      uniqueValuesPerField={uniqueValuesPerField}
    />,
  );

  await screen.getByRole('button', { name: 'Filter' }).click();

  const populatedValue = (getQueryState().rules[0] as RuleType).value;
  expect(Array.isArray(populatedValue)).toBe(true);
  const hasSelectedValue = (populatedValue as unknown[]).length > 0;
  expect(hasSelectedValue).toBe(true);

  const closeIcons = Array.from(document.querySelectorAll('.rule-value .anticon-close-circle')) as HTMLElement[];
  if (closeIcons.length === 0) throw new Error('Could not find render-aware tag close icon');
  for (const closeIcon of closeIcons) {
    closeIcon.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
    closeIcon.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, composed: true }));
    closeIcon.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  }
  await Promise.resolve();

  const nextValue = (getQueryState().rules[0] as RuleType).value;
  expect(Array.isArray(nextValue)).toBe(true);
  const hasRemainingValue = (nextValue as unknown[]).length > 0;
  expect(hasRemainingValue).toBe(false);
});
