import { useCallback, useEffect, useId, useMemo, useState, type FormEvent } from "react";
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
import { DraftPreview } from "./DraftPreview";
import { useUnsavedChangesPrompt } from "@/lib/dirtyState";
import {
  coerceValue,
  validateKey,
  validateRationale,
  validateIsoUtc,
} from "@/lib/validators";
import { emitDraftsChanged, saveRecentDraft } from "@/lib/draftStorage";
import { StorageKeys } from "@/lib/storageKeys";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DOMAINS,
  JURISDICTIONS,
  LANGUAGES,
  type ConfigValue,
  type CreateConfigValueRequest,
  type ValueType,
} from "@/lib/types";
import { hydrateValue, todayMidnightUtc, VALUE_TYPES } from "./draft/draftHelpers";

type Initial = {
  key?: string;
  jurisdiction_id?: string;
  value_type?: string;
  supersedes_id?: string;
  // Save-as-draft hydration fields:
  domain?: string;
  value?: string;
  effective_from?: string;
  citation?: string;
  rationale?: string;
  language?: string;
};

type Errors = Partial<Record<
  "key" | "jurisdiction" | "domain" | "value_type" | "value" | "effective_from" | "citation" | "rationale" | "language",
  string
>>;

type FieldName = keyof Errors;

export function DraftConfigForm({
  initial,
  prior,
  onSubmit,
  onSaveDraft,
  submitting,
  currentAuthor = "human:maintainer",
}: {
  initial: Initial;
  prior: ConfigValue | null;
  onSubmit: (body: CreateConfigValueRequest) => Promise<void> | void;
  onSaveDraft?: (params: Record<string, string>) => void;
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
  const [domain, setDomain] = useState<string>(initial.domain ?? prior?.domain ?? "rule");
  const [valueType, setValueType] = useState<ValueType>(
    (initial.value_type as ValueType) ?? prior?.value_type ?? "number",
  );
  const [value, setValue] = useState<unknown>(
    initial.value !== undefined ? hydrateValue(initial.value, (initial.value_type as ValueType) ?? prior?.value_type ?? "number") : prior?.value ?? "",
  );
  const [effectiveFrom, setEffectiveFrom] = useState<string>(initial.effective_from ?? todayMidnightUtc());
  const [citation, setCitation] = useState<string>(initial.citation ?? "");
  const [rationale, setRationale] = useState<string>(initial.rationale ?? "");
  const [language, setLanguage] = useState<string>(initial.language ?? prior?.language ?? "en");

  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showPreview, setShowPreview] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(StorageKeys.draftPreviewOpen);
    return stored === null ? true : stored === "true";
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedDraftOnce, setSavedDraftOnce] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  // Persist preview-open across reloads / save-as-draft navigations.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(StorageKeys.draftPreviewOpen, String(showPreview));
  }, [showPreview]);

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

  // Reset value when value_type changes (avoid type-mismatched residue), but
  // skip the very first render so URL-hydrated values survive.
  const [vtMounted, setVtMounted] = useState(false);
  useEffect(() => {
    if (!vtMounted) {
      setVtMounted(true);
      return;
    }
    if (prior && valueType === prior.value_type) return;
    if (valueType === "bool") setValue(false);
    else if (valueType === "list" || valueType === "enum") setValue([]);
    else setValue("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueType]);

  // -- per-field validators (single source of truth) --
  const computeFieldError = useCallback(
    (field: FieldName, draftSnapshot?: Partial<Record<FieldName, unknown>>): string | undefined => {
      const v = (k: FieldName, fallback: unknown) =>
        draftSnapshot && k in draftSnapshot ? draftSnapshot[k] : fallback;
      switch (field) {
        case "key":
          return validateKey(String(v("key", key))) ?? undefined;
        case "effective_from":
          return validateIsoUtc(String(v("effective_from", effectiveFrom) ?? "")) ?? undefined;
        case "citation":
          return (v("domain", domain) === "rule" && !String(v("citation", citation)).trim())
            ? "validators.citation.required"
            : undefined;
        case "rationale":
          return validateRationale(String(v("rationale", rationale))) ?? undefined;
        case "language":
          return v("domain", domain) === "ui" && !v("language", language)
            ? "validators.language.required"
            : undefined;
        case "value": {
          const t = (v("value_type", valueType) as ValueType) ?? valueType;
          const raw = v("value", value);
          try {
            const coerced = coerceValue(raw, t);
            if (t === "number" && (raw === "" || raw === undefined || raw === null))
              return "validators.value.required";
            if ((t === "string" || t === "prompt") && !String(raw ?? "").trim())
              return "validators.value.required";
            if ((t === "list" || t === "enum") && (!Array.isArray(coerced) || coerced.length === 0))
              return "validators.value.required";
            return undefined;
          } catch (e) {
            return (e as Error).message;
          }
        }
        default:
          return undefined;
      }
    },
    [key, effectiveFrom, citation, domain, rationale, language, valueType, value],
  );

  // Re-validate touched fields whenever their inputs change (live feedback).
  useEffect(() => {
    if (!submitAttempted && Object.keys(touched).length === 0) return;
    setErrors((prev) => {
      const next: Errors = { ...prev };
      const fields: FieldName[] = ["key", "value", "effective_from", "citation", "rationale", "language"];
      for (const f of fields) {
        if (!submitAttempted && !touched[f]) continue;
        const err = computeFieldError(f);
        if (err) next[f] = err;
        else delete next[f];
      }
      return next;
    });
  }, [computeFieldError, submitAttempted, touched]);

  function markTouched(field: FieldName) {
    setTouched((t) => (t[field] ? t : { ...t, [field]: true }));
  }

  function validateAll(): { ok: boolean; coercedValue?: unknown } {
    const next: Errors = {};
    const fields: FieldName[] = ["key", "value", "effective_from", "citation", "rationale", "language"];
    for (const f of fields) {
      const err = computeFieldError(f);
      if (err) next[f] = err;
    }
    let coerced: unknown;
    try {
      coerced = coerceValue(value, valueType);
    } catch {
      // Already captured by computeFieldError("value").
    }
    setErrors(next);
    return { ok: Object.keys(next).length === 0, coercedValue: coerced };
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitAttempted(true);
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

  /**
   * Save-as-draft: serialize the in-progress form into URL search params so
   * the maintainer can bookmark, share, or resume later. Empty fields are
   * omitted to keep the URL terse.
   */
  function handleSaveDraft() {
    if (!onSaveDraft) return;
    // Block invalid effective_from from being baked into a URL snapshot.
    const efErr = computeFieldError("effective_from");
    if (efErr) {
      markTouched("effective_from");
      setErrors((prev) => ({ ...prev, effective_from: efErr }));
      const el = document.getElementById(ids.effectiveFrom);
      el?.focus();
      toast.error(intl.formatMessage({ id: "draft.saved.blocked" }));
      return;
    }
    const params: Record<string, string> = {};
    if (key) params.key = key;
    if (jurisdiction) params.jurisdiction_id = jurisdiction;
    if (domain) params.domain = domain;
    if (valueType) params.value_type = valueType;
    if (citation) params.citation = citation;
    if (rationale) params.rationale = rationale;
    if (effectiveFrom) params.effective_from = effectiveFrom;
    if (domain === "ui" && language) params.language = language;
    if (initial.supersedes_id) params.supersedes_id = initial.supersedes_id;
    // Serialize value as JSON so arrays / numbers / booleans round-trip safely.
    if (value !== "" && value !== undefined && value !== null) {
      try {
        params.value = typeof value === "string" ? value : JSON.stringify(value);
      } catch {
        /* skip un-serializable values */
      }
    }
    onSaveDraft(params);
    saveRecentDraft(params);
    emitDraftsChanged();
    setSavedDraftOnce(true);
    toast.success(intl.formatMessage({ id: "draft.saved" }));
  }

  /** Anything that should make Cancel show a confirm modal. */
  const cancelNeedsConfirm =
    dirty || Object.keys(touched).length > 0 || savedDraftOnce;

  function handleCancel() {
    if (cancelNeedsConfirm) {
      setConfirmCancelOpen(true);
      return;
    }
    performCancel();
  }

  function performCancel() {
    setConfirmCancelOpen(false);
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
            onBlur={() => markTouched("key")}
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
            onChange={(v) => {
              setEffectiveFrom(v);
              markTouched("effective_from");
            }}
            ariaDescribedBy={`${ids.effectiveFrom}-help ${errors.effective_from ? `${ids.effectiveFrom}-error` : ""}`.trim()}
            ariaInvalid={!!errors.effective_from}
            required
          />
          <p id={`${ids.effectiveFrom}-help`} className="text-xs text-foreground-muted">
            {intl.formatMessage({ id: "draft.field.effective_from.help" })}
          </p>
          {errors.effective_from && (
            <>
              <p id={`${ids.effectiveFrom}-error`} role="alert" className="text-xs" style={{ color: "var(--verdict-rejected)" }}>
                {intl.formatMessage({ id: errors.effective_from })}
              </p>
              {(errors.effective_from === "validators.effective_from.format" ||
                errors.effective_from === "validators.effective_from.invalid") && (
                <p
                  className="text-[11px] text-foreground-muted"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {intl.formatMessage({ id: "draft.field.effective_from.format_help" })}
                </p>
              )}
            </>
          )}
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
            onChange={(v) => {
              setValue(v);
              markTouched("value");
            }}
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
            onBlur={() => markTouched("citation")}
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
            onBlur={() => markTouched("rationale")}
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
        {onSaveDraft && (
          <Button type="button" variant="ghost" onClick={handleSaveDraft} disabled={submitting}>
            {intl.formatMessage({ id: "draft.save_as_draft" })}
          </Button>
        )}
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

      {/* Live timeline preview */}
      <section className="space-y-2 border-t border-border pt-6">
        <div className="flex items-center justify-between">
          <h2
            className="text-xs uppercase tracking-[0.18em] text-foreground-subtle"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {intl.formatMessage({ id: "draft.preview.title" })}
          </h2>
          <button
            type="button"
            onClick={() => setShowPreview((s) => !s)}
            aria-expanded={showPreview}
            className="text-xs text-foreground-muted underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {intl.formatMessage({ id: showPreview ? "value.collapse" : "value.expand" })}
          </button>
        </div>
        {showPreview && (
          <DraftPreview
            draft={{
              key,
              jurisdiction,
              domain,
              valueType,
              value,
              effectiveFrom,
              citation,
              rationale,
              language,
              author: currentAuthor,
            }}
            prior={prior}
          />
        )}
      </section>

      <Dialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{intl.formatMessage({ id: "draft.unsaved.title" })}</DialogTitle>
            <DialogDescription>
              {intl.formatMessage({ id: "draft.unsaved.body" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmCancelOpen(false)}
            >
              {intl.formatMessage({ id: "draft.unsaved.dismiss" })}
            </Button>
            <Button type="button" variant="destructive" onClick={performCancel}>
              {intl.formatMessage({ id: "draft.unsaved.confirm" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}