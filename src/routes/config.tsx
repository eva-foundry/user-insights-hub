import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { listConfigValues } from "@/lib/api";
import { filterMockConfigValues } from "@/lib/mock-config-values";
import type { ConfigValue, ListConfigValuesResponse } from "@/lib/types";
import { ProvenanceRibbon } from "@/components/govops/ProvenanceRibbon";
import {
  ConfigValueFilters,
  type FiltersState,
} from "@/components/govops/ConfigValueFilters";
import { ConfigValueRow } from "@/components/govops/ConfigValueRow";
import { RouteError } from "@/components/govops/RouteError";

type SortKey = "key_asc" | "key_desc" | "effective_desc" | "effective_asc";
const SORT_KEYS: SortKey[] = ["key_asc", "key_desc", "effective_desc", "effective_asc"];

type ConfigSearch = {
  key_prefix?: string;
  domain?: string;
  jurisdiction_id?: string;
  language?: string;
  sort?: SortKey;
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
    sort:
      typeof search.sort === "string" && (SORT_KEYS as string[]).includes(search.sort)
        ? (search.sort as SortKey)
        : undefined,
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
  const sort: SortKey = search.sort ?? "key_asc";

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
          sort: sort !== "key_asc" ? sort : undefined,
        }),
        replace: true,
      });
    },
    [filters, navigate, sort],
  );

  const setSort = useCallback(
    (next: SortKey) => {
      navigate({
        search: (prev: ConfigSearch) => ({
          ...prev,
          sort: next !== "key_asc" ? next : undefined,
        }),
        replace: true,
      });
    },
    [navigate],
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

  const sortedValues = useMemo<ConfigValue[]>(() => {
    if (!data) return [];
    const arr = [...data.values];
    arr.sort((a, b) => {
      switch (sort) {
        case "key_desc":
          return b.key.localeCompare(a.key);
        case "effective_desc":
          return b.effective_from.localeCompare(a.effective_from);
        case "effective_asc":
          return a.effective_from.localeCompare(b.effective_from);
        case "key_asc":
        default:
          return a.key.localeCompare(b.key);
      }
    });
    return arr;
  }, [data, sort]);

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

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div aria-live="polite" aria-atomic="true" className="text-sm text-foreground-muted">
          {data && !loading && !error && (
            <FormattedMessage id="config.results.count" values={{ count: data.count }} />
          )}
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="config-sort"
            className="text-xs uppercase tracking-[0.14em] text-foreground-subtle"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {intl.formatMessage({ id: "config.sort.label" })}
          </label>
          <select
            id="config-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-foreground hover:bg-surface-sunken"
          >
            {SORT_KEYS.map((s) => (
              <option key={s} value={s}>
                {intl.formatMessage({ id: `config.sort.${s}` })}
              </option>
            ))}
          </select>
        </div>
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
        <div className="space-y-2">
          <div
            role="presentation"
            className="grid grid-cols-[3px_minmax(0,2fr)_minmax(0,1.5fr)_auto_auto_auto] items-center gap-4 border-b border-border px-4 pb-2 text-[10px] uppercase tracking-[0.14em] text-foreground-subtle"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <span aria-hidden />
            <span>{intl.formatMessage({ id: "config.column.key" })}</span>
            <span>{intl.formatMessage({ id: "config.column.value" })}</span>
            <span>{intl.formatMessage({ id: "config.column.type" })}</span>
            <span>{intl.formatMessage({ id: "config.column.jurisdiction" })}</span>
            <span>{intl.formatMessage({ id: "config.column.effective_from" })}</span>
          </div>
          <ol role="list" className="space-y-2">
            {sortedValues.map((cv) => (
              <ConfigValueRow key={cv.id} cv={cv} />
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}