import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIntl } from "react-intl";

import { listVersions } from "@/lib/api";
import { MOCK_CONFIG_VALUES } from "@/lib/mock-config-values";
import type { ConfigValue, ListVersionsResponse } from "@/lib/types";
import { ProvenanceRibbon } from "@/components/govops/ProvenanceRibbon";
import { ValueTypeBadge } from "@/components/govops/ValueTypeBadge";
import { JurisdictionChip } from "@/components/govops/JurisdictionChip";
import { CopyButton } from "@/components/govops/CopyButton";
import { Timeline } from "@/components/govops/Timeline";

export const Route = createFileRoute("/config/$key/$jurisdictionId")({
  head: () => ({
    meta: [{ title: "ConfigValue timeline — GovOps" }],
  }),
  component: ConfigDetailPage,
});

function mockVersions(key: string, jurisdictionId: string): ListVersionsResponse {
  const versions = MOCK_CONFIG_VALUES.filter((v) => {
    const matchesJur =
      jurisdictionId === "global"
        ? v.jurisdiction_id === null
        : v.jurisdiction_id === jurisdictionId;
    return v.key === key && matchesJur;
  });
  return { key, versions, count: versions.length };
}

function ConfigDetailPage() {
  const intl = useIntl();
  const { key, jurisdictionId } = Route.useParams();
  const decodedKey = decodeURIComponent(key);
  const decodedJur = decodeURIComponent(jurisdictionId);

  const [data, setData] = useState<ListVersionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);

  const load = useCallback(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    listVersions(decodedKey, decodedJur === "global" ? null : decodedJur)
      .catch(() => mockVersions(decodedKey, decodedJur))
      .then((res) => {
        if (id !== reqId.current) return;
        setData(res);
        setLoading(false);
      })
      .catch((e: Error) => {
        if (id !== reqId.current) return;
        setError(e.message);
        setLoading(false);
      });
  }, [decodedKey, decodedJur]);

  useEffect(() => {
    load();
  }, [load]);

  // Newest-first ordering, computed once per data update.
  const versions = useMemo<ConfigValue[]>(() => {
    if (!data) return [];
    return [...data.versions].sort((a, b) =>
      b.effective_from.localeCompare(a.effective_from),
    );
  }, [data]);

  const current = versions[0];
  const provenance = current?.author.startsWith("agent:") ? "agent" : "human";

  // Compare-selection state (max 2). Reset whenever the underlying key changes.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  useEffect(() => setSelectedIds([]), [decodedKey, decodedJur]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id]; // FIFO once 2 are selected
      return [...prev, id];
    });
  }, []);

  return (
    <section aria-labelledby="config-detail-heading" className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link
          to="/config"
          className="text-foreground-muted underline-offset-4 hover:underline"
        >
          ← {intl.formatMessage({ id: "nav.config" })}
        </Link>
      </nav>

      <header className="flex items-stretch">
        <ProvenanceRibbon variant={provenance} />
        <div className="w-full space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p
                className="text-xs uppercase tracking-[0.2em] text-foreground-subtle"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {intl.formatMessage({ id: "timeline.heading" })}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  id="config-detail-heading"
                  className="text-xl tracking-tight text-foreground sm:text-2xl"
                  style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}
                >
                  {decodedKey}
                </h1>
                <CopyButton value={decodedKey} />
              </div>
              <div className="flex items-center gap-2">
                <JurisdictionChip
                  id={decodedJur === "global" ? null : decodedJur}
                />
                {current && <ValueTypeBadge type={current.value_type} />}
                {current && (
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{
                      backgroundColor:
                        provenance === "agent"
                          ? "var(--agentic)"
                          : "var(--authority)",
                    }}
                    title={intl.formatMessage({
                      id: `provenance.${provenance}`,
                    })}
                  />
                )}
              </div>
            </div>

            <button
              type="button"
              disabled
              aria-disabled
              title="govops-006"
              className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                borderColor: "var(--authority)",
                color: "var(--authority)",
                backgroundColor:
                  "color-mix(in oklch, var(--authority) 8%, transparent)",
              }}
            >
              {intl.formatMessage({ id: "timeline.draft_new" })}
            </button>
          </div>

          {/* Compare CTA — appears once 2 cards are selected */}
          <div aria-live="polite" aria-atomic="true" className="min-h-[28px]">
            {selectedIds.length === 2 && (
              <button
                type="button"
                disabled
                title="govops-005"
                className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-70"
                style={{ backgroundColor: "var(--agentic)" }}
              >
                {intl.formatMessage({ id: "timeline.compare.cta" })}
              </button>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-md border p-4"
          style={{
            borderColor: "var(--verdict-rejected)",
            backgroundColor:
              "color-mix(in oklch, var(--verdict-rejected) 6%, transparent)",
          }}
        >
          <p
            className="text-sm font-medium"
            style={{ color: "var(--verdict-rejected)" }}
          >
            {intl.formatMessage({ id: "config.error.title" })}
          </p>
          <p className="mt-1 text-xs text-foreground-muted">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-surface-sunken"
          >
            {intl.formatMessage({ id: "config.error.retry" })}
          </button>
        </div>
      )}

      {loading && !error && (
        <ul role="list" className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="h-[140px] animate-pulse rounded-md border border-border bg-surface-sunken"
            />
          ))}
        </ul>
      )}

      {!loading && !error && versions.length === 0 && (
        <div className="space-y-3 rounded-md bg-agentic-soft p-6 text-center">
          <p className="text-base font-medium text-agentic-foreground">
            {intl.formatMessage({ id: "timeline.empty.title" })}
          </p>
          <p className="text-sm text-agentic-foreground/80">
            {intl.formatMessage({ id: "timeline.empty.body" })}
          </p>
          <Link
            to="/config"
            className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-surface-sunken"
          >
            ← {intl.formatMessage({ id: "nav.config" })}
          </Link>
        </div>
      )}

      {!loading && !error && versions.length > 0 && (
        <Timeline
          versions={versions}
          selectedIds={selectedIds}
          onSelectToggle={toggleSelect}
        />
      )}
    </section>
  );
}