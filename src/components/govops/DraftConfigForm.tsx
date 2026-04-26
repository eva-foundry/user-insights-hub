import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { useIntl } from "react-intl";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import { ValueInput } from "./inputs/ValueInput";
import { DateTimeInput } from "./inputs/DateTimeInput";
import { SupersedesPanel } from "./SupersedesPanel";
import { useUnsavedChangesPrompt } from "@/lib/dirtyState";
import {
  coerceValue,
  validateKey,
  validateRationale,
} from "@/lib/validators";
import {
  DOMAINS,
  JURISDICTIONS,
  LANGUAGES,
  type ConfigValue,
  type CreateConfigValueRequest,
  type ValueType,
} from "@/lib/types";

const VALUE_TYPES: ValueType[] = [
  "number",
  "string",
  "bool",
  "list",
  "enum",
  "prompt",
  "formula",
];

type Initial = {
  key?: string;
  jurisdiction_id?: string;
  value_type?: string;
  supersedes_id?: string;
};

type Errors = Partial<Record<
  "key" | "jurisdiction" | "domain" | "value_type" | "value" | "effective_from" | "citation" | "rationale" | "language",
  string
>>;

/** Today midnight UTC, ISO-8601 with Z. */
function todayMidnightUtc(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}T00:00:00.000Z`;
}

export function DraftConfigForm({
  initial,
  prior,
  onSubmit,
  submitting,
  currentAuthor = "human:maintainer",
}: {
  initial: Initial;
  prior: ConfigValue | null;
  onSubmit: (body: CreateConfigValueRequest) => Promise<void> | void;
  submitting: boolean;
  currentAuthor?: string;
}) {
  const intl = useIntl();
  const nav = useNavigate();
  const headingId = useId();

  // -- field state --
  const [key, setKey] = useState(initial.key ?? prior?.key ?? "");
  const [jurisdiction, setJurisdiction] = useState<string>(
    initial.jurisdiction_id ?? prior?.jurisdiction_id ?? "global",
  );
  const [domain, setDomain] = useState<string>(prior?.domain ?? "rule");
  const [valueType, setValueType] = useState<ValueType>(
    (initial.value_type as ValueType) ?? prior?.value_type ?? "number",
  );
  const [value, setValue] = useState<unknown>(prior?.value ?? "");
  const [effectiveFrom, setEffectiveFrom] = useState<string>(todayMidnightUtc());
  const [citation, setCitation] = useState<string>("");
  const [rationale, setRationale] = useState<string>("");
  const [language, setLanguage] = useState<string>(prior?.language ?? "en");

  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // -- locked fields when superseding --
  const lockedKey = !!initial.supersedes_id || !!prior;
  const lockedJurisdiction = !!initial.supersedes_id || !!prior;
  const lockedDomain = !!initial.supersedes_id || !!prior;
  const lockedValueType = !!initial.supersedes_id || !!prior;

  // -- dirty state --
  const dirty = useMemo(() => {
    return (
      (typeof value === "string" ? value.length > 0 : Array.isArray(value) ? value.length > 0 : value !== "" && value !== undefined) ||
      citation.trim() !== "" ||
      rationale.trim() !== "" ||
      key !== (initial.key ?? prior?.key ?? "")
    );
  }, [value, citation, rationale, key, initial.key, prior]);

  useUnsavedChangesPrompt(dirty, intl.formatMessage({ id: "draft.unsaved.body" }));

  // Reset value when value_type changes (avoid type-mismatched residue).
  useEffect(() => {
    if (prior && valueType === prior.value_type) return;
    if (valueType === "bool") setValue(false);
    else if (valueType === "list" || valueType === "enum") setValue([]);
    else setValue("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueType]);

  function validateAll(): { ok: boolean; coercedValue?: unknown } {
    const next: Errors = {};
    const keyErr = validateKey(key);
    if (keyErr) next.key = keyErr;

    if (!effectiveFrom) next.effective_from = "validators.effective_from.required";

    if (domain === "rule" && !citation.trim()) next.citation = "validators.citation.required";

    const ratErr = validateRationale(rationale);
    if (ratErr) next.rationale = ratErr;

    let coerced: unknown;
    try {
      coerced = coerceValue(value, valueType);
      if (valueType === "number" && (value === "" || value === undefined || value === null))
        next.value = "validators.value.required";
      if ((valueType === "string" || valueType === "prompt") && !String(value ?? "").trim())
        next.value = "validators.value.required";
      if ((valueType === "list" || valueType === "enum") && (!Array.isArray(coerced) || coerced.length === 0))
        next.value = "validators.value.required";
    } catch (e) {
      next.value = (e as Error).message;
    }

    if (domain === "ui" && !language) next.language = "validators.language.required";

    setErrors(next);
    return { ok: Object.keys(next).length === 0, coercedValue: coerced };
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);
    const { ok, coercedValue } = validateAll();
    if (!ok) {
      // Focus the first invalid field for keyboard users.
      const firstError = document.querySelector<HTMLElement>("[aria-invalid='true']");
      firstError?.focus();
      return;
    }
    const body: CreateConfigValueRequest = {
      domain,
      key,
      jurisdiction_id: jurisdiction === "global" ? null : jurisdiction,
      value: coercedValue,
      value_type: valueType,
      effective_from: effectiveFrom,
      effective_to: null,
      citation: citation.trim() || null,
      author: currentAuthor,
      rationale: rationale.trim(),
      supersedes: prior?.id ?? initial.supersedes_id ?? null,
      language: domain === "ui" ? language : null,
    };
    try {
      await onSubmit(body);
      toast.success(intl.formatMessage({ id: "draft.success" }));
    } catch (err) {
      setSubmitError((err as Error).message);
    }
  }

  function handleCancel() {
    if (dirty) {
      const ok = window.confirm(intl.formatMessage({ id: "draft.unsaved.body" }));
      if (!ok) return;
    }
    if (window.history.length > 1) window.history.back();
    else nav({ to: "/config" });
  }

  // Resolve label/id helpers
  const ids = {
    key: useId(),
    jurisdiction: useId(),
    domain: useId(),
    valueType: useId(),
    value: useId(),
    effectiveFrom: useId(),
    citation: useId(),
    rationale: useId(),
    language: useId(),
  };

  const isAgent = currentAuthor.startsWith("agent:");
  const headingMsg = prior
    ? intl.formatMessage({ id: "draft.heading.supersede" }, { key: prior.key })
    : intl.formatMessage({ id: "draft.heading" });

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby={headingId}
      className="space-y-6"
      noValidate
    >
      <header className="space-y-2">
        <p
          className="text-xs uppercase tracking-[0.2em] text-foreground-subtle"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          spec govops-006
        </p>
        <h1
          id={headingId}
          className="text-xl tracking-tight text-foreground sm:text-2xl"
          style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}
        >
          {headingMsg}
        </h1>
      </header>

      {prior && <SupersedesPanel prior={prior} />}

      {/* aria-live region for validation announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {Object.keys(errors).length > 0
          ? `${Object.keys(errors).length} validation error${Object.keys(errors).length === 1 ? "" : "s"}`
          : ""}
      </div>

      <div className="grid grid-cols-1 gap-5 rounded-md border border-border bg-surface-raised p-5 sm:grid-cols-2">
        {/* Key */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={ids.key}>
            {intl.formatMessage({ id: "draft.field.key.label" })} <span aria-hidden style={{ color: "var(--verdict-rejected)" }}>*</span>
          </Label>
          <Input
            id={ids.key}
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={lockedKey}
            required
            aria-required="true"
            aria-invalid={!!errors.key}
            aria-describedby={`${ids.key}-help ${errors.key ? `${ids.key}-error` : ""}`.trim()}
            style={{ fontFamily: "var(--font-mono)", ...(errors.key ? { borderColor: "var(--verdict-rejected)" } : {}) }}
          />
          <p id={`${ids.key}-help`} className="text-xs text-foreground-muted">
            {intl.formatMessage({ id: "draft.field.key.help" })}
          </p>
          {errors.key && (
            <p id={`${ids.key}-error`} role="alert" className="text-xs" style={{ color: "var(--verdict-rejected)" }}>
              {intl.formatMessage({ id: errors.key })}
            </p>
          )}
        </div>

        {/* Jurisdiction */}
        <div className="space-y-1.5">
          <Label htmlFor={ids.jurisdiction}>{intl.formatMessage({ id: "draft.field.jurisdiction.label" })}</Label>
          <Select value={jurisdiction} onValueChange={setJurisdiction} disabled={lockedJurisdiction}>
            <SelectTrigger id={ids.jurisdiction}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="global">global</SelectItem>
              {JURISDICTIONS.map((j) => (<SelectItem key={j} value={j}>{j}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {/* Domain */}
        <div className="space-y-1.5">
          <Label htmlFor={ids.domain}>{intl.formatMessage({ id: "draft.field.domain.label" })}</Label>
          <Select value={domain} onValueChange={setDomain} disabled={lockedDomain}>
            <SelectTrigger id={ids.domain}><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOMAINS.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {/* Value type */}
        <div className="space-y-1.5">
          <Label htmlFor={ids.valueType}>{intl.formatMessage({ id: "draft.field.value_type.label" })}</Label>
          <Select value={valueType} onValueChange={(v) => setValueType(v as ValueType)} disabled={lockedValueType}>
            <SelectTrigger id={ids.valueType}><SelectValue /></SelectTrigger>
            <SelectContent>
              {VALUE_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {/* Effective from */}
        <div className="space-y-1.5">
          <Label htmlFor={ids.effectiveFrom}>
            {intl.formatMessage({ id: "draft.field.effective_from.label" })} <span aria-hidden style={{ color: "var(--verdict-rejected)" }}>*</span>
          </Label>
          <DateTimeInput
            id={ids.effectiveFrom}
            value={effectiveFrom}
            onChange={setEffectiveFrom}
            ariaDescribedBy={`${ids.effectiveFrom}-help ${errors.effective_from ? `${ids.effectiveFrom}-error` : ""}`.trim()}
            ariaInvalid={!!errors.effective_from}
            required
          />
          <p id={`${ids.effectiveFrom}-help`} className="text-xs text-foreground-muted">
            {intl.formatMessage({ id: "draft.field.effective_from.help" })}
          </p>
        </div>

        {/* Value (full width) */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={ids.value}>
            {intl.formatMessage({ id: "draft.field.value.label" })} <span aria-hidden style={{ color: "var(--verdict-rejected)" }}>*</span>
          </Label>
          <ValueInput
            id={ids.value}
            type={valueType}
            value={value}
            onChange={setValue}
            ariaDescribedBy={errors.value ? `${ids.value}-error` : undefined}
            ariaInvalid={!!errors.value}
          />
          {errors.value && (
            <p id={`${ids.value}-error`} role="alert" className="text-xs" style={{ color: "var(--verdict-rejected)" }}>
              {intl.formatMessage({ id: errors.value })}
            </p>
          )}
        </div>

        {/* Citation */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={ids.citation}>
            {intl.formatMessage({ id: "draft.field.citation.label" })}
            {domain === "rule" && (<span aria-hidden style={{ color: "var(--verdict-rejected)" }}> *</span>)}
          </Label>
          <Input
            id={ids.citation}
            type="text"
            value={citation}
            onChange={(e) => setCitation(e.target.value)}
            aria-required={domain === "rule" || undefined}
            aria-invalid={!!errors.citation}
            aria-describedby={`${ids.citation}-help ${errors.citation ? `${ids.citation}-error` : ""}`.trim()}
            style={{ fontFamily: "var(--font-mono)", ...(errors.citation ? { borderColor: "var(--verdict-rejected)" } : {}) }}
          />
          <p id={`${ids.citation}-help`} className="text-xs text-foreground-muted">
            {intl.formatMessage({ id: "draft.field.citation.help" })}
          </p>
          {errors.citation && (
            <p id={`${ids.citation}-error`} role="alert" className="text-xs" style={{ color: "var(--verdict-rejected)" }}>
              {intl.formatMessage({ id: errors.citation })}
            </p>
          )}
        </div>

        {/* Language (only for ui domain) */}
        {domain === "ui" && (
          <div className="space-y-1.5">
            <Label htmlFor={ids.language}>{intl.formatMessage({ id: "draft.field.language.label" })}</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id={ids.language}><SelectValue /></SelectTrigger>
              <SelectContent>
                {[...LANGUAGES, "ar"].map((l) => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Rationale (full width) */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={ids.rationale}>
            {intl.formatMessage({ id: "draft.field.rationale.label" })} <span aria-hidden style={{ color: "var(--verdict-rejected)" }}>*</span>
          </Label>
          <Textarea
            id={ids.rationale}
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            required
            aria-required="true"
            aria-invalid={!!errors.rationale}
            aria-describedby={`${ids.rationale}-help ${errors.rationale ? `${ids.rationale}-error` : ""}`.trim()}
            className="min-h-[120px]"
            style={errors.rationale ? { borderColor: "var(--verdict-rejected)" } : undefined}
          />
          <p id={`${ids.rationale}-help`} className="text-xs text-foreground-muted">
            {intl.formatMessage({ id: "draft.field.rationale.help" })}
          </p>
          {errors.rationale && (
            <p id={`${ids.rationale}-error`} role="alert" className="text-xs" style={{ color: "var(--verdict-rejected)" }}>
              {intl.formatMessage({ id: errors.rationale }, { min: 20 })}
            </p>
          )}
        </div>
      </div>

      {submitError && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-md border p-3 text-sm"
          style={{
            borderColor: "var(--verdict-rejected)",
            backgroundColor: "color-mix(in oklch, var(--verdict-rejected) 6%, transparent)",
            color: "var(--verdict-rejected)",
          }}
        >
          {submitError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={handleCancel} disabled={submitting}>
          {intl.formatMessage({ id: "draft.cancel" })}
        </Button>
        <Button
          type="submit"
          variant={isAgent ? "agent" : "authority"}
          disabled={submitting}
        >
          {submitting
            ? intl.formatMessage({ id: "draft.submit.submitting" })
            : intl.formatMessage({ id: "draft.submit" })}
        </Button>
      </div>
    </form>
  );
}