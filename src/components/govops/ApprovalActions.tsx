import { useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  approveConfigValue,
  rejectConfigValue,
  requestChangesConfigValue,
} from "@/lib/api";
import { getCurrentUser } from "@/lib/currentUser";
import type { ConfigValue } from "@/lib/types";
import {
  ConfirmActionDialog,
  type ApprovalAction,
} from "./ConfirmActionDialog";

const COMMENT_MIN = 10;
const COMMENT_KEY = (id: string) => `govops:approval-comment:${id}`;
const EXPANDED_KEY = "govops:approval-panel-expanded";
const HELP_KEY = "govops:approval-shortcuts-open";

function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

function modKey(e: KeyboardEvent): boolean {
  return isMac() ? e.metaKey : e.ctrlKey;
}

/**
 * Sticky action panel for the approval review page. Three CTAs:
 * - Approve (authority gold): the canonical human ratification act.
 * - Request changes (secondary): bounces the draft back to the author.
 * - Reject (destructive): closes the proposal.
 * The author cannot self-approve. The non-approve actions require a
 * comment (≥10 chars) so the audit trail captures *why*.
 */
export function ApprovalActions({
  cv,
  onResolved,
}: {
  cv: ConfigValue;
  onResolved: (resolution: ApprovalAction) => void;
}) {
  const intl = useIntl();
  // Per-approval comment draft, persisted so refresh / accidental nav don't
  // wipe carefully-worded review notes. Cleared on successful action below.
  const [comment, setComment] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(COMMENT_KEY(cv.id)) ?? "";
    } catch {
      return "";
    }
  });
  // Whether the comment + actions panel body is expanded. Persisted across
  // sessions; defaults to expanded so the primary surface is visible.
  const [expanded, setExpanded] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const v = window.localStorage.getItem(EXPANDED_KEY);
      return v === null ? true : v === "1";
    } catch {
      return true;
    }
  });
  // Per-session preference: persisted in sessionStorage so the legend's
  // visibility survives a refresh but doesn't leak across browser sessions.
  const [showHelp, setShowHelp] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(HELP_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [pending, setPending] = useState<ApprovalAction | null>(null);
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const user = getCurrentUser();
  const isSelfApproval = user === cv.author;
  const commentOk = comment.trim().length >= COMMENT_MIN;

  // Persist the in-progress comment per approval.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (comment) window.localStorage.setItem(COMMENT_KEY(cv.id), comment);
      else window.localStorage.removeItem(COMMENT_KEY(cv.id));
    } catch {
      /* ignore */
    }
  }, [comment, cv.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(EXPANDED_KEY, expanded ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [expanded]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(HELP_KEY, showHelp ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [showHelp]);

  // Auto-focus the comment textarea whenever the panel is (or becomes)
  // expanded so reviewers can start typing immediately. Skipped when the
  // textarea would be disabled (self-approval, busy) to avoid yanking
  // focus from elsewhere on the page.
  useEffect(() => {
    if (!expanded || isSelfApproval || busy) return;
    // Defer to the next frame so the [hidden] attribute has been removed
    // and the element is focusable.
    const id = window.requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      // Move caret to end if there's already a persisted draft.
      const len = el.value.length;
      try {
        el.setSelectionRange(len, len);
      } catch {
        /* some browsers throw on certain input types */
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [expanded, isSelfApproval, busy, cv.id]);

  async function run() {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending === "approve") {
        await approveConfigValue(cv.id, { approved_by: user, comment });
        toast.success(intl.formatMessage({ id: "approvals.success.approved" }));
      } else if (pending === "request") {
        await requestChangesConfigValue(cv.id, { reviewer: user, comment });
        toast.success(
          intl.formatMessage({ id: "approvals.success.requested_changes" }),
        );
      } else {
        await rejectConfigValue(cv.id, { reviewer: user, comment });
        toast.success(intl.formatMessage({ id: "approvals.success.rejected" }));
      }
      // Action persisted on the server → drop the local draft for this id.
      try {
        window.localStorage.removeItem(COMMENT_KEY(cv.id));
      } catch {
        /* ignore */
      }
      onResolved(pending);
    } catch (err) {
      toast.error(
        intl.formatMessage({ id: "approvals.error.generic" }) +
          (err instanceof Error ? `: ${err.message}` : ""),
      );
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  // Keyboard shortcuts (review page-scoped). We only act when the panel is
  // expanded so collapsed users aren't surprised by hidden behaviour.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (busy || isSelfApproval || !expanded) return;
      // "?" toggles the help legend, even from inputs.
      if (e.key === "?" && !modKey(e) && !e.altKey) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        setShowHelp((s) => !s);
        return;
      }
      if (!modKey(e)) return;
      if (e.key === "Enter" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setPending("approve");
      } else if (e.key.toLowerCase() === "r" && e.shiftKey) {
        if (!commentOk) return;
        e.preventDefault();
        setPending("reject");
      } else if (e.key.toLowerCase() === "c" && e.shiftKey) {
        if (!commentOk) return;
        e.preventDefault();
        setPending("request");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, commentOk, expanded, isSelfApproval]);

  const mod = isMac() ? "⌘" : "Ctrl";

  return (
    <section
      aria-labelledby="actions-heading"
      className="sticky top-20 space-y-4 rounded-lg border border-border bg-surface p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <h2
          id="actions-heading"
          className="text-lg tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}
        >
          {intl.formatMessage({ id: "approvals.actions.heading" })}
        </h2>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="approval-actions-body"
          onClick={() => setExpanded((v) => !v)}
          className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-foreground-muted hover:bg-surface-sunken"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {intl.formatMessage({
            id: expanded ? "approvals.panel.collapse" : "approvals.panel.expand",
          })}
        </button>
      </div>
      <p
        className="text-xs uppercase tracking-[0.14em] text-foreground-subtle"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {intl.formatMessage(
          { id: "approvals.actions.user" },
          { user },
        )}
      </p>

      {expanded && isSelfApproval && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-md border p-3 text-sm"
          style={{
            borderColor:
              "color-mix(in oklch, var(--verdict-pending) 40%, transparent)",
            backgroundColor:
              "color-mix(in oklch, var(--verdict-pending) 10%, transparent)",
            color: "var(--foreground)",
          }}
        >
          {intl.formatMessage({ id: "approvals.self_approval_blocked" })}
        </div>
      )}

      <div id="approval-actions-body" hidden={!expanded} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="approval-comment"
            className="text-xs uppercase tracking-[0.14em] text-foreground-subtle"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {intl.formatMessage({ id: "approvals.comment.label" })}
          </label>
          <Textarea
            id="approval-comment"
            ref={textareaRef}
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={intl.formatMessage({
              id: "approvals.comment.placeholder",
            })}
            disabled={isSelfApproval || busy}
          />
          <p className="text-[11px] text-foreground-subtle">
            {intl.formatMessage(
              { id: "approvals.comment.help" },
              { min: COMMENT_MIN },
            )}
          </p>
        </div>

        <div className="flex flex-col gap-2">
        <Button
          variant="authority"
          disabled={isSelfApproval || busy}
          onClick={() => setPending("approve")}
          title={`${mod} + Enter`}
        >
          {intl.formatMessage({ id: "approvals.action.approve" })}
          <span
            aria-hidden
            className="ms-2 rounded border border-current/30 px-1 text-[10px] opacity-70"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {mod}↵
          </span>
        </Button>
        <Button
          variant="secondary"
          disabled={isSelfApproval || busy || !commentOk}
          onClick={() => setPending("request")}
          title={`${mod} + Shift + C`}
        >
          {intl.formatMessage({ id: "approvals.action.request_changes" })}
          <span
            aria-hidden
            className="ms-2 rounded border border-current/30 px-1 text-[10px] opacity-70"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {mod}⇧C
          </span>
        </Button>
        <Button
          variant="destructive"
          disabled={isSelfApproval || busy || !commentOk}
          onClick={() => setPending("reject")}
          title={`${mod} + Shift + R`}
        >
          {intl.formatMessage({ id: "approvals.action.reject" })}
          <span
            aria-hidden
            className="ms-2 rounded border border-current/30 px-1 text-[10px] opacity-70"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {mod}⇧R
          </span>
        </Button>
        </div>

        <div className="border-t border-border pt-3">
          <button
            type="button"
            aria-expanded={showHelp}
            onClick={() => setShowHelp((s) => !s)}
            className="text-[11px] uppercase tracking-[0.14em] text-foreground-subtle hover:text-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {intl.formatMessage({
              id: showHelp ? "approvals.shortcuts.hide" : "approvals.shortcuts.show",
            })}
          </button>
          {showHelp && (
            <dl
              className="mt-2 space-y-1 text-[11px] text-foreground-muted"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <dt>{intl.formatMessage({ id: "approvals.action.approve" })}</dt>
                <dd className="rounded border border-border px-1.5 py-0.5">{mod} + Enter</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>{intl.formatMessage({ id: "approvals.action.request_changes" })}</dt>
                <dd className="rounded border border-border px-1.5 py-0.5">{mod} + Shift + C</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>{intl.formatMessage({ id: "approvals.action.reject" })}</dt>
                <dd className="rounded border border-border px-1.5 py-0.5">{mod} + Shift + R</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>{intl.formatMessage({ id: "approvals.shortcuts.toggle_help" })}</dt>
                <dd className="rounded border border-border px-1.5 py-0.5">?</dd>
              </div>
            </dl>
          )}
        </div>
      </div>

      <ConfirmActionDialog
        open={pending !== null}
        action={pending}
        cv={cv}
        comment={comment}
        busy={busy}
        onConfirm={run}
        onCancel={() => setPending(null)}
      />
    </section>
  );
}