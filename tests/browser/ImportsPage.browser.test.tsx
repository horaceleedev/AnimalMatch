import { beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

// Only the network leg is mocked - validation, hashing, thumbnailing and web
// optimisation run for real against fixture files. See ImportsPage.test.tsx
// for the jsdom version that mocks those out to test page state in isolation.
vi.mock("../../src/importUploadAdapters", () => ({
  pocketBaseVideoUploadAdapter: { uploadVideo: vi.fn() },
}));
vi.mock("../../src/DataStores", () => ({
  useVideoStore: vi.fn(),
}));

import { pocketBaseVideoUploadAdapter } from "../../src/importUploadAdapters";
import { useVideoStore } from "../../src/DataStores";
import { renderWithProviders } from "../helpers/browserRender";
import ImportsPage from "../../src/routes/ImportsPage";

const faststartVideoUrl = new URL("../fixtures/videos/faststart.mp4", import.meta.url).href;
const invalidVideoUrl = new URL("../fixtures/videos/invalid.mp4", import.meta.url).href;

const fileFromFixture = async (url: string, filename: string, type = "video/mp4") => {
  const response = await fetch(url);
  const blob = await response.blob();

  return new File([blob], filename, { type });
};

const mockedUploadVideo = vi.mocked(pocketBaseVideoUploadAdapter.uploadVideo);
const mockedUseVideoStore = vi.mocked(useVideoStore);

describe("ImportsPage (real video pipeline)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseVideoStore.mockImplementation((selector) => selector({ processedRecords: [] } as never));
  });

  it("validates, hashes, and thumbnails a real video, then retries a failed upload", async () => {
    mockedUploadVideo.mockRejectedValueOnce(new Error("Upload failed"));

    const screen = await renderWithProviders(<ImportsPage />);
    const file = await fileFromFixture(faststartVideoUrl, "faststart.mp4");
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(fileInput, file);

    await expect.element(screen.getByText("faststart.mp4")).toBeVisible();
    await expect.element(screen.getByText("valid", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: /Upload/ }).click();
    await expect.element(screen.getByText("failed", { exact: true })).toBeVisible();

    const retryButton = screen.getByRole("button", { name: /Retry upload for faststart\.mp4/ });
    await expect.element(retryButton).toBeVisible();

    mockedUploadVideo.mockResolvedValueOnce({ id: "video-1", filename: "faststart.mp4" });
    await retryButton.click();

    await expect.element(screen.getByText("uploaded", { exact: true })).toBeVisible();
    expect(mockedUploadVideo).toHaveBeenCalledTimes(2);
  }, 15000);

  it("marks a genuinely invalid MP4 as invalid rather than ready to upload", async () => {
    const screen = await renderWithProviders(<ImportsPage />);
    const file = await fileFromFixture(invalidVideoUrl, "invalid.mp4");
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(fileInput, file);

    // A lone invalid video is a small enough group to auto-expand, so no need to click to open it.
    await expect.element(screen.getByText("invalid", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: /Upload/ })).toBeDisabled();
    expect(mockedUploadVideo).not.toHaveBeenCalled();
  }, 15000);
});
