import { useState } from "react";
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
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState<ApprovalAction | null>(null);
  const [busy, setBusy] = useState(false);

  const user = getCurrentUser();
  const isSelfApproval = user === cv.author;

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

  const commentOk = comment.trim().length >= COMMENT_MIN;

  return (
    <section
      aria-labelledby="actions-heading"
      className="sticky top-20 space-y-4 rounded-lg border border-border bg-surface p-5"
    >
      <h2
        id="actions-heading"
        className="text-lg tracking-tight text-foreground"
        style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}
      >
        {intl.formatMessage({ id: "approvals.actions.heading" })}
      </h2>
      <p
        className="text-xs uppercase tracking-[0.14em] text-foreground-subtle"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {intl.formatMessage(
          { id: "approvals.actions.user" },
          { user },
        )}
      </p>

      {isSelfApproval && (
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
        >
          {intl.formatMessage({ id: "approvals.action.approve" })}
        </Button>
        <Button
          variant="secondary"
          disabled={isSelfApproval || busy || !commentOk}
          onClick={() => setPending("request")}
        >
          {intl.formatMessage({ id: "approvals.action.request_changes" })}
        </Button>
        <Button
          variant="destructive"
          disabled={isSelfApproval || busy || !commentOk}
          onClick={() => setPending("reject")}
        >
          {intl.formatMessage({ id: "approvals.action.reject" })}
        </Button>
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