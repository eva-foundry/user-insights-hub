const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://127.0.0.1:8000";

/**
 * Minimal fetch wrapper for the GovOps FastAPI backend.
 * Set VITE_API_BASE_URL to point at a deployed endpoint; otherwise consumers
 * should fall back to mock data (the FastAPI dev server is not reachable from
 * the cloud preview).
 */
export async function fetcher<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

/**
 * fetchOrMock: try the configured backend; on failure, return the supplied
 * mock payload. Lets feature pages render in preview without a live API.
 */
export async function fetchOrMock<T>(path: string, mock: T, init?: RequestInit): Promise<T> {
  try {
    return await fetcher<T>(path, init);
  } catch {
    // Simulate latency so loading states are visible during development.
    await new Promise((r) => setTimeout(r, 200));
    return mock;
  }
}

import type {
  ListConfigValuesParams,
  ListConfigValuesResponse,
  ListVersionsResponse,
} from "./types";

export async function listConfigValues(
  params: ListConfigValuesParams,
): Promise<ListConfigValuesResponse> {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== "" && v !== "all",
  ) as [string, string][];
  const qs = new URLSearchParams(entries).toString();
  return fetcher<ListConfigValuesResponse>(`/api/config/values${qs ? `?${qs}` : ""}`);
}

/**
 * Fetches the full version history for a single (key, jurisdiction_id) pair.
 * `jurisdictionId === "global"` is treated as the null-jurisdiction (omitted).
 */
export async function listVersions(
  key: string,
  jurisdictionId: string | null,
  language?: string,
): Promise<ListVersionsResponse> {
  const params = new URLSearchParams({ key });
  if (jurisdictionId && jurisdictionId !== "global") {
    params.set("jurisdiction_id", jurisdictionId);
  }
  if (language) params.set("language", language);
  return fetcher<ListVersionsResponse>(`/api/config/versions?${params.toString()}`);
}
