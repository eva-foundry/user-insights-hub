import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { listConfigValues } from "@/lib/api";
import { filterMockConfigValues } from "@/lib/mock-config-values";
import type { ListConfigValuesResponse } from "@/lib/types";
import { ProvenanceRibbon } from "@/components/govops/ProvenanceRibbon";
import {
  ConfigValueFilters,
  type FiltersState,
} from "@/components/govops/ConfigValueFilters";
import { ConfigValueRow } from "@/components/govops/ConfigValueRow";

type ConfigSearch = {
  key_prefix?: string;
  domain?: string;
  jurisdiction_id?: string;
  language?: string;
};

export const Route = createFileRoute("/config")({
  head: () => ({
    meta: [
      { title: "Configuration — GovOps" },
      {
        name: "description",
        content:
          "Search and filter every ConfigValue across jurisdictions, domains, and languages.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): ConfigSearch => ({
    key_prefix: typeof search.key_prefix === "string" ? search.key_prefix : undefined,
    domain: typeof search.domain === "string" ? search.domain : undefined,
    jurisdiction_id:
      typeof search.jurisdiction_id === "string" ? search.jurisdiction_id : undefined,
    language: typeof search.language === "string" ? search.language : undefined,
  }),
  component: ConfigPage,
});

function ConfigPage() {
  const intl = useIntl();
  const navigate = useNavigate({ from: "/config" });
  const search = useSearch({ from: "/config" });

  const filters: FiltersState = {
    key_prefix: search.key_prefix ?? "",
    domain: search.domain ?? "all",
    jurisdiction_id: search.jurisdiction_id ?? "all",
    language: search.language ?? "all",
  };

  const updateFilters = useCallback(
    (next: Partial<FiltersState>) => {
      const merged = { ...filters, ...next };
      navigate({
        search: () => ({
          key_prefix: merged.key_prefix || undefined,
          domain: merged.domain !== "all" ? merged.domain : undefined,
          jurisdiction_id:
            merged.jurisdiction_id !== "all" ? merged.jurisdiction_id : undefined,
          language: merged.language !== "all" ? merged.language : undefined,
        }),
        replace: true,
      });
    },
    [filters, navigate],
  );

  // Debounce key_prefix at 200ms before requesting.
  const [debouncedPrefix, setDebouncedPrefix] = useState(filters.key_prefix);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedPrefix(filters.key_prefix), 200);
    return () => clearTimeout(t);
  }, [filters.key_prefix]);

  const queryParams = useMemo(
    () => ({
      key_prefix: debouncedPrefix || undefined,
      domain: filters.domain !== "all" ? filters.domain : undefined,
      jurisdiction_id:
        filters.jurisdiction_id !== "all" ? filters.jurisdiction_id : undefined,
      language: filters.language !== "all" ? filters.language : undefined,
    }),
    [debouncedPrefix, filters.domain, filters.jurisdiction_id, filters.language],
  );

  const [data, setData] = useState<ListConfigValuesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);

  const load = useCallback(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    listConfigValues(queryParams)
      .catch(() => filterMockConfigValues(queryParams))
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
  }, [queryParams]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section aria-labelledby="config-heading" className="space-y-8">
      <header className="flex items-stretch">
        <ProvenanceRibbon variant="system" />
        <div className="space-y-3">
          <p
            className="text-xs uppercase tracking-[0.2em] text-foreground-subtle"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            config · v1
          </p>
          <h1
            id="config-heading"
            className="text-4xl tracking-tight text-foreground sm:text-5xl"
            style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}
          >
            {intl.formatMessage({ id: "config.title" })}
          </h1>
          <p className="max-w-2xl text-base text-foreground-muted">
            {intl.formatMessage({ id: "config.lede" })}
          </p>
        </div>
      </header>

      <ConfigValueFilters value={filters} onChange={updateFilters} />

      <div aria-live="polite" aria-atomic="true" className="text-sm text-foreground-muted">
        {data && !loading && !error && (
          <FormattedMessage id="config.results.count" values={{ count: data.count }} />
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-[color:var(--verdict-rejected)] bg-[color:var(--verdict-rejected)]/5 p-4"
        >
          <p className="text-sm font-medium text-[color:var(--verdict-rejected)]">
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
        <ul role="list" className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="h-[68px] animate-pulse rounded-md border border-border bg-surface-sunken"
            />
          ))}
        </ul>
      )}

      {!loading && !error && data && data.values.length === 0 && (
        <div className="rounded-md bg-agentic-soft p-6 text-center">
          <p className="text-base font-medium text-agentic-foreground">
            {intl.formatMessage({ id: "config.empty.title" })}
          </p>
          <p className="mt-1 text-sm text-agentic-foreground/80">
            {intl.formatMessage({ id: "config.empty.body" })}
          </p>
        </div>
      )}

      {!loading && !error && data && data.values.length > 0 && (
        <ol role="list" className="space-y-2">
          {data.values.map((cv) => (
            <ConfigValueRow key={cv.id} cv={cv} />
          ))}
        </ol>
      )}
    </section>
  );
}