import type { ImpactResponse } from "./types";
import { MOCK_CONFIG_VALUES } from "./mock-config-values";

const JURISDICTION_LABELS: Record<string, string> = {
  "ca-oas": "Canada — Old Age Security",
  "us-fed": "United States — Federal",
  "uk-gov": "United Kingdom — Government",
  "fr-gouv": "France — Gouvernement",
  "de-bund": "Germany — Bund",
  "br-fed": "Brazil — Federal",
};

export function MOCK_IMPACT_RESPONSE(query: string): ImpactResponse {
  const normalized = query.trim().replace(/\s+/g, " ");
  const needle = normalized.toLowerCase();
  const matches = MOCK_CONFIG_VALUES.filter(
    (v) => v.citation && v.citation.toLowerCase().includes(needle),
  );
  const groups = new Map<string | null, typeof matches>();
  for (const m of matches) {
    const key = m.jurisdiction_id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }
  const results = Array.from(groups.entries())
    .map(([jid, values]) => ({
      jurisdiction_id: jid,
      jurisdiction_label:
        jid === null ? "Global / cross-jurisdictional" : (JURISDICTION_LABELS[jid] ?? jid),
      values,
    }))
    .sort((a, b) => {
      if (a.jurisdiction_id === null) return -1;
      if (b.jurisdiction_id === null) return 1;
      return a.jurisdiction_label.localeCompare(b.jurisdiction_label);
    });
  return {
    query: normalized,
    total: matches.length,
    jurisdiction_count: results.length,
    results,
  };
}
