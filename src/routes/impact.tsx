import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { impactByCitation } from "@/lib/api";
import type { ImpactResponse } from "@/lib/types";
import { ImpactSection } from "@/components/govops/ImpactSection";
import { ProvenanceRibbon } from "@/components/govops/ProvenanceRibbon";

type ImpactSearch = { citation?: string };

export const Route = createFileRoute("/impact")({
  head: () => ({
    meta: [
      { title: "Citation impact — GovOps" },
      {
        name: "description",
        content: "Find every ConfigValue that references a given citation, across all jurisdictions.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): ImpactSearch => ({
    citation: typeof s.citation === "string" && s.citation ? s.citation : undefined,
  }),
  component: ImpactPage,
});

function ImpactPage() {
  const search = Route.useSearch();
  const citation = search.citation ?? "";
  const navigate = useNavigate({ from: "/impact" });
  const intl = useIntl();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [input, setInput] = useState(citation);
  const [data, setData] = useState<ImpactResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // sync URL → input on direct nav / back-forward
  useEffect(() => {
    setInput(citation);
  }, [citation]);

  // run query when ?citation= changes
  useEffect(() => {
    let cancelled = false;
    if (!citation.trim()) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    impactByCitation(citation)
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [citation]);

  // global "/" focuses the search input (when not in another text field)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function pushQuery(v: string) {
    navigate({
      search: () => ({ citation: v.trim() ? v : undefined }),
      replace: true,
    });
  }

  function onChange(v: string) {
    setInput(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => pushQuery(v), 250);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounce.current) clearTimeout(debounce.current);
    pushQuery(input);
  }

  function retry() {
    if (citation.trim()) {
      // re-issue by toggling state; simplest is just to refetch directly.
      setError(null);
      setLoading(true);
      impactByCitation(citation)
        .then(setData)
        .catch((e) => setError(e instanceof Error ? e.message : String(e)))
        .finally(() => setLoading(false));
    }
  }

  return (
    <section aria-labelledby="impact-heading" className="space-y-8">
      <header className="flex items-stretch">
        <ProvenanceRibbon variant="hybrid" />
        <div className="space-y-3">
          <p
            className="text-xs uppercase tracking-[0.2em] text-foreground-subtle"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            impact · v1
          </p>
          <h1
            id="impact-heading"
            className="text-4xl tracking-tight text-foreground sm:text-5xl"
            style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}
          >
            {intl.formatMessage({ id: "impact.heading" })}
          </h1>
          <p className="max-w-2xl text-base text-foreground-muted">
            {intl.formatMessage({ id: "impact.lede" })}
          </p>
        </div>
      </header>

      <form onSubmit={onSubmit}>
        <input
          ref={inputRef}
          type="search"
          value={input}
          onChange={(e) => onChange(e.target.value)}
          placeholder={intl.formatMessage({ id: "impact.search.placeholder" })}
          aria-label={intl.formatMessage({ id: "impact.search.placeholder" })}
          className="w-full rounded-md border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus-visible:shadow-[var(--ring-focus)]"
          style={{ fontFamily: "var(--font-mono)" }}
        />
      </form>

      <div aria-live="polite" aria-atomic="true" className="min-h-[2rem]">
        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-sunken p-4"
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                {intl.formatMessage({ id: "impact.error.title" })}
              </p>
              <p className="text-xs text-foreground-muted">{error}</p>
            </div>
            <button
              type="button"
              onClick={retry}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:bg-surface-sunken focus-visible:shadow-[var(--ring-focus)]"
            >
              {intl.formatMessage({ id: "impact.error.retry" })}
            </button>
          </div>
        )}

        {loading && <ImpactSkeleton />}

        {!loading && !error && data && data.total > 0 && (
          <>
            <p className="mb-6 text-sm text-foreground-muted">
              <FormattedMessage
                id="impact.summary"
                values={{ n: data.total, m: data.jurisdiction_count, query: data.query }}
              />
            </p>
            {data.results.map((r) => (
              <ImpactSection
                key={r.jurisdiction_id ?? "global"}
                result={r}
                query={data.query}
              />
            ))}
          </>
        )}

        {!loading && !error && data && data.total === 0 && (
          <div className="rounded-md bg-agentic-soft p-6 text-center">
            <p className="text-base font-medium text-agentic-foreground">
              {intl.formatMessage({ id: "impact.empty.title" })}
            </p>
            <p className="mt-1 text-sm text-agentic-foreground/80">
              {intl.formatMessage({ id: "impact.empty.body" })}
            </p>
            <Link
              to="/authority"
              className="mt-3 inline-block text-sm underline underline-offset-4"
              style={{ color: "var(--authority)" }}
            >
              {intl.formatMessage({ id: "impact.empty.cta" })}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function ImpactSkeleton() {
  return (
    <div aria-hidden className="space-y-4 motion-reduce:[&_*]:animate-none">
      <div className="h-5 w-48 animate-pulse rounded bg-surface-sunken" />
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-md border border-border bg-surface-sunken" />
        ))}
      </div>
    </div>
  );
}
