import { expect, test, vi } from 'vitest';

import { renderWithProviders } from '../helpers/browserRender';
import RecordActionsButton from '../../src/components/ui/RecordActionsButton';


// This test is an example of how to write a browser-mode component test using Vitest.
// The reason for this in this case is because we are using the clipboard,which requires a real browser env.
// Other examples would be: portals of any kind, tab order, drag and drop, scrolling, sticky elements etc.
// As well as any browser api beyond the DOM, intersectionobservers, localStorage, etc.
// We would also use this mode for testing things that require real DOM APIs like layout,
// or where we want to test the real behaviour of a component including its children and not mock any part of it.
// NOTE:: Wwe can do any tests in browser mode, but its more complex than just using jsdom.

// In this test we mock the clipboard API to check if clicking copy-link gives the correct feedback and copies the correct URL.
test('copies a record link using the current base path', async () => {
  const base = document.createElement('base');
  // We have to manually set the base path that will later be called by the component.
  base.href = 'https://animalmatch.test/app/';
  document.head.append(base);

  const screen = await renderWithProviders(
    <RecordActionsButton
      deleteFunction={vi.fn()}
      onDelete={vi.fn()}
      recordId="individual-1"
      recordType="individual"
    />,
  );
  // We mock the clipboard API to check if the correct URL is copied when clicking the copy-link button.
  const writeText = vi.mocked(navigator.clipboard.writeText);
  // The standard way of interacting with the DOM is to select elements by their role/name/class and trigger events.
  await screen.getByRole('button', { name: 'More options' }).click();
  await screen.getByText('Copy link').click();
  // Assertions can be made, often we might have a chain of actions interspersed with assertions rather than a more typical testing style of "arrange-act-assert".
  expect(writeText).toHaveBeenCalledWith('https://animalmatch.test/app/individuals/individual-1');
  await expect.element(screen.getByText('Link copied')).toBeVisible();
});
