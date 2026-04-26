import type { ConfigValue, CreateConfigValueRequest } from "./types";

/**
 * Synthetic ULID-ish id for mock-created drafts. Not cryptographically sound,
 * just stable-ish and visually similar so the timeline UI renders correctly.
 */
function mockUlid(): string {
  const ts = Date.now().toString(36).toUpperCase().padStart(10, "0");
  const rnd = Array.from({ length: 16 }, () =>
    "0123456789ABCDEFGHJKMNPQRSTVWXYZ"[Math.floor(Math.random() * 32)],
  ).join("");
  return (ts + rnd).slice(0, 26);
}

/**
 * Backend `POST /api/config/values` does not yet exist. While the spec is
 * forward-looking, this mock returns a synthetic ConfigValue after a short
 * delay so the route can navigate to the (also-mocked) timeline.
 */
export async function mockCreateConfigValue(
  body: CreateConfigValueRequest,
): Promise<ConfigValue> {
  await new Promise((r) => setTimeout(r, 300));
  const now = new Date().toISOString();
  return {
    id: mockUlid(),
    domain: body.domain,
    key: body.key,
    jurisdiction_id: body.jurisdiction_id,
    value: body.value,
    value_type: body.value_type,
    effective_from: body.effective_from,
    effective_to: null,
    citation: body.citation,
    author: body.author,
    approved_by: null,
    rationale: body.rationale,
    supersedes: body.supersedes,
    status: "pending",
    language: body.language,
    created_at: now,
  };
}