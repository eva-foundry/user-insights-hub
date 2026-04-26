import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import en from "@/messages/en.json";
import { Route as ImpactFileRoute } from "@/routes/impact";

function renderImpactAt(initialPath: string) {
  const rootRoute = createRootRoute({
    component: () => (
      <IntlProvider locale="en" messages={en as Record<string, string>}>
        <Outlet />
      </IntlProvider>
    ),
  });
  // Re-host the file-based /impact route under our test root.
  const impactRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/impact",
    component: ImpactFileRoute.options.component!,
    validateSearch: ImpactFileRoute.options.validateSearch!,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([impactRoute]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  return { router, ...render(<RouterProvider router={router} />) };
}

describe("/impact route integration", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("pre-fills the input from ?citation= and runs the query immediately", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline → mock fallback"));
    renderImpactAt("/impact?citation=OAS");
    const input = await screen.findByTestId<HTMLInputElement>("impact-search");
    expect(input.value).toBe("OAS");
    // Mock fallback returns OAS matches grouped by jurisdiction.
    await waitFor(() => {
      expect(screen.getByText(/referencing/i)).toBeInTheDocument();
    });
  });

  it("debounces typed input and pushes ?citation= to the URL", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    const { router } = renderImpactAt("/impact");
    const input = await screen.findByTestId<HTMLInputElement>("impact-search");

    fireEvent.change(input, { target: { value: "OAS" } });
    // Before debounce window elapses the URL is unchanged.
    expect(router.state.location.search).not.toMatchObject({ citation: "OAS" });

    await act(async () => {
      vi.advanceTimersByTime(260);
    });
    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ citation: "OAS" });
    });
  });

  it("renders the empty state when the query has no matches", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    renderImpactAt("/impact?citation=zzz-no-match-zzz");
    await waitFor(() => {
      expect(screen.getByTestId("impact-empty")).toBeInTheDocument();
    });
  });

  it("shows an error banner and recovers via Retry", async () => {
    // First call (initial load) — succeeds with empty result via JSON,
    // but we want to exercise the error state, so mock a thrown response.
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    // Make the *typed* path go through fetch, then throw via Response.json().
    fetchSpy.mockResolvedValueOnce(
      new Response("not json", { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    renderImpactAt("/impact?citation=OAS");
    const banner = await screen.findByTestId("impact-error");
    expect(banner).toBeInTheDocument();

    // Retry now succeeds via the mock fallback (network rejected → mock).
    fetchSpy.mockRejectedValueOnce(new Error("offline"));
    fireEvent.click(screen.getByTestId("impact-retry"));
    await waitFor(() => {
      expect(screen.queryByTestId("impact-error")).toBeNull();
    });
  });

  it("paginates results when limit is set in the URL", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    renderImpactAt("/impact?citation=a&limit=10");
    await waitFor(() => {
      expect(screen.getByTestId("impact-page-status")).toBeInTheDocument();
    });
    const limitSelect = screen.getByTestId<HTMLSelectElement>("impact-limit");
    expect(limitSelect.value).toBe("10");
  });
});