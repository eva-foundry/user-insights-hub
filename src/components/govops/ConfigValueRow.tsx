import { FormattedDate } from "react-intl";
import { ProvenanceRibbon } from "./ProvenanceRibbon";
import { ValueTypeBadge } from "./ValueTypeBadge";
import { JurisdictionChip } from "./JurisdictionChip";
import type { ConfigValue } from "@/lib/types";

function previewValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 60 ? `${s.slice(0, 60)}…` : s;
}

export function ConfigValueRow({ cv }: { cv: ConfigValue }) {
  const provenance = cv.author.startsWith("agent:") ? "agent" : "human";
  const href = `/config/${encodeURIComponent(cv.key)}/${encodeURIComponent(
    cv.jurisdiction_id ?? "global",
  )}`;

  return (
    <li>
      <a
        href={href}
        className="flex items-stretch rounded-md border border-border bg-surface outline-none transition-colors hover:bg-surface-sunken focus-visible:bg-surface-sunken"
      >
        <ProvenanceRibbon variant={provenance} />
        <div className="grid flex-1 grid-cols-1 items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:gap-4">
          <div className="min-w-0">
            <div
              className="truncate text-sm text-foreground"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {cv.key}
            </div>
            <div className="truncate text-sm text-foreground-muted">
              {previewValue(cv.value)}
            </div>
            {cv.citation && (
              <div
                className="mt-1 truncate text-xs text-foreground-subtle hover:underline"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {cv.citation}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ValueTypeBadge type={cv.value_type} />
            <JurisdictionChip id={cv.jurisdiction_id} />
          </div>
          <div
            className="text-xs text-foreground-muted"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <FormattedDate
              value={cv.effective_from}
              year="numeric"
              month="short"
              day="numeric"
            />
          </div>
        </div>
      </a>
    </li>
  );
}