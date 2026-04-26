import { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { listFixtures, runFixtureWithPrompt } from "@/lib/api";
import type { FixtureBatchSummary } from "@/lib/api";
import { toast } from "sonner";
import { RunCompareDiff } from "./RunCompareDiff";
import { exportFixtureReport } from "@/lib/exportFixtureReport";
import {
  useFixtureHistory,
  runLabel,
} from "./fixture/useFixtureHistory";
import { FixtureResult } from "./fixture/FixtureResult";

/**
 * Side panel that lets a maintainer execute the encoder against a saved
 * fixture using the in-progress prompt body — without committing rules.
 *
 * Persistent run history + compare/export live here; rendering of an
 * individual run is delegated to <FixtureResult/>, persistence to
 * useFixtureHistory().
 */
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
  const [selectedFixture, setSelectedFixture] = useState("");
  const [running, setRunning] = useState(false);

  const {
    history,
    viewIndex,
    setViewIndex,
    compareIndex,
    setCompareIndex,
    append,
  } = useFixtureHistory(promptKey);

  useEffect(() => {
    listFixtures()
      .then((rows) => {
        setFixtures(rows);
        if (rows[0]) setSelectedFixture((cur) => cur || rows[0].id);
      })
      .catch(() => setFixtures([]));
  }, []);

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
      append(r);
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
          role="alert"
          aria-live="polite"
          className="text-[11px]"
          style={{ color: "var(--verdict-rejected)", fontFamily: "var(--font-mono)" }}
        >
          {disabledReason}
        </p>
      )}

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

      <div aria-live="polite" className="space-y-3">
        {result && <FixtureResult result={result} />}

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
