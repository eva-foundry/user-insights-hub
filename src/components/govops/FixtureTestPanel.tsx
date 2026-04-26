import { useEffect, useState } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import { listFixtures, runFixtureWithPrompt } from "@/lib/api";
import type { FixtureBatchSummary, FixtureRunResult } from "@/lib/api";
import { toast } from "sonner";

/**
 * Side panel that lets a maintainer execute the encoder against a saved
 * fixture using the in-progress prompt body — without committing rules.
 *
 * The last 3 runs are kept in localStorage (per prompt key) so the user can
 * compare proposal counts as they tweak the prompt.
 */
const HISTORY_LIMIT = 3;

function historyKey(promptKey: string) {
  return `govops:fixture-runs:${promptKey}`;
}

function loadHistory(promptKey: string): FixtureRunResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(historyKey(promptKey));
    return raw ? (JSON.parse(raw) as FixtureRunResult[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(promptKey: string, runs: FixtureRunResult[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(historyKey(promptKey), JSON.stringify(runs.slice(0, HISTORY_LIMIT)));
  } catch {
    /* quota exceeded — silently drop */
  }
}

export function FixtureTestPanel({
  promptKey,
  promptText,
}: {
  promptKey: string;
  promptText: string;
}) {
  const intl = useIntl();
  const [fixtures, setFixtures] = useState<FixtureBatchSummary[] | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<FixtureRunResult | null>(null);
  const [history, setHistory] = useState<FixtureRunResult[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    listFixtures()
      .then((rows) => {
        setFixtures(rows);
        if (rows[0]) setSelected((cur) => cur || rows[0].id);
      })
      .catch(() => setFixtures([]));
  }, []);

  useEffect(() => {
    setHistory(loadHistory(promptKey));
  }, [promptKey]);

  const onRun = async () => {
    if (!selected) return;
    setRunning(true);
    try {
      const r = await runFixtureWithPrompt(selected, {
        prompt_text: promptText,
        prompt_key: promptKey,
      });
      setResult(r);
      const next = [r, ...history].slice(0, HISTORY_LIMIT);
      setHistory(next);
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
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={!fixtures || fixtures.length === 0}
          className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
        >
          {fixtures === null && <option>…</option>}
          {fixtures && fixtures.length === 0 && (
            <option value="">{intl.formatMessage({ id: "prompt.fixture.select.placeholder" })}</option>
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
        disabled={running || !selected || !promptText.trim()}
        className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: "var(--lavender-600)" }}
      >
        {running
          ? intl.formatMessage({ id: "prompt.fixture.running" })
          : intl.formatMessage({ id: "prompt.fixture.run" })}
      </button>

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
                  <FormattedMessage id="prompt.fixture.result.latency" values={{ ms: result.latency_ms }} />
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-foreground-subtle">tokens</dt>
                <dd className="text-foreground">
                  {result.token_count != null ? (
                    <FormattedMessage id="prompt.fixture.result.tokens" values={{ tokens: result.token_count }} />
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
              <summary className="cursor-pointer text-foreground-subtle">raw response</summary>
              <pre
                className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-surface-sunken p-2"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {result.raw_response}
              </pre>
            </details>
          </section>
        )}

        {history.length > 1 && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowCompare((v) => !v)}
              className="text-xs underline text-foreground-muted hover:text-foreground"
            >
              {intl.formatMessage({ id: "prompt.fixture.result.compare_with_previous" })}
            </button>
            {showCompare && (
              <ol
                role="list"
                className="space-y-1 rounded-md border border-border bg-background p-2 text-xs"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {history.map((h, i) => (
                  <li key={i} className="flex justify-between">
                    <span className="text-foreground-subtle">run -{i}</span>
                    <span className="text-foreground">
                      {h.proposals_count} proposals · {h.latency_ms}ms
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
