import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import type { UserRecord } from "../../src/types";
import { render, screen } from "../helpers/render";

let currentUser: UserRecord | null = null;

vi.mock("../../src/DataStores", () => ({
  useAuth: () => ({
    user: currentUser,
    isEditor: currentUser?.role === "editor",
  }),
}));

import { ProtectedRoute } from "../../src/routes/ProtectedRoute";

const renderEditorRoute = () => {
  const router = createMemoryRouter([
    {
      path: "/import",
      element: (
        <ProtectedRoute editorOnly>
          <div>Import page</div>
        </ProtectedRoute>
      ),
    },
    { path: "/videos", element: <div>Videos page</div> },
    { path: "/login", element: <div>Login page</div> },
  ], { initialEntries: ["/import"] });

  render(<RouterProvider router={router} />);
};

describe("ProtectedRoute editor access", () => {
  beforeEach(() => {
    currentUser = null;
  });

  it("renders an editor-only route for editors", async () => {
    currentUser = { role: "editor" } as UserRecord;

    renderEditorRoute();

    expect(await screen.findByText("Import page")).toBeInTheDocument();
  });

  it("redirects viewers away from an editor-only route", async () => {
    currentUser = { role: "viewer" } as UserRecord;

    renderEditorRoute();

    expect(await screen.findByText("Videos page")).toBeInTheDocument();
  });

  it("still redirects signed-out users to login", async () => {
    renderEditorRoute();

    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });
});
