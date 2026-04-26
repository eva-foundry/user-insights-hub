import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { ApprovalRow } from "@/components/govops/ApprovalRow";
import { ProvenanceRibbon } from "@/components/govops/ProvenanceRibbon";
import { listApprovals } from "@/lib/api";
import type { ConfigValue } from "@/lib/types";

export const Route = createFileRoute("/config/approvals")({
  head: () => ({
    meta: [
      { title: "Pending approvals — GovOps" },
      {
        name: "description",
        content:
          "Drafts and pending ConfigValue records awaiting human ratification.",
      },
    ],
  }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const intl = useIntl();
  const [values, setValues] = useState<ConfigValue[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 10;
  const [visible, setVisible] = useState(PAGE_SIZE);

  function load() {
    setLoading(true);
    setError(null);
    listApprovals()
      .then((res) => {
        // Newest first — maintainers want the freshest item on top.
        const sorted = [...res.values].sort((a, b) =>
          b.created_at.localeCompare(a.created_at),
        );
        setValues(sorted);
        setVisible(PAGE_SIZE);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section aria-labelledby="approvals-heading" className="space-y-8">
      <header className="flex items-stretch">
        <ProvenanceRibbon variant="human" />
        <div className="space-y-3">
          <p
            className="text-xs uppercase tracking-[0.2em] text-foreground-subtle"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            spec govops-007 · human authority
          </p>
          <h1
            id="approvals-heading"
            className="text-4xl tracking-tight text-foreground sm:text-5xl"
            style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}
          >
            {intl.formatMessage({ id: "approvals.heading" })}
          </h1>
          <p className="max-w-2xl text-base text-foreground-muted">
            {intl.formatMessage({ id: "approvals.lede" })}
          </p>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-[color:var(--verdict-rejected)] bg-[color:var(--verdict-rejected)]/5 p-4"
        >
          <p className="text-sm font-medium text-[color:var(--verdict-rejected)]">
            {intl.formatMessage({ id: "approvals.error.load" })}
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
              className="h-[88px] animate-pulse rounded-md border border-border bg-surface-sunken"
            />
          ))}
        </ul>
      )}

      {!loading && !error && values && values.length === 0 && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center gap-3 rounded-lg border border-border bg-agentic-soft px-6 py-12 text-center"
        >
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-full bg-surface text-2xl"
            style={{ color: "var(--authority)" }}
          >
            ✓
          </span>
          <p className="text-lg font-semibold text-agentic-foreground" style={{ fontFamily: "var(--font-serif)" }}>
            {intl.formatMessage({ id: "approvals.empty.title" })}
          </p>
          <p className="max-w-md text-sm text-agentic-foreground/80">
            {intl.formatMessage({ id: "approvals.empty.body" })}
          </p>
          <p
            className="text-[11px] uppercase tracking-[0.18em] text-agentic-foreground/70"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {intl.formatMessage({ id: "approvals.empty.tag" })}
          </p>
          <Link
            to="/config"
            className="mt-2 inline-flex h-9 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-surface-sunken"
          >
            {intl.formatMessage({ id: "approvals.empty.cta" })}
          </Link>
        </div>
      )}

      {!loading && !error && values && values.length > 0 && (
        <div className="space-y-4">
          <p
            aria-live="polite"
            className="text-xs uppercase tracking-[0.14em] text-foreground-subtle"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <FormattedMessage
              id="approvals.pagination.showing"
              values={{
                shown: Math.min(visible, values.length),
                total: values.length,
              }}
            />
          </p>
          <ol role="list" className="space-y-2">
            {values.slice(0, visible).map((cv) => (
              <ApprovalRow key={cv.id} cv={cv} />
            ))}
          </ol>
          {visible < values.length && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <FormattedMessage
                  id="approvals.pagination.load_more"
                  values={{ count: Math.min(PAGE_SIZE, values.length - visible) }}
                />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}