import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { listConfigValues } from "@/lib/api";
import { filterMockConfigValues } from "@/lib/mock-config-values";
import type { ConfigValue, ListConfigValuesResponse } from "@/lib/types";
import { ProvenanceRibbon } from "@/components/govops/ProvenanceRibbon";
import { JurisdictionChip } from "@/components/govops/JurisdictionChip";

export const Route = createFileRoute("/config/prompts")({
  head: () => ({
    meta: [
      { title: "Prompts — GovOps" },
      {
        name: "description",
        content: "Edit, version, and test the LLM prompts the encoder uses.",
      },
    ],
  }),
  component: PromptsPage,
});

/**
 * Humanize the trailing key segment ("global.prompt.eligibility.check" →
 * "Eligibility check"). Used as the row title since prompts share a key
 * convention but no separate human-readable name field.
 */
function humanizeTitle(key: string): string {
  const parts = key.split(".");
  const tail = parts.slice(-2).join(" ");
  return tail
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface PromptRow {
  current: ConfigValue;
  versionCount: number;
}

function groupByKeyJurisdiction(values: ConfigValue[]): PromptRow[] {
  const map = new Map<string, ConfigValue[]>();
  for (const v of values) {
    const k = `${v.key}::${v.jurisdiction_id ?? "global"}`;
    const arr = map.get(k) ?? [];
    arr.push(v);
    map.set(k, arr);
  }
  const rows: PromptRow[] = [];
  for (const arr of map.values()) {
    // Pick the most recent approved version as "current"; fall back to newest by date.
    const approved = arr.filter((v) => v.status === "approved");
    const pool = approved.length ? approved : arr;
    pool.sort((a, b) => b.effective_from.localeCompare(a.effective_from));
    rows.push({ current: pool[0], versionCount: arr.length });
  }
  rows.sort((a, b) => a.current.key.localeCompare(b.current.key));
  return rows;
}

function PromptsPage() {
  const intl = useIntl();
  const [data, setData] = useState<ListConfigValuesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listConfigValues({ domain: "prompt" })
      .catch(() => filterMockConfigValues({ domain: "prompt" }))
      .then((res) => setData(res))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => (data ? groupByKeyJurisdiction(data.values) : []), [data]);

  return (
    <section aria-labelledby="prompts-heading" className="space-y-8">
      <header className="flex items-stretch">
        <ProvenanceRibbon variant="hybrid" />
        <div className="space-y-3">
          <p
            className="text-xs uppercase tracking-[0.2em] text-foreground-subtle"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            prompts · spec govops-008
          </p>
          <h1
            id="prompts-heading"
            className="text-4xl tracking-tight text-foreground sm:text-5xl"
            style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}
          >
            {intl.formatMessage({ id: "prompts.heading" })}
          </h1>
          <p className="max-w-2xl text-base text-foreground-muted">
            {intl.formatMessage({ id: "prompts.subheading" })}
          </p>
        </div>
      </header>

      {loading && (
        <ul role="list" aria-busy="true" className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="h-[120px] animate-pulse rounded-md border border-border bg-surface-sunken"
            />
          ))}
        </ul>
      )}

      {!loading && rows.length === 0 && (
        <div className="rounded-md border border-border bg-surface-sunken p-8 text-center">
          <p className="text-base font-medium text-foreground" style={{ fontFamily: "var(--font-serif)" }}>
            {intl.formatMessage({ id: "prompts.empty.title" })}
          </p>
          <p className="mt-1 text-sm text-foreground-muted">
            {intl.formatMessage({ id: "prompts.empty.body" })}
          </p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <ol role="list" className="space-y-3">
          {rows.map(({ current, versionCount }) => {
            const jurisdictionParam = current.jurisdiction_id ?? "global";
            const previewText = String(current.value ?? "").slice(0, 200);
            return (
              <li
                key={`${current.key}-${jurisdictionParam}`}
                className="flex items-stretch overflow-hidden rounded-md border border-border bg-surface"
              >
                <ProvenanceRibbon variant="hybrid" />
                <div className="flex-1 space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      className="text-base font-semibold text-foreground"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {humanizeTitle(current.key)}
                    </h2>
                    <JurisdictionChip jurisdictionId={current.jurisdiction_id} />
                    <span
                      className="text-[10px] uppercase tracking-[0.14em] text-foreground-subtle"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      <FormattedMessage id="prompts.row.versions" values={{ count: versionCount }} />
                    </span>
                  </div>
                  <code
                    className="block text-xs text-foreground-muted"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {current.key}
                  </code>
                  <p
                    className="line-clamp-3 text-sm text-foreground"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {previewText}
                    {String(current.value ?? "").length > 200 ? "…" : ""}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link
                      to="/config/prompts/$key/$jurisdictionId/edit"
                      params={{ key: current.key, jurisdictionId: jurisdictionParam }}
                      className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90"
                      style={{ backgroundColor: "var(--lavender-600)" }}
                    >
                      {intl.formatMessage({ id: "prompts.row.edit" })}
                    </Link>
                    <Link
                      to="/config/$key/$jurisdictionId"
                      params={{ key: current.key, jurisdictionId: jurisdictionParam }}
                      className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-surface-sunken"
                    >
                      {intl.formatMessage({ id: "prompts.row.timeline" })}
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
