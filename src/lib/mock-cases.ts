import type {
  AuditPackage,
  CaseDetail,
  CaseListItem,
  HumanReviewAction,
  Recommendation,
} from "./types";
import { MOCK_AUTHORITY_CHAIN, MOCK_JURISDICTION } from "./mock-authority";

/**
 * Minimal case fixtures used as preview fallback when the FastAPI backend is
 * unreachable. The /cases UI route is not yet implemented (govops-009 is
 * partial); these fixtures back the API helpers in api.ts so type-safe
 * consumers can compile and the future UI can plug in without re-shaping data.
 */
export const MOCK_CASE_LIST: CaseListItem[] = [
  {
    id: "case-2025-0142",
    applicant_name: "Marie Tremblay",
    status: "recommendation_ready",
    has_recommendation: true,
    jurisdiction_id: "ca-oas",
  },
  {
    id: "case-2025-0143",
    applicant_name: "Anand Patel",
    status: "decided",
    has_recommendation: true,
    jurisdiction_id: "ca-oas",
  },
];

const REC: Recommendation = {
  id: "rec-142",
  case_id: "case-2025-0142",
  timestamp: "2025-04-20T14:32:00Z",
  outcome: "eligible",
  confidence: 0.94,
  rule_evaluations: [],
  explanation: "All eligibility rules satisfied.",
  pension_type: "full",
  partial_ratio: null,
  missing_evidence: [],
  flags: [],
};

const DETAILS: Record<string, CaseDetail> = {
  "case-2025-0142": {
    case: {
      id: "case-2025-0142",
      created_at: "2025-04-15T08:00:00Z",
      status: "recommendation_ready",
      jurisdiction_id: "ca-oas",
      applicant: {
        id: "applicant-142",
        date_of_birth: "1957-11-04",
        legal_name: "Marie Tremblay",
        legal_status: "Citizen",
        country_of_birth: "Canada",
      },
      residency_periods: [],
      evidence_items: [],
    },
    recommendation: REC,
    reviews: [],
  },
};

export function mockGetCase(caseId: string): CaseDetail | null {
  return DETAILS[caseId] ?? null;
}

export function mockEvaluateCase(caseId: string): { recommendation: Recommendation } {
  const d = DETAILS[caseId];
  if (!d?.recommendation) throw new Error(`No recommendation for ${caseId}`);
  return { recommendation: d.recommendation };
}

export function mockReviewCase(
  caseId: string,
  body: { action: string; rationale: string; final_outcome: string | null },
): { review: HumanReviewAction } {
  return {
    review: {
      id: `review-${caseId}-${Date.now()}`,
      case_id: caseId,
      recommendation_id: DETAILS[caseId]?.recommendation?.id ?? "",
      reviewer: "human:reviewer.preview",
      action: body.action as HumanReviewAction["action"],
      rationale: body.rationale,
      timestamp: new Date().toISOString(),
      final_outcome: body.final_outcome as HumanReviewAction["final_outcome"],
    },
  };
}

export function mockGetAudit(caseId: string): AuditPackage {
  const d = DETAILS[caseId];
  return {
    case_id: caseId,
    generated_at: new Date().toISOString(),
    jurisdiction: {
      id: MOCK_JURISDICTION.id,
      name: MOCK_JURISDICTION.name,
      country: MOCK_JURISDICTION.country,
      level: MOCK_JURISDICTION.level,
    },
    authority_chain: MOCK_AUTHORITY_CHAIN.map((a) => ({
      id: a.id,
      layer: a.layer,
      title: a.title,
      citation: a.citation,
      effective_date: a.effective_date,
      url: a.url,
    })),
    applicant_summary: d ? { legal_name: d.case.applicant.legal_name } : {},
    recommendation: d?.recommendation ?? null,
    review_actions: d?.reviews ?? [],
    audit_trail: [],
    rules_applied: [],
    evidence_summary: [],
  };
}