import { describe, expect, it, vi } from "vitest";

import AppHeader from "../../src/components/AppHeader";
import type { UserRecord, UserRole } from "../../src/types";
import { renderWithProviders, screen, userEvent } from "../helpers/render";

const makeUser = (role: UserRole) => ({
  name: "Test User",
  username: "test-user",
  role,
} as UserRecord);

describe("AppHeader import navigation", () => {
  it("shows Import videos to editors", async () => {
    renderWithProviders(
      <AppHeader currentMenuPage="videos" user={makeUser("editor")} isEditor logout={vi.fn()} />,
    );

    await userEvent.hover(screen.getByText("Media"));

    expect(await screen.findByText("Import videos")).toBeInTheDocument();
  });

  it("does not show Import videos to viewers", async () => {
    renderWithProviders(
      <AppHeader currentMenuPage="videos" user={makeUser("viewer")} isEditor={false} logout={vi.fn()} />,
    );

    await userEvent.hover(screen.getByText("Media"));
    await screen.findByText("Source videos");

    expect(screen.queryByText("Import videos")).not.toBeInTheDocument();
  });
});
