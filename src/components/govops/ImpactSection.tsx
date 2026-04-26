import { FormattedMessage } from "react-intl";
import { Link } from "@tanstack/react-router";
import { FormattedDate } from "react-intl";
import type { ImpactResult } from "@/lib/types";
import { ProvenanceRibbon } from "./ProvenanceRibbon";
import { ValueTypeBadge } from "./ValueTypeBadge";
import { JurisdictionChip } from "./JurisdictionChip";
import { CitationHighlight } from "./CitationHighlight";

function previewValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 60 ? `${s.slice(0, 60)}…` : s;
}

export function ImpactSection({ result, query }: { result: ImpactResult; query: string }) {
  const id = `impact-section-${result.jurisdiction_id ?? "global"}`;
  return (
    <section aria-labelledby={id} className="mb-8">
      <header className="mb-3 flex items-center gap-3 border-b border-border pb-2">
        <h2 id={id} className="text-lg text-foreground" style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}>
          {result.jurisdiction_id === null ? (
            <FormattedMessage id="impact.section.global" />
          ) : (
            result.jurisdiction_label
          )}
        </h2>
        <JurisdictionChip id={result.jurisdiction_id} />
        <span
          className="ms-auto text-xs text-foreground-muted"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          <FormattedMessage id="impact.section.count" values={{ count: result.values.length }} />
        </span>
      </header>
      <ol role="list" className="space-y-2">
        {result.values.map((cv) => {
          const provenance = cv.author.startsWith("agent:") ? "agent" : "human";
          return (
            <li key={cv.id}>
              <Link
                to="/config/$key/$jurisdictionId"
                params={{ key: cv.key, jurisdictionId: cv.jurisdiction_id ?? "global" }}
                className="flex items-stretch rounded-md border border-border bg-surface outline-none transition-colors hover:bg-surface-sunken focus-visible:bg-surface-sunken focus-visible:shadow-[var(--ring-focus)]"
              >
                <ProvenanceRibbon variant={provenance} />
                <div className="grid flex-1 grid-cols-1 items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_auto_auto] sm:gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                      {cv.key}
                    </div>
                    {cv.citation && (
                      <div
                        className="mt-1 truncate text-xs text-foreground-subtle"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        <CitationHighlight text={cv.citation} query={query} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 truncate text-sm text-foreground-muted">
                    {previewValue(cv.value)}
                  </div>
                  <ValueTypeBadge type={cv.value_type} />
                  <div className="text-xs text-foreground-muted" style={{ fontFamily: "var(--font-mono)" }}>
                    <FormattedDate value={cv.effective_from} year="numeric" month="short" day="numeric" />
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
