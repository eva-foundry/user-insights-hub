import { useMemo, useState } from "react";
import { useIntl } from "react-intl";
import type {
  ScreenLegalStatus,
  ScreenRequest,
  ScreenResidencyPeriod,
} from "@/lib/types";
import { ResidencyPeriodRows } from "./ResidencyPeriodRows";

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

function isValid(s: ScreenFormState): boolean {
  if (!s.date_of_birth) return false;
  if (s.date_of_birth < MIN_DOB) return false;
  if (s.date_of_birth > TODAY()) return false;
  if (!s.legal_status) return false;
  if (s.residency_periods.length === 0) return false;
  for (const p of s.residency_periods) {
    if (!p.country || !p.start_date) return false;
    if (p.end_date !== null && p.end_date && p.end_date < p.start_date) return false;
  }
  return true;
}

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
  const valid = useMemo(() => isValid(state), [state]);

  const patch = (p: Partial<ScreenFormState>) => {
    setState((s) => ({ ...s, ...p }));
    onChange?.();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
          className="mt-1 h-9 px-2 rounded border border-border bg-surface text-foreground"
        />
        <p className="text-xs text-foreground-muted mt-1">
          {intl.formatMessage({ id: "screen.form.dob.help" })}
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">
          {intl.formatMessage({ id: "screen.form.legal_status.label" })}{" "}
          <span aria-hidden className="text-destructive">*</span>
        </legend>
        <div className="mt-2 grid gap-2">
          {(["citizen", "permanent_resident", "other"] as const).map((opt) => (
            <label key={opt} className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="legal_status"
                value={opt}
                checked={state.legal_status === opt}
                onChange={() => patch({ legal_status: opt })}
                aria-required="true"
              />
              {intl.formatMessage({ id: `screen.form.legal_status.${opt}` })}
            </label>
          ))}
        </div>
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

      <button
        type="submit"
        disabled={!valid || loading}
        className="inline-flex items-center justify-center h-10 px-4 rounded bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {loading
          ? intl.formatMessage({ id: "screen.form.submit.loading" })
          : intl.formatMessage({ id: "screen.form.submit" })}
      </button>
    </form>
  );
}
