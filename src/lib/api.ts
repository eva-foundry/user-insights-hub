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

import type {
  ListConfigValuesParams,
  ListConfigValuesResponse,
  ListVersionsResponse,
} from "./types";
import type { ConfigValue, CreateConfigValueRequest } from "./types";
import { MOCK_CONFIG_VALUES } from "./mock-config-values";

/**
 * Lazy mock loader — dynamic import so production bundles tree-shake the
 * mock module (and its sample data) when not exercised. In preview/dev
 * builds the import resolves on first failure.
 */
const loadMocks = () => import("./api.mock");

const isMockMode = () => import.meta.env.VITE_USE_MOCK_API === "true";

/**
 * fetchOrMock: try the configured backend; on failure, return the supplied
 * mock payload. Lets feature pages render in preview without a live API.
 */
export async function fetchOrMock<T>(path: string, mock: T, init?: RequestInit): Promise<T> {
  try {
    return await fetcher<T>(path, init);
  } catch {
    await new Promise((r) => setTimeout(r, 200));
    return mock;
  }
}

// ---- Fixture batches (govops-008) ------------------------------------------

export interface FixtureBatchSummary {
  id: string;
  jurisdiction_id: string;
  document_title: string;
  document_citation: string;
  text_length: number;
  created_at: string;
}

export interface FixtureRunResult {
  fixture_id: string;
  prompt_key: string;
  proposals_count: number;
  proposals: Array<{
    rule_type: string;
    description: string;
    citation: string;
    parameters: Record<string, unknown>;
  }>;
  raw_response: string;
  latency_ms: number;
  token_count: number | null;
}

export async function listFixtures(): Promise<FixtureBatchSummary[]> {
  if (isMockMode()) return (await loadMocks()).mockListFixtures();
  try {
    return await fetcher<FixtureBatchSummary[]>("/api/encode/fixtures");
  } catch {
    return (await loadMocks()).mockListFixtures();
  }
}

export async function runFixtureWithPrompt(
  fixtureId: string,
  body: { prompt_text: string; prompt_key: string },
): Promise<FixtureRunResult> {
  if (isMockMode()) return (await loadMocks()).mockRunFixtureWithPrompt(fixtureId, body);
  try {
    return await fetcher<FixtureRunResult>(
      `/api/encode/fixtures/${encodeURIComponent(fixtureId)}/run-with-prompt`,
      { method: "POST", body: JSON.stringify(body) },
    );
  } catch {
    return (await loadMocks()).mockRunFixtureWithPrompt(fixtureId, body);
  }
}

export async function listConfigValues(
  params: ListConfigValuesParams,
): Promise<ListConfigValuesResponse> {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== "" && v !== "all",
  ) as [string, string][];
  const qs = new URLSearchParams(entries).toString();
  return fetcher<ListConfigValuesResponse>(`/api/config/values${qs ? `?${qs}` : ""}`);
}

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

export async function getConfigValue(id: string): Promise<ConfigValue> {
  return fetcher<ConfigValue>(`/api/config/values/${encodeURIComponent(id)}`);
}

export async function createConfigValue(body: CreateConfigValueRequest): Promise<ConfigValue> {
  if (isMockMode()) return (await loadMocks()).mockCreateConfigValue(body);
  try {
    return await fetcher<ConfigValue>("/api/config/values", {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch {
    return (await loadMocks()).mockCreateConfigValue(body);
  }
}

export async function listApprovals(): Promise<ListConfigValuesResponse> {
  if (isMockMode()) return (await loadMocks()).mockListApprovals();
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
    return (await loadMocks()).mockListApprovals();
  }
}

export async function getApproval(id: string): Promise<ConfigValue | null> {
  if (isMockMode()) return (await loadMocks()).mockGetApproval(id);
  try {
    return await getConfigValue(id);
  } catch {
    return (await loadMocks()).mockGetApproval(id);
  }
}

export async function approveConfigValue(
  id: string,
  body: { approved_by: string; comment: string },
): Promise<ConfigValue> {
  if (isMockMode()) return (await loadMocks()).mockApproveConfigValue(id, body);
  try {
    return await fetcher<ConfigValue>(`/api/config/values/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch {
    return (await loadMocks()).mockApproveConfigValue(id, body);
  }
}

export async function requestChangesConfigValue(
  id: string,
  body: { reviewer: string; comment: string },
): Promise<ConfigValue> {
  if (isMockMode()) return (await loadMocks()).mockRequestChangesConfigValue(id, body);
  try {
    return await fetcher<ConfigValue>(
      `/api/config/values/${encodeURIComponent(id)}/request-changes`,
      { method: "POST", body: JSON.stringify(body) },
    );
  } catch {
    return (await loadMocks()).mockRequestChangesConfigValue(id, body);
  }
}

export async function rejectConfigValue(
  id: string,
  body: { reviewer: string; comment: string },
): Promise<ConfigValue> {
  if (isMockMode()) return (await loadMocks()).mockRejectConfigValue(id, body);
  try {
    return await fetcher<ConfigValue>(`/api/config/values/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch {
    return (await loadMocks()).mockRejectConfigValue(id, body);
  }
}

export async function resolveCurrentConfigValue(
  key: string,
  jurisdictionId: string | null,
  evaluationDate: string,
): Promise<ConfigValue | null> {
  const params = new URLSearchParams({ key, evaluation_date: evaluationDate });
  if (jurisdictionId) params.set("jurisdiction_id", jurisdictionId);
  try {
    return await fetcher<ConfigValue | null>(`/api/config/resolve?${params.toString()}`);
  } catch {
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
