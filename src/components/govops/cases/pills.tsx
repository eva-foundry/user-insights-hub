import { useIntl } from "react-intl";
import type {
  CaseStatus,
  DecisionOutcome,
  ReviewActionType,
  RuleOutcome,
} from "@/lib/types";

/**
 * Shared pill primitives for the cases surface. Status/outcome/action chips
 * map to the existing verdict tokens so visual language stays consistent
 * with the configuration registry.
 */

function basePill(extra: string) {
  return `inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] ${extra}`;
}

const STATUS_TONE: Record<CaseStatus, string> = {
  intake: "border-border bg-surface text-foreground-muted",
  evaluating: "border-border bg-surface text-foreground-muted",
  recommendation_ready: "border-agentic/50 bg-agentic/10 text-agentic",
  under_review: "border-verdict-pending/50 bg-verdict-pending/10 text-verdict-pending",
  decided: "border-verdict-enacted/50 bg-verdict-enacted/10 text-verdict-enacted",
  escalated: "border-verdict-rejected/50 bg-verdict-rejected/10 text-verdict-rejected",
};

export function StatusPill({ status }: { status: CaseStatus }) {
  const intl = useIntl();
  return (
    <span
      className={basePill(STATUS_TONE[status])}
      style={{ fontFamily: "var(--font-mono)" }}
    >
      {intl.formatMessage({ id: `status.${status}` })}
    </span>
  );
}

const OUTCOME_TONE: Record<DecisionOutcome, string> = {
  eligible: "border-verdict-enacted/50 bg-verdict-enacted/10 text-verdict-enacted",
  ineligible: "border-verdict-rejected/50 bg-verdict-rejected/10 text-verdict-rejected",
  insufficient_evidence: "border-verdict-pending/50 bg-verdict-pending/10 text-verdict-pending",
  escalate: "border-authority/50 bg-authority/10 text-authority",
};

export function OutcomePill({ outcome }: { outcome: DecisionOutcome }) {
  const intl = useIntl();
  return (
    <span
      className={basePill(OUTCOME_TONE[outcome])}
      style={{ fontFamily: "var(--font-mono)" }}
    >
      {intl.formatMessage({ id: `outcome.${outcome}` })}
    </span>
  );
}

export function ActionPill({ action }: { action: ReviewActionType }) {
  const intl = useIntl();
  return (
    <span
      className={basePill("border-border bg-surface text-foreground-muted")}
      style={{ fontFamily: "var(--font-mono)" }}
    >
      {intl.formatMessage({ id: `cases.review.action.${action}` })}
    </span>
  );
}

const RULE_OUTCOME_TONE: Record<RuleOutcome, string> = {
  satisfied: "border-verdict-enacted/50 bg-verdict-enacted/10 text-verdict-enacted",
  not_satisfied: "border-verdict-rejected/50 bg-verdict-rejected/10 text-verdict-rejected",
  insufficient_evidence: "border-verdict-pending/50 bg-verdict-pending/10 text-verdict-pending",
  not_applicable: "border-border bg-surface text-foreground-muted",
};

export function RuleOutcomePill({ outcome }: { outcome: RuleOutcome }) {
  const intl = useIntl();
  return (
    <span
      className={basePill(RULE_OUTCOME_TONE[outcome])}
      style={{ fontFamily: "var(--font-mono)" }}
    >
      {intl.formatMessage({ id: `rule_outcome.${outcome}` })}
    </span>
  );
}