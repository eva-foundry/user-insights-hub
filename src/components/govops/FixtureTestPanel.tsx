import { useEffect, useMemo, useState } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import { listFixtures, runFixtureWithPrompt } from "@/lib/api";
import type { FixtureBatchSummary, FixtureRunResult } from "@/lib/api";
import { toast } from "sonner";
import { RunCompareDiff } from "./RunCompareDiff";
import { exportFixtureReport } from "@/lib/exportFixtureReport";

/**
 * Side panel that lets a maintainer execute the encoder against a saved
 * fixture using the in-progress prompt body — without committing rules.
 *
 * History (proposals + raw response + metrics) is persisted to localStorage
 * per prompt key with a 10-entry cap. The user can:
 *   · select any past run as the "currently displayed" result
 *   · pick two runs to render side-by-side via <RunCompareDiff>
 *   · export selected runs to a downloadable PDF report
 */
const HISTORY_LIMIT = 10;

interface StoredRun extends FixtureRunResult {
  ran_at: string; // ISO
}

function historyKey(promptKey: string) {
  return `govops:fixture-runs:${promptKey}`;
}

function loadHistory(promptKey: string): StoredRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(historyKey(promptKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredRun[];
    return Array.isArray(parsed) ? parsed.slice(0, HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

function saveHistory(promptKey: string, runs: StoredRun[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      historyKey(promptKey),
      JSON.stringify(runs.slice(0, HISTORY_LIMIT)),
    );
  } catch {
    /* quota exceeded — silently drop */
  }
}

function runLabel(r: StoredRun, i: number): string {
  const stamp = new Date(r.ran_at).toLocaleString();
  return `#${i + 1} · ${r.proposals_count} proposals · ${stamp}`;
}

export function FixtureTestPanel({
  promptKey,
  promptText,
  disabled = false,
  disabledReason,
}: {
  promptKey: string;
  promptText: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const intl = useIntl();
  const [fixtures, setFixtures] = useState<FixtureBatchSummary[] | null>(null);
  const [selectedFixture, setSelectedFixture] = useState<string>("");
  const [running, setRunning] = useState(false);

  const [history, setHistory] = useState<StoredRun[]>([]);
  // Index of the run currently shown as "Result". 0 = most recent.
  const [viewIndex, setViewIndex] = useState<number>(0);
  // Index of the run to compare against (B side). null = compare hidden.
  const [compareIndex, setCompareIndex] = useState<number | null>(null);

  useEffect(() => {
    listFixtures()
      .then((rows) => {
        setFixtures(rows);
        if (rows[0]) setSelectedFixture((cur) => cur || rows[0].id);
      })
      .catch(() => setFixtures([]));
  }, []);

  useEffect(() => {
    const h = loadHistory(promptKey);
    setHistory(h);
    setViewIndex(0);
    setCompareIndex(null);
  }, [promptKey]);

  const result = history[viewIndex] ?? null;
  const compare = compareIndex != null ? history[compareIndex] ?? null : null;

  const onRun = async () => {
    if (!selectedFixture || disabled) return;
    setRunning(true);
    try {
      const r = await runFixtureWithPrompt(selectedFixture, {
        prompt_text: promptText,
        prompt_key: promptKey,
      });
      const stored: StoredRun = { ...r, ran_at: new Date().toISOString() };
      const next = [stored, ...history].slice(0, HISTORY_LIMIT);
      setHistory(next);
      setViewIndex(0);
      saveHistory(promptKey, next);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(intl.formatMessage({ id: "prompt.fixture.error.no_response" }), {
        description: msg,
      });
    } finally {
      setRunning(false);
    }
  };

  const onExport = () => {
    const runs = compare ? [result!, compare] : result ? [result] : history;
    if (runs.length === 0) return;
    exportFixtureReport({ promptKey, runs });
    toast.success(intl.formatMessage({ id: "prompt.fixture.export.done" }));
  };

  const compareOptions = useMemo(
    () => history.map((_, i) => i).filter((i) => i !== viewIndex),
    [history, viewIndex],
  );

  return (
    <aside
      aria-labelledby="fixture-panel-heading"
      className="flex h-full flex-col gap-3 rounded-md border border-border p-4"
      style={{ backgroundColor: "var(--agentic-soft)" }}
    >
      <h2
        id="fixture-panel-heading"
        className="text-base font-semibold text-foreground"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {intl.formatMessage({ id: "prompt.fixture.heading" })}
      </h2>

      {/* Fixture select */}
      <div className="space-y-1.5">
        <label
          htmlFor="fixture-select"
          className="text-xs uppercase tracking-[0.14em] text-foreground-subtle"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {intl.formatMessage({ id: "prompt.fixture.select.label" })}
        </label>
        <select
          id="fixture-select"
          value={selectedFixture}
          onChange={(e) => setSelectedFixture(e.target.value)}
          disabled={!fixtures || fixtures.length === 0}
          className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
        >
          {fixtures === null && <option>…</option>}
          {fixtures && fixtures.length === 0 && (
            <option value="">
              {intl.formatMessage({ id: "prompt.fixture.select.placeholder" })}
            </option>
          )}
          {fixtures?.map((f) => (
            <option key={f.id} value={f.id}>
              {f.document_title} ({f.jurisdiction_id})
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onRun}
        disabled={running || disabled || !selectedFixture || !promptText.trim()}
        title={disabled ? disabledReason : undefined}
        className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: "var(--lavender-600)" }}
      >
        {running
          ? intl.formatMessage({ id: "prompt.fixture.running" })
          : intl.formatMessage({ id: "prompt.fixture.run" })}
      </button>

      {disabled && disabledReason && (
        <p
          role="status"
          className="text-[11px]"
          style={{ color: "var(--verdict-rejected)", fontFamily: "var(--font-mono)" }}
        >
          {disabledReason}
        </p>
      )}

      {/* Past-run selector */}
      {history.length > 0 && (
        <div className="space-y-1.5">
          <label
            htmlFor="fixture-history-select"
            className="text-xs uppercase tracking-[0.14em] text-foreground-subtle"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {intl.formatMessage({ id: "prompt.fixture.history.label" })}
          </label>
          <select
            id="fixture-history-select"
            value={viewIndex}
            onChange={(e) => {
              const next = Number(e.target.value);
              setViewIndex(next);
              if (compareIndex === next) setCompareIndex(null);
            }}
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {history.map((r, i) => (
              <option key={i} value={i}>
                {runLabel(r, i)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Result */}
      <div aria-live="polite" className="space-y-3">
        {result && (
          <section className="space-y-2 rounded-md border border-border bg-background p-3">
            <h3
              className="text-sm font-semibold text-foreground"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {intl.formatMessage({ id: "prompt.fixture.result.heading" })}
            </h3>
            <dl className="grid grid-cols-2 gap-2 text-xs" style={{ fontFamily: "var(--font-mono)" }}>
              <div>
                <dt className="text-foreground-subtle">proposals</dt>
                <dd className="text-foreground">
                  <FormattedMessage
                    id="prompt.fixture.result.proposals"
                    values={{ count: result.proposals_count }}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-foreground-subtle">latency</dt>
                <dd className="text-foreground">
                  <FormattedMessage
                    id="prompt.fixture.result.latency"
                    values={{ ms: result.latency_ms }}
                  />
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-foreground-subtle">tokens</dt>
                <dd className="text-foreground">
                  {result.token_count != null ? (
                    <FormattedMessage
                      id="prompt.fixture.result.tokens"
                      values={{ tokens: result.token_count }}
                    />
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>

            <ul role="list" className="space-y-1.5 text-xs">
              {result.proposals.map((p, i) => (
                <li
                  key={i}
                  className="rounded border border-border bg-surface p-2"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  <div className="text-foreground">{p.rule_type}</div>
                  <div className="text-foreground-muted">{p.description}</div>
                  <div className="text-foreground-subtle">{p.citation}</div>
                </li>
              ))}
            </ul>

            <details className="text-xs">
              <summary className="cursor-pointer text-foreground-subtle">
                raw response
              </summary>
              <pre
                className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-surface-sunken p-2"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {result.raw_response}
              </pre>
            </details>
          </section>
        )}

        {/* Compare picker */}
        {history.length > 1 && result && (
          <div className="space-y-1.5">
            <label
              htmlFor="fixture-compare-select"
              className="text-xs uppercase tracking-[0.14em] text-foreground-subtle"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {intl.formatMessage({ id: "prompt.fixture.compare.label" })}
            </label>
            <select
              id="fixture-compare-select"
              value={compareIndex ?? ""}
              onChange={(e) =>
                setCompareIndex(e.target.value === "" ? null : Number(e.target.value))
              }
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <option value="">
                {intl.formatMessage({ id: "prompt.fixture.compare.none" })}
              </option>
              {compareOptions.map((i) => (
                <option key={i} value={i}>
                  {runLabel(history[i], i)}
                </option>
              ))}
            </select>
          </div>
        )}

        {result && compare && <RunCompareDiff left={result} right={compare} />}

        {/* Export */}
        {history.length > 0 && (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex h-9 w-full items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-surface-sunken"
          >
            {intl.formatMessage({ id: "prompt.fixture.export" })}
          </button>
        )}
      </div>
    </aside>
  );
}
