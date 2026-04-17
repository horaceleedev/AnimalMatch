import { expect, test } from '@playwright/test';

// This is an example of an end-to-end Playwright test.
// Unlike the Vitest component tests, we do not mock app internals here; we load the app in a real browser and assert on what the user sees.
// Here it is very simple but this often means mocking the database layer rather than the UI layer, 
// We can set up specific scenarios and test the real behaviour of the app in those scenario.
// Examples might be filling out forms, testing navigation betwen pages, testing user permissions etc. (what can a logged out/logged in/admin user see and do?)
// TODO(ADW): We need to setup msw (or similar) to mock the pocketbase before we tackle sophisticated e2e.
test('redirects protected routes to the login page', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Log in to AnimalMatch')).toBeVisible();
});

// E2E tests are best kept focused on stable, user-visible flows rather than implementation details.
// I personally think of them as user stories, a user might go to a page, fill out a form, see the result, then navigate away.
test('shows validation errors before submitting empty credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page.getByText('Please enter your username or email')).toBeVisible();
  await expect(page.getByText('Please enter your password')).toBeVisible();
});
