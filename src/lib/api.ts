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
import type { ConfigValue, CreateConfigValueRequest } from "./types";
import {
  mockApproveConfigValue,
  mockCreateConfigValue,
  mockGetApproval,
  mockListApprovals,
  mockRejectConfigValue,
  mockRequestChangesConfigValue,
} from "./api.mock";

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

/** Fetches a single ConfigValue by id. Throws on 404 / non-2xx. */
export async function getConfigValue(id: string): Promise<ConfigValue> {
  return fetcher<ConfigValue>(`/api/config/values/${encodeURIComponent(id)}`);
}

/**
 * Drafts a new ConfigValue. The backend POST endpoint is not yet implemented;
 * when `VITE_USE_MOCK_API === "true"` (or the live request fails) we fall back
 * to a synthetic mock so the form is exercisable end-to-end in preview.
 */
export async function createConfigValue(
  body: CreateConfigValueRequest,
): Promise<ConfigValue> {
  if (import.meta.env.VITE_USE_MOCK_API === "true") {
    return mockCreateConfigValue(body);
  }
  try {
    return await fetcher<ConfigValue>("/api/config/values", {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch {
    return mockCreateConfigValue(body);
  }
}

/**
 * Approvals queue: every record in `draft` or `pending` status. The Phase 1
 * backend is read-only, so we attempt the live `?status=` filter and fall
 * back to the in-memory mock pool on any failure.
 */
export async function listApprovals(): Promise<ListConfigValuesResponse> {
  if (import.meta.env.VITE_USE_MOCK_API === "true") {
    return mockListApprovals();
  }
  try {
    const [draft, pending] = await Promise.all([
      fetcher<ListConfigValuesResponse>("/api/config/values?status=draft"),
      fetcher<ListConfigValuesResponse>("/api/config/values?status=pending"),
    ]);
    return {
      values: [...draft.values, ...pending.values],
      count: draft.count + pending.count,
    };
  } catch {
    return mockListApprovals();
  }
}

/**
 * Live → mock fallback for a single approvals item. Used by the review page
 * so deep-links keep working even when the backend POST endpoints aren't up.
 */
export async function getApproval(id: string): Promise<ConfigValue | null> {
  if (import.meta.env.VITE_USE_MOCK_API === "true") {
    return mockGetApproval(id);
  }
  try {
    return await getConfigValue(id);
  } catch {
    return mockGetApproval(id);
  }
}

export async function approveConfigValue(
  id: string,
  body: { approved_by: string; comment: string },
): Promise<ConfigValue> {
  if (import.meta.env.VITE_USE_MOCK_API === "true") {
    return mockApproveConfigValue(id, body);
  }
  try {
    return await fetcher<ConfigValue>(
      `/api/config/values/${encodeURIComponent(id)}/approve`,
      { method: "POST", body: JSON.stringify(body) },
    );
  } catch {
    return mockApproveConfigValue(id, body);
  }
}

export async function requestChangesConfigValue(
  id: string,
  body: { reviewer: string; comment: string },
): Promise<ConfigValue> {
  if (import.meta.env.VITE_USE_MOCK_API === "true") {
    return mockRequestChangesConfigValue(id, body);
  }
  try {
    return await fetcher<ConfigValue>(
      `/api/config/values/${encodeURIComponent(id)}/request-changes`,
      { method: "POST", body: JSON.stringify(body) },
    );
  } catch {
    return mockRequestChangesConfigValue(id, body);
  }
}

export async function rejectConfigValue(
  id: string,
  body: { reviewer: string; comment: string },
): Promise<ConfigValue> {
  if (import.meta.env.VITE_USE_MOCK_API === "true") {
    return mockRejectConfigValue(id, body);
  }
  try {
    return await fetcher<ConfigValue>(
      `/api/config/values/${encodeURIComponent(id)}/reject`,
      { method: "POST", body: JSON.stringify(body) },
    );
  } catch {
    return mockRejectConfigValue(id, body);
  }
}

/**
 * Resolves the currently-effective ConfigValue for a (key, jurisdiction)
 * at `evaluation_date`. Returns null when no prior version exists. Falls
 * back to scanning MOCK_CONFIG_VALUES when the backend is unreachable.
 */
export async function resolveCurrentConfigValue(
  key: string,
  jurisdictionId: string | null,
  evaluationDate: string,
): Promise<ConfigValue | null> {
  const params = new URLSearchParams({ key, evaluation_date: evaluationDate });
  if (jurisdictionId) params.set("jurisdiction_id", jurisdictionId);
  try {
    return await fetcher<ConfigValue>(
      `/api/config/resolve?${params.toString()}`,
    );
  } catch {
    const { MOCK_CONFIG_VALUES } = await import("./mock-config-values");
    const evalTs = new Date(evaluationDate).getTime();
    const candidates = MOCK_CONFIG_VALUES.filter((v) => {
      if (v.key !== key) return false;
      if ((v.jurisdiction_id ?? null) !== (jurisdictionId ?? null)) return false;
      if (v.status !== "approved") return false;
      const from = new Date(v.effective_from).getTime();
      if (from > evalTs) return false;
      const to = v.effective_to ? new Date(v.effective_to).getTime() : null;
      if (to !== null && to < evalTs) return false;
      return true;
    });
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.effective_from.localeCompare(a.effective_from));
    return candidates[0];
  }
}
