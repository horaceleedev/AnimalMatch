import { expect, test } from "@playwright/test";

const PB_BASE_URL = "https://meru.robots.ox.ac.uk/animalmatch-dev";
const TEST_TOKEN = [
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
  "eyJleHAiOjQxMDI0NDQ4MDAsInR5cGUiOiJhdXRoIiwiY29sbGVjdGlvbklkIjoidXNlcnMifQ",
  "test-signature",
].join(".");

const makeUserRecord = () => ({
  collectionId: "users",
  collectionName: "users",
  created: "2026-01-01T00:00:00.000Z",
  updated: "2026-01-01T00:00:00.000Z",
  id: "user-1",
  username: "demo-user",
  verified: true,
  emailVisibility: true,
  email: "demo@example.com",
  name: "Demo User",
  avatar: "",
});

const makeVideoRecord = (overrides: Record<string, unknown> = {}) => ({
  collectionId: "videos",
  collectionName: "videos",
  created: "2026-01-01T00:00:00.000Z",
  updated: "2026-01-01T00:00:00.000Z",
  id: "video-1",
  filename: "alpha.mp4",
  file: "alpha.mp4",
  thumbnail: "alpha.jpg",
  habitat: "forest",
  location_name: "Meru",
  month_of_SD_retrieval: "January",
  notes: "",
  recording_date: "2026-01-01 00:00:00",
  utm_easting: 500000,
  utm_northing: 100000,
  altitude: 0,
  num_individuals: 1,
  custom_tags: [],
  assignees: [],
  annotation_status: "to annotate",
  ...overrides,
});

test("batch edits annotation status for all selected videos", async ({ page }) => {
  const userRecord = makeUserRecord();
  const videos = [
    makeVideoRecord({ id: "video-1", filename: "alpha.mp4", file: "alpha.mp4", thumbnail: "alpha.jpg" }),
    makeVideoRecord({ id: "video-2", filename: "beta.mp4", file: "beta.mp4", thumbnail: "beta.jpg" }),
  ];
  const updatedRequests: Array<{ id: string; payload: unknown }> = [];

  await page.addInitScript(({ seededUser, seededToken }) => {
    window.localStorage.setItem(
      "pocketbase_auth",
      JSON.stringify({
        token: seededToken,
        record: seededUser,
      }),
    );
  }, { seededUser: userRecord, seededToken: TEST_TOKEN });

  await page.route(`${PB_BASE_URL}/api/realtime*`, async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream" },
        body: 'id: 0\nevent: PB_CONNECT\ndata: {"clientId":"test-client"}\n\n',
      });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: { "content-type": "application/json" },
      body: "{}",
    });
  });

  await page.route(`${PB_BASE_URL}/api/files/**`, async (route) => {
    await route.fulfill({ status: 204, body: "" });
  });

  await page.route(`${PB_BASE_URL}/api/collections/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;

    if (pathname.endsWith("/users/auth-with-password")) {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: TEST_TOKEN,
          record: userRecord,
        }),
      });
      return;
    }

    if (pathname.endsWith("/users/auth-refresh")) {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: TEST_TOKEN,
          record: userRecord,
        }),
      });
      return;
    }

    if (request.method() === "GET" && pathname.endsWith("/users/records")) {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          page: 1,
          perPage: 200,
          totalItems: 1,
          totalPages: 1,
          items: [userRecord],
        }),
      });
      return;
    }

    if (request.method() === "GET" && pathname.endsWith("/videos/records")) {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          page: 1,
          perPage: 200,
          totalItems: videos.length,
          totalPages: 1,
          items: videos,
        }),
      });
      return;
    }

    if (request.method() === "GET" && pathname.endsWith("/individuals/records")) {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          page: 1,
          perPage: 200,
          totalItems: 0,
          totalPages: 1,
          items: [],
        }),
      });
      return;
    }

    if (request.method() === "GET" && pathname.endsWith("/crops/records")) {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          page: 1,
          perPage: 200,
          totalItems: 0,
          totalPages: 1,
          items: [],
        }),
      });
      return;
    }

    if (request.method() === "PATCH" && /\/videos\/records\/[^/]+$/.test(pathname)) {
      const recordId = pathname.split("/").pop()!;
      const payload = request.postDataJSON();
      updatedRequests.push({ id: recordId, payload });

      const index = videos.findIndex((video) => video.id === recordId);
      videos[index] = {
        ...videos[index],
        ...(payload as Record<string, unknown>),
      };

      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(videos[index]),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: { "content-type": "application/json" },
      body: "{}",
    });
  });

  await page.goto("/videos");
  await expect(page).toHaveURL(/\/videos$/);
  await expect(page.getByText("alpha.mp4")).toBeVisible();
  await expect(page.getByText("beta.mp4")).toBeVisible();

  await page.getByRole("switch", { name: /Exit Multi-select/ }).click();
  await page.getByRole("checkbox", { name: "Select all" }).click();
  await page.getByRole("button", { name: /Batch edit/ }).click();

  await page
    .locator(".batch-edit-form .ant-form-item")
    .filter({ has: page.locator("#annotation_status") })
    .locator(".ant-select-selector")
    .click();
  await page.getByRole("option", { name: "reviewed" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect.poll(() => updatedRequests.length).toBe(2);
  expect(updatedRequests).toEqual([
    { id: "video-1", payload: { annotation_status: "reviewed" } },
    { id: "video-2", payload: { annotation_status: "reviewed" } },
  ]);

  await expect(page.getByRole("button", { name: /Batch edit/ })).toBeDisabled();
});
