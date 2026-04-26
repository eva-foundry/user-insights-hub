import { useEffect, useMemo, useRef, useState } from "react";
import { useIntl } from "react-intl";
import type {
  ScreenLegalStatus,
  ScreenRequest,
  ScreenResidencyPeriod,
} from "@/lib/types";
import { ResidencyPeriodRows } from "./ResidencyPeriodRows";
import {
  validateScreenForm,
  isValid as isErrorFree,
  type ScreenFormErrors,
} from "@/lib/screenValidation";
import {
  loadScreenDraft,
  saveScreenDraft,
  clearScreenDraft,
} from "@/lib/screenDraft";

const MIN_DOB = "1900-01-01";
const TODAY = () => new Date().toISOString().slice(0, 10);

export interface ScreenFormState {
  date_of_birth: string;
  legal_status: ScreenLegalStatus | "";
  country_of_birth: string;
  residency_periods: ScreenResidencyPeriod[];
  evidence_dob: boolean;
  evidence_residency: boolean;
}

const EMPTY: ScreenFormState = {
  date_of_birth: "",
  legal_status: "",
  country_of_birth: "",
  residency_periods: [{ country: "", start_date: "", end_date: null }],
  evidence_dob: false,
  evidence_residency: false,
};

export function ScreenForm({
  jurisdictionId,
  loading,
  onSubmit,
  onChange,
}: {
  jurisdictionId: string;
  loading: boolean;
  onSubmit: (req: ScreenRequest) => void;
  onChange?: () => void;
}) {
  const intl = useIntl();
  const [state, setState] = useState<ScreenFormState>(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [restored, setRestored] = useState(false);
  const restoredRef = useRef(false);

  // ── Restore session draft on mount (per-jurisdiction) ─────────────────
  useEffect(() => {
    const saved = loadScreenDraft(jurisdictionId) as ScreenFormState | null;
    if (saved && typeof saved === "object" && Array.isArray(saved.residency_periods)) {
      setState(saved);
      setRestored(true);
      restoredRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jurisdictionId]);

  // ── Persist on every change (session-scoped, no PII written to disk) ──
  useEffect(() => {
    // Skip the initial empty render to avoid clobbering an existing draft
    // before restore lands.
    if (state === EMPTY && !restoredRef.current) return;
    saveScreenDraft(jurisdictionId, state);
  }, [state, jurisdictionId]);

  const errors: ScreenFormErrors = useMemo(
    () =>
      validateScreenForm({
        date_of_birth: state.date_of_birth,
        legal_status: state.legal_status,
        residency_periods: state.residency_periods,
      }),
    [state],
  );
  const valid = isErrorFree(errors);

  /** Show errors only after the user attempts submit, to avoid noisy first paint. */
  const showError = (key: string) => (submitted ? errors[key] : undefined);

  const patch = (p: Partial<ScreenFormState>) => {
    setState((s) => ({ ...s, ...p }));
    onChange?.();
  };

  const clearDraft = () => {
    setState(EMPTY);
    setSubmitted(false);
    setRestored(false);
    restoredRef.current = false;
    clearScreenDraft();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!valid || loading) return;
    onSubmit({
      jurisdiction_id: jurisdictionId,
      date_of_birth: state.date_of_birth,
      legal_status: state.legal_status as ScreenLegalStatus,
      country_of_birth: state.country_of_birth || undefined,
      residency_periods: state.residency_periods,
      evidence_present: {
        dob: state.evidence_dob,
        residency: state.evidence_residency,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 screen-form" noValidate>
      {restored && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded border border-border bg-surface-sunken px-3 py-2 text-sm"
        >
          <span className="text-foreground-muted">
            {intl.formatMessage({ id: "screen.draft.restored" })}
          </span>
          <button
            type="button"
            onClick={clearDraft}
            className="underline underline-offset-2 text-foreground hover:opacity-80"
          >
            {intl.formatMessage({ id: "screen.draft.clear" })}
          </button>
        </div>
      )}

      <div>
        <label htmlFor="screen-dob" className="block text-sm font-medium">
          {intl.formatMessage({ id: "screen.form.dob.label" })}{" "}
          <span aria-hidden className="text-destructive">*</span>
        </label>
        <input
          id="screen-dob"
          type="date"
          required
          aria-required="true"
          min={MIN_DOB}
          max={TODAY()}
          value={state.date_of_birth}
          onChange={(e) => patch({ date_of_birth: e.target.value })}
          className={`mt-1 h-9 px-2 rounded border bg-surface text-foreground ${showError("dob") ? "border-destructive" : "border-border"}`}
          aria-invalid={showError("dob") ? true : undefined}
          aria-describedby={showError("dob") ? "err-screen-dob" : "screen-dob-help"}
        />
        <p id="screen-dob-help" className="text-xs text-foreground-muted mt-1">
          {intl.formatMessage({ id: "screen.form.dob.help" })}
        </p>
        {showError("dob") && (
          <p id="err-screen-dob" role="alert" className="mt-1 text-xs text-destructive">
            {intl.formatMessage({ id: showError("dob")! })}
          </p>
        )}
      </div>

      <fieldset>
        <legend className="text-sm font-medium">
          {intl.formatMessage({ id: "screen.form.legal_status.label" })}{" "}
          <span aria-hidden className="text-destructive">*</span>
        </legend>
        <div className="mt-2 grid gap-2" aria-describedby={showError("legal_status") ? "err-screen-legal" : undefined}>
          {(["citizen", "permanent_resident", "other"] as const).map((opt) => (
            <label key={opt} className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="legal_status"
                value={opt}
                checked={state.legal_status === opt}
                onChange={() => patch({ legal_status: opt })}
                aria-required="true"
                aria-invalid={showError("legal_status") ? true : undefined}
              />
              {intl.formatMessage({ id: `screen.form.legal_status.${opt}` })}
            </label>
          ))}
        </div>
        {showError("legal_status") && (
          <p id="err-screen-legal" role="alert" className="mt-1 text-xs text-destructive">
            {intl.formatMessage({ id: showError("legal_status")! })}
          </p>
        )}
      </fieldset>

      <div>
        <label htmlFor="screen-cob" className="block text-sm font-medium">
          {intl.formatMessage({ id: "screen.form.country_of_birth.label" })}
        </label>
        <input
          id="screen-cob"
          type="text"
          maxLength={80}
          value={state.country_of_birth}
          onChange={(e) => patch({ country_of_birth: e.target.value })}
          className="mt-1 h-9 px-2 rounded border border-border bg-surface text-foreground w-full max-w-xs"
        />
        <p className="text-xs text-foreground-muted mt-1">
          {intl.formatMessage({ id: "screen.form.country_of_birth.help" })}
        </p>
      </div>

      <ResidencyPeriodRows
        periods={state.residency_periods}
        onChange={(periods) => patch({ residency_periods: periods })}
        errors={submitted ? errors : undefined}
        fieldsetError={showError("residency")}
      />

      <fieldset>
        <legend className="text-sm font-medium">
          {intl.formatMessage({ id: "screen.form.evidence.heading" })}
        </legend>
        <div className="mt-2 grid gap-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.evidence_dob}
              onChange={(e) => patch({ evidence_dob: e.target.checked })}
            />
            {intl.formatMessage({ id: "screen.form.evidence.dob" })}
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.evidence_residency}
              onChange={(e) => patch({ evidence_residency: e.target.checked })}
            />
            {intl.formatMessage({ id: "screen.form.evidence.residency" })}
          </label>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center h-10 px-4 rounded bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {loading
            ? intl.formatMessage({ id: "screen.form.submit.loading" })
            : intl.formatMessage({ id: "screen.form.submit" })}
        </button>
        <button
          type="button"
          onClick={clearDraft}
          className="text-sm text-foreground-muted hover:text-foreground underline underline-offset-2"
        >
          {intl.formatMessage({ id: "screen.form.reset" })}
        </button>
        {submitted && !valid && (
          <p role="alert" className="text-sm text-destructive">
            {intl.formatMessage({ id: "screen.errors.summary" })}
          </p>
        )}
      </div>
    </form>
  );
}
