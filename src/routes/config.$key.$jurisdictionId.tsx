import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FormattedDate, useIntl } from "react-intl";

import { ProvenanceRibbon } from "@/components/govops/ProvenanceRibbon";
import { ValueTypeBadge } from "@/components/govops/ValueTypeBadge";
import { JurisdictionChip } from "@/components/govops/JurisdictionChip";
import { MOCK_CONFIG_VALUES } from "@/lib/mock-config-values";
import type { ConfigValue } from "@/lib/types";

export const Route = createFileRoute("/config/$key/$jurisdictionId")({
  head: () => ({
    meta: [{ title: "ConfigValue timeline — GovOps" }],
  }),
  component: ConfigDetailPage,
});

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  return JSON.stringify(v, null, 2);
}

function ConfigDetailPage() {
  const intl = useIntl();
  const { key, jurisdictionId } = Route.useParams();
  const decodedKey = decodeURIComponent(key);
  const decodedJur = decodeURIComponent(jurisdictionId);

  const [versions, setVersions] = useState<ConfigValue[] | null>(null);

  useEffect(() => {
    // v1: derive from mock data; later spec wires GET /api/config/values/{key}/history
    const all = MOCK_CONFIG_VALUES.filter((v) => {
      const matchesJur =
        decodedJur === "global" ? v.jurisdiction_id === null : v.jurisdiction_id === decodedJur;
      return v.key === decodedKey && matchesJur;
    }).sort((a, b) => b.effective_from.localeCompare(a.effective_from));
    setVersions(all);
  }, [decodedKey, decodedJur]);

  const current = versions?.[0];

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
        <ProvenanceRibbon
          variant={current?.author.startsWith("agent:") ? "agent" : "human"}
        />
        <div className="space-y-3">
          <p
            className="text-xs uppercase tracking-[0.2em] text-foreground-subtle"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            timeline · v1
          </p>
          <h1
            id="config-detail-heading"
            className="text-2xl tracking-tight text-foreground sm:text-3xl"
            style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}
          >
            {decodedKey}
          </h1>
          <div className="flex items-center gap-2">
            <JurisdictionChip
              id={decodedJur === "global" ? null : decodedJur}
            />
            {current && <ValueTypeBadge type={current.value_type} />}
          </div>
        </div>
      </header>

      {versions && versions.length === 0 && (
        <div className="rounded-md bg-agentic-soft p-6 text-center">
          <p className="text-base font-medium text-agentic-foreground">
            {intl.formatMessage({ id: "config.detail.empty" })}
          </p>
        </div>
      )}

      {versions && versions.length > 0 && (
        <ol role="list" className="relative space-y-4 ps-6">
          <span
            aria-hidden
            className="absolute inset-y-2 start-2 w-px bg-border"
          />
          {versions.map((v, idx) => {
            const provenance = v.author.startsWith("agent:") ? "agent" : "human";
            return (
              <li key={v.id} className="relative">
                <span
                  aria-hidden
                  className={`absolute -start-[18px] top-3 size-2.5 rounded-full ${
                    provenance === "agent" ? "bg-agentic" : "bg-authority"
                  }`}
                />
                <article className="flex items-stretch rounded-md border border-border bg-surface">
                  <ProvenanceRibbon variant={provenance} />
                  <div className="flex-1 space-y-3 px-4 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p
                        className="text-xs uppercase tracking-[0.14em] text-foreground-subtle"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {idx === 0
                          ? intl.formatMessage({ id: "config.detail.current" })
                          : intl.formatMessage({ id: "config.detail.superseded" })}
                      </p>
                      <p
                        className="text-xs text-foreground-muted"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        <FormattedDate
                          value={v.effective_from}
                          year="numeric"
                          month="short"
                          day="numeric"
                        />
                      </p>
                    </div>
                    <pre
                      className="overflow-x-auto rounded-sm bg-surface-sunken p-3 text-sm text-foreground"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {formatValue(v.value)}
                    </pre>
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-[0.12em] text-foreground-subtle">
                          {intl.formatMessage({ id: "config.detail.author" })}
                        </dt>
                        <dd
                          className="text-foreground"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {v.author}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.12em] text-foreground-subtle">
                          {intl.formatMessage({ id: "config.detail.approved_by" })}
                        </dt>
                        <dd
                          className="text-foreground"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {v.approved_by ?? "—"}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs uppercase tracking-[0.12em] text-foreground-subtle">
                          {intl.formatMessage({ id: "config.detail.rationale" })}
                        </dt>
                        <dd className="text-foreground">{v.rationale}</dd>
                      </div>
                      {v.citation && (
                        <div className="sm:col-span-2">
                          <dt className="text-xs uppercase tracking-[0.12em] text-foreground-subtle">
                            {intl.formatMessage({ id: "config.detail.citation" })}
                          </dt>
                          <dd
                            className="text-foreground hover:underline"
                            style={{ fontFamily: "var(--font-mono)" }}
                          >
                            {v.citation}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}