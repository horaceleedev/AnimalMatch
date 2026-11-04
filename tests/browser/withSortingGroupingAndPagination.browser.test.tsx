import React from 'react';
import { expect, test } from 'vitest';
import type { RecordModel } from 'pocketbase';

import withSortingGroupingAndPagination from '../../src/components/grid-views/withSortingGroupingAndPagination';
import type { MetadataFieldsType } from '../../src/types';
import { renderWithProviders } from '../helpers/browserRender';

// Pagination behaviour depends on real layout and scrolling, so these tests run in browser mode.

const ITEM_HEIGHT = 40;
const HEADER_HEIGHT = 100;

interface BasicItemsGridViewProps {
  items: RecordModel[];
  itemsMetadataFields: MetadataFieldsType;
}

const BasicItemsGridView = (props: BasicItemsGridViewProps) => (
  // Expose the received prop names so that tests can check which props are passed through
  <div data-testid="basic-grid-view" data-prop-names={Object.keys(props).join(',')}>
    {props.items.map(item => (
      <div key={item.id} style={{ height: ITEM_HEIGHT }}>{item.name}</div>
    ))}
  </div>
);

const ItemsGridView = withSortingGroupingAndPagination<BasicItemsGridViewProps, RecordModel>(
  BasicItemsGridView,
  { processedRecordsProp: 'items', metadataFieldsProp: 'itemsMetadataFields', pageSize: 50 },
);

const makeItems = (count: number): RecordModel[] => Array.from({ length: count }, (_, i) => ({
  collectionId: 'items',
  collectionName: 'items',
  id: `item-${i + 1}`,
  name: `Item ${i + 1}`,
}));

const items = makeItems(120);

const Harness = ({ items, paginationResetKey }: { items: RecordModel[]; paginationResetKey?: string }) => (
  <div data-testid="scroll-container" style={{ height: 300, overflowY: 'scroll' }}>
    <div style={{ height: HEADER_HEIGHT }}>Header</div>
    <ItemsGridView items={items} itemsMetadataFields={{}} paginationResetKey={paginationResetKey} />
  </div>
);

test('resets to the first page only when paginationResetKey changes', async () => {
  const screen = await renderWithProviders(<Harness items={items} paginationResetKey="all" />);

  await screen.getByTitle('Next Page').click();
  await expect.element(screen.getByText('Item 51', { exact: true })).toBeInTheDocument();

  // Re-rendering with new records (e.g. after a record is edited) but the same key keeps the current page
  await screen.rerender(<Harness items={[...items]} paginationResetKey="all" />);
  await expect.element(screen.getByText('Item 51', { exact: true })).toBeInTheDocument();

  // Changing the key (e.g. selecting another sider tab) goes back to the first page
  await screen.rerender(<Harness items={items.slice(0, 80)} paginationResetKey="mine" />);
  await expect.element(screen.getByText('Item 1', { exact: true })).toBeInTheDocument();
  expect(screen.getByText('Item 51', { exact: true }).query()).toBeNull();
});

test('scrolls back up to the top of the grid view when changing pages', async () => {
  const screen = await renderWithProviders(<Harness items={items} />);
  const container = screen.getByTestId('scroll-container').element() as HTMLDivElement;

  // Scroll down to the pagination buttons at the bottom of the grid view
  container.scrollTop = container.scrollHeight;
  expect(container.scrollTop).toBeGreaterThan(HEADER_HEIGHT);

  await screen.getByTitle('Next Page').click();
  await expect.element(screen.getByText('Item 51', { exact: true })).toBeInTheDocument();

  // The top of the grid view is visible again (with a small margin above it), without scrolling past it to the header
  expect(container.scrollTop).toBe(HEADER_HEIGHT - 16);
});

test('scrolls back up to the top of the grid view when paginationResetKey changes', async () => {
  const screen = await renderWithProviders(<Harness items={items} paginationResetKey="all" />);
  const container = screen.getByTestId('scroll-container').element() as HTMLDivElement;

  container.scrollTop = container.scrollHeight;
  expect(container.scrollTop).toBeGreaterThan(HEADER_HEIGHT);

  // Re-rendering with the same key leaves the scroll position alone
  const scrollTopBefore = container.scrollTop;
  await screen.rerender(<Harness items={[...items]} paginationResetKey="all" />);
  expect(container.scrollTop).toBe(scrollTopBefore);

  await screen.rerender(<Harness items={items.slice(0, 80)} paginationResetKey="mine" />);
  await expect.element(screen.getByText('Item 1', { exact: true })).toBeInTheDocument();
  expect(container.scrollTop).toBe(HEADER_HEIGHT - 16);
});

test('does not re-render endlessly when paginationResetKey is NaN', async () => {
  const screen = await renderWithProviders(
    <div>
      <ItemsGridView items={items} itemsMetadataFields={{}} paginationResetKey={NaN} />
    </div>
  );
  await expect.element(screen.getByText('Item 1', { exact: true })).toBeInTheDocument();
});

test('does not pass paginationResetKey on to the basic grid view', async () => {
  const screen = await renderWithProviders(<Harness items={items} paginationResetKey="all" />);
  const propNames = screen.getByTestId('basic-grid-view').element().getAttribute('data-prop-names')!.split(',');
  expect(propNames).toContain('items');
  expect(propNames).not.toContain('paginationResetKey');
});
