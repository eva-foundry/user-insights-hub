import { useIntl, FormattedDate } from "react-intl";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CaseEvent, Recommendation } from "@/lib/types";
import { OutcomePill } from "./OutcomePill";
import { RuleEvaluationItem } from "./RuleEvaluationItem";
import { BenefitAmountCard } from "../screen/BenefitAmountCard";

export function PreviousDecisions({
  recommendations,
  events,
  jurisdictionLabel,
}: {
  recommendations: Recommendation[];
  events: CaseEvent[];
  jurisdictionLabel?: string;
}) {
  const intl = useIntl();
  const eventById = new Map(events.map((e) => [e.id, e]));
  // Sort oldest → newest, drop the latest (rendered above by RecommendationPane).
  const sorted = [...recommendations].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const prior = sorted.slice(0, -1);
  if (prior.length === 0) return null;

  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, eventId: string) => {
    e.preventDefault();
    const el = document.getElementById(`event-${eventId}`);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  return (
    <section
      aria-labelledby="prior-decisions-heading"
      className="rounded-md border border-border bg-surface p-4"
    >
      <h2
        id="prior-decisions-heading"
        className="mb-3 text-sm font-medium text-foreground"
      >
        {intl.formatMessage({ id: "events.history.heading" })}
      </h2>
      <ul className="space-y-2">
        {prior.reverse().map((r) => (
          <li
            key={r.id}
            id={`recommendation-${r.id}`}
            className="rounded-md border border-border bg-surface-raised"
          >
            <Collapsible>
              <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2 text-start hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
                <ChevronDown
                  className="size-3 transition-transform group-data-[state=open]:rotate-180"
                  aria-hidden
                />
                <span className="text-sm">
                  {intl.formatMessage(
                    { id: "events.history.previous_decision" },
                    {
                      date: intl.formatDate(r.timestamp, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }),
                    },
                  )}
                </span>
                <span className="ms-auto inline-flex items-center gap-2">
                  <OutcomePill outcome={r.outcome} />
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 px-3 pb-3">
                <p
                  className="text-sm text-foreground"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {r.explanation}
                </p>
                {r.triggered_by_event_id && eventById.has(r.triggered_by_event_id) && (
                  <a
                    href={`#event-${r.triggered_by_event_id}`}
                    onClick={(e) => handleAnchor(e, r.triggered_by_event_id!)}
                    className="inline-flex"
                  >
                    <Badge variant="outline">
                      {intl.formatMessage({ id: "events.history.triggered_by" })}{" "}
                      <FormattedDate
                        value={eventById.get(r.triggered_by_event_id)!.effective_date}
                        year="numeric"
                        month="short"
                        day="numeric"
                      />
                    </Badge>
                  </a>
                )}
                {r.rule_evaluations.length > 0 && (
                  <ul className="space-y-2">
                    {r.rule_evaluations.map((re) => (
                      <RuleEvaluationItem key={re.rule_id} rule={re} />
                    ))}
                  </ul>
                )}
                {r.benefit_amount && (
                  <BenefitAmountCard
                    benefitAmount={r.benefit_amount}
                    jurisdictionLabel={jurisdictionLabel ?? ""}
                    pensionType={
                      r.pension_type === "full" || r.pension_type === "partial"
                        ? r.pension_type
                        : ""
                    }
                    partialRatio={r.partial_ratio}
                  />
                )}
              </CollapsibleContent>
            </Collapsible>
          </li>
        ))}
      </ul>
    </section>
  );
}
