import { useIntl } from "react-intl";
import { Plus, X } from "lucide-react";
import type { ScreenResidencyPeriod } from "@/lib/types";

const COUNTRIES = [
  "ca", "br", "es", "fr", "de", "ua",
  "us", "uk", "mx", "pt", "ar", "it", "pl", "in", "ph", "cn", "other",
];

export function ResidencyPeriodRows({
  periods,
  onChange,
}: {
  periods: ScreenResidencyPeriod[];
  onChange: (next: ScreenResidencyPeriod[]) => void;
}) {
  const intl = useIntl();

  const update = (i: number, patch: Partial<ScreenResidencyPeriod>) => {
    const next = periods.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
    onChange(next);
  };

  const remove = (i: number) => onChange(periods.filter((_, idx) => idx !== i));

  const add = () =>
    onChange([
      ...periods,
      { country: "", start_date: "", end_date: null },
    ]);

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium mb-1">
        {intl.formatMessage({ id: "screen.form.residency.heading" })}
      </legend>
      {periods.map((p, i) => {
        const ongoing = p.end_date === null;
        return (
          <div
            key={i}
            className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end p-3 rounded border border-border bg-surface-sunken"
          >
            <label className="text-sm">
              <span className="block text-foreground-muted mb-1">
                {intl.formatMessage({ id: "screen.form.residency.country" })}
              </span>
              <select
                value={p.country}
                onChange={(e) => update(i, { country: e.target.value })}
                onKeyDown={(e) => {
                  // a11y: Backspace on an empty country deletes the row.
                  if (e.key === "Backspace" && !p.country && periods.length > 1) {
                    e.preventDefault();
                    remove(i);
                  }
                }}
                className="w-full h-9 px-2 rounded border border-border bg-surface text-foreground"
                aria-required="true"
              >
                <option value="">—</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c.toUpperCase()}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="block text-foreground-muted mb-1">
                {intl.formatMessage({ id: "screen.form.residency.start" })}
              </span>
              <input
                type="date"
                value={p.start_date}
                onChange={(e) => update(i, { start_date: e.target.value })}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full h-9 px-2 rounded border border-border bg-surface text-foreground"
                aria-required="true"
              />
            </label>
            <label className="text-sm">
              <span className="block text-foreground-muted mb-1">
                {intl.formatMessage({ id: "screen.form.residency.end" })}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={p.end_date ?? ""}
                  disabled={ongoing}
                  onChange={(e) => update(i, { end_date: e.target.value || null })}
                  max={new Date().toISOString().slice(0, 10)}
                  className="flex-1 h-9 px-2 rounded border border-border bg-surface text-foreground disabled:opacity-50"
                />
                <label className="inline-flex items-center gap-1 text-xs text-foreground-muted">
                  <input
                    type="checkbox"
                    checked={ongoing}
                    onChange={(e) => update(i, { end_date: e.target.checked ? null : "" })}
                  />
                  {intl.formatMessage({ id: "screen.form.residency.ongoing" })}
                </label>
              </div>
            </label>
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={periods.length === 1}
              className="h-9 w-9 inline-flex items-center justify-center rounded border border-border text-foreground-muted hover:text-foreground hover:bg-surface disabled:opacity-30"
              aria-label={`Remove residency period ${i + 1}`}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 text-sm text-foreground hover:text-foreground underline-offset-2 hover:underline"
      >
        <Plus className="size-4" aria-hidden />
        {intl.formatMessage({ id: "screen.form.residency.add" })}
      </button>
    </fieldset>
  );
}
