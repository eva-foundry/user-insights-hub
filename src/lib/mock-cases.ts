import type {
  AuditPackage,
  CaseDetail,
  CaseListItem,
  HumanReviewAction,
  Recommendation,
} from "./types";
import { MOCK_AUTHORITY_CHAIN, MOCK_JURISDICTION } from "./mock-authority";

/**
 * Mock case fixtures used as preview fallback when the backend is offline.
 * Three cases cover the main verdict flavors: eligible, partial, escalated.
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
  {
    id: "case-2025-0144",
    applicant_name: "Léa Dubois",
    status: "intake",
    has_recommendation: false,
    jurisdiction_id: "ca-oas",
  },
  {
    id: "case-2025-0145",
    applicant_name: "Hiroshi Tanaka",
    status: "escalated",
    has_recommendation: true,
    jurisdiction_id: "ca-oas",
  },
];

const REC_142: Recommendation = {
  id: "rec-142",
  case_id: "case-2025-0142",
  timestamp: "2025-04-20T14:32:00Z",
  outcome: "eligible",
  confidence: 0.94,
  rule_evaluations: [
    {
      rule_id: "rule.age-65",
      rule_description: "Applicant must be at least 65 years of age.",
      citation: "OAS Act, s. 3(1)",
      outcome: "satisfied",
      detail: "Applicant is 67 years old (DOB: 1957-11-04).",
      evidence_used: ["evidence.passport"],
    },
    {
      rule_id: "rule.residency-40",
      rule_description: "Forty years of residence after age 18 required for full pension.",
      citation: "OAS Act, s. 3(1)",
      outcome: "satisfied",
      detail: "Applicant has 47 years of verified Canadian residence since age 18.",
      evidence_used: ["evidence.cra-records", "evidence.lease-1985"],
    },
  ],
  explanation:
    "All eligibility rules satisfied for full Old Age Security pension. Residency exceeds the 40-year threshold by 7 years; age threshold met.",
  pension_type: "full",
  partial_ratio: null,
  missing_evidence: [],
  flags: [],
};

const REC_143: Recommendation = {
  id: "rec-143",
  case_id: "case-2025-0143",
  timestamp: "2025-04-18T09:15:00Z",
  outcome: "eligible",
  confidence: 0.81,
  rule_evaluations: [
    {
      rule_id: "rule.age-65",
      rule_description: "Applicant must be at least 65 years of age.",
      citation: "OAS Act, s. 3(1)",
      outcome: "satisfied",
      detail: "Applicant is 66.",
      evidence_used: ["evidence.birth-cert"],
    },
    {
      rule_id: "rule.residency-10",
      rule_description: "Ten years of residence required for partial pension.",
      citation: "OAS Act, s. 3(2)",
      outcome: "satisfied",
      detail: "Applicant has 22 years of verified residence after age 18.",
      evidence_used: ["evidence.cra-records"],
    },
  ],
  explanation:
    "Eligible for partial pension at 22/40 of the full benefit. Eighteen years of residence outside Canada (India) excluded from calculation per s. 3(1).",
  pension_type: "partial",
  partial_ratio: "22/40",
  missing_evidence: [],
  flags: ["partial-pension"],
};

const REC_145: Recommendation = {
  id: "rec-145",
  case_id: "case-2025-0145",
  timestamp: "2025-04-22T16:00:00Z",
  outcome: "escalate",
  confidence: 0.42,
  rule_evaluations: [
    {
      rule_id: "rule.age-65",
      rule_description: "Applicant must be at least 65 years of age.",
      citation: "OAS Act, s. 3(1)",
      outcome: "satisfied",
      detail: "Applicant is 65 years and 2 months.",
      evidence_used: ["evidence.passport"],
    },
    {
      rule_id: "rule.evidence",
      rule_description: "Documentary evidence required for every period of residence.",
      citation: "OAS Regs, s. 5",
      outcome: "insufficient_evidence",
      detail: "Three residency periods (1998-2003, 2010-2015, 2018-2020) lack verified documents.",
      evidence_used: [],
    },
  ],
  explanation:
    "Recommendation: escalate to human reviewer. Residency periods totalling 12 years are claimed but unverified; below confidence threshold for automated decision.",
  pension_type: "",
  partial_ratio: null,
  missing_evidence: [
    "Proof of residence 1998-2003",
    "Proof of residence 2010-2015",
    "Proof of residence 2018-2020",
  ],
  flags: ["low-confidence", "missing-evidence"],
};

const REVIEW_143: HumanReviewAction = {
  id: "review-143-1",
  case_id: "case-2025-0143",
  recommendation_id: "rec-143",
  reviewer: "human:reviewer.gauthier",
  action: "approve",
  rationale:
    "Reviewed evidence package; CRA records corroborate applicant's residency timeline. Approving partial pension as recommended.",
  timestamp: "2025-04-19T10:45:00Z",
  final_outcome: "eligible",
};

const CASE_DETAILS: Record<string, CaseDetail> = {
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
      residency_periods: [
        {
          country: "Canada",
          start_date: "1975-11-04",
          end_date: null,
          verified: true,
          evidence_ids: ["evidence.cra-records", "evidence.lease-1985"],
        },
      ],
      evidence_items: [
        {
          id: "evidence.passport",
          evidence_type: "passport",
          description: "Canadian passport, issued 2019",
          provided: true,
          verified: true,
          source_reference: "Passport Canada — file P-7711",
        },
        {
          id: "evidence.cra-records",
          evidence_type: "tax_return",
          description: "CRA tax filings 1975–2024",
          provided: true,
          verified: true,
          source_reference: "CRA — SIN-linked records",
        },
        {
          id: "evidence.lease-1985",
          evidence_type: "lease",
          description: "Residential lease, Montréal QC, 1985",
          provided: true,
          verified: true,
          source_reference: "Applicant submission",
        },
      ],
    },
    recommendation: REC_142,
    reviews: [],
  },
  "case-2025-0143": {
    case: {
      id: "case-2025-0143",
      created_at: "2025-04-12T11:30:00Z",
      status: "decided",
      jurisdiction_id: "ca-oas",
      applicant: {
        id: "applicant-143",
        date_of_birth: "1958-08-21",
        legal_name: "Anand Patel",
        legal_status: "Permanent Resident",
        country_of_birth: "India",
      },
      residency_periods: [
        {
          country: "India",
          start_date: "1976-08-21",
          end_date: "2003-05-30",
          verified: false,
          evidence_ids: [],
        },
        {
          country: "Canada",
          start_date: "2003-06-01",
          end_date: null,
          verified: true,
          evidence_ids: ["evidence.cra-records"],
        },
      ],
      evidence_items: [
        {
          id: "evidence.birth-cert",
          evidence_type: "birth_certificate",
          description: "Birth certificate, Mumbai 1958",
          provided: true,
          verified: true,
          source_reference: "Applicant submission",
        },
        {
          id: "evidence.cra-records",
          evidence_type: "tax_return",
          description: "CRA tax filings 2003–2024",
          provided: true,
          verified: true,
          source_reference: "CRA — SIN-linked records",
        },
      ],
    },
    recommendation: REC_143,
    reviews: [REVIEW_143],
  },
  "case-2025-0144": {
    case: {
      id: "case-2025-0144",
      created_at: "2025-04-25T14:00:00Z",
      status: "intake",
      jurisdiction_id: "ca-oas",
      applicant: {
        id: "applicant-144",
        date_of_birth: "1959-02-19",
        legal_name: "Léa Dubois",
        legal_status: "Citizen",
        country_of_birth: "France",
      },
      residency_periods: [
        {
          country: "France",
          start_date: "1977-02-19",
          end_date: "2005-09-15",
          verified: false,
          evidence_ids: [],
        },
        {
          country: "Canada",
          start_date: "2005-09-16",
          end_date: null,
          verified: false,
          evidence_ids: [],
        },
      ],
      evidence_items: [],
    },
    recommendation: null,
    reviews: [],
  },
  "case-2025-0145": {
    case: {
      id: "case-2025-0145",
      created_at: "2025-04-20T09:00:00Z",
      status: "escalated",
      jurisdiction_id: "ca-oas",
      applicant: {
        id: "applicant-145",
        date_of_birth: "1960-02-15",
        legal_name: "Hiroshi Tanaka",
        legal_status: "Permanent Resident",
        country_of_birth: "Japan",
      },
      residency_periods: [
        {
          country: "Canada",
          start_date: "1985-01-10",
          end_date: "1998-06-30",
          verified: true,
          evidence_ids: ["evidence.passport"],
        },
        {
          country: "Canada",
          start_date: "1998-07-01",
          end_date: "2003-12-31",
          verified: false,
          evidence_ids: [],
        },
        {
          country: "Canada",
          start_date: "2010-01-01",
          end_date: "2015-12-31",
          verified: false,
          evidence_ids: [],
        },
        {
          country: "Canada",
          start_date: "2018-01-01",
          end_date: "2020-12-31",
          verified: false,
          evidence_ids: [],
        },
        {
          country: "Canada",
          start_date: "2021-01-01",
          end_date: null,
          verified: true,
          evidence_ids: ["evidence.cra-records"],
        },
      ],
      evidence_items: [
        {
          id: "evidence.passport",
          evidence_type: "passport",
          description: "Permanent Resident card",
          provided: true,
          verified: true,
          source_reference: "IRCC",
        },
        {
          id: "evidence.cra-records",
          evidence_type: "tax_return",
          description: "CRA tax filings 2021–2024",
          provided: true,
          verified: true,
          source_reference: "CRA",
        },
      ],
    },
    recommendation: REC_145,
    reviews: [],
  },
};

export function mockGetCase(caseId: string): CaseDetail | null {
  return CASE_DETAILS[caseId] ?? null;
}

export function mockEvaluateCase(caseId: string): { recommendation: Recommendation } {
  const detail = CASE_DETAILS[caseId];
  if (!detail) throw new Error(`Case not found: ${caseId}`);
  if (detail.recommendation) return { recommendation: detail.recommendation };
  // For the intake case, fabricate a low-confidence recommendation.
  const rec: Recommendation = {
    id: `rec-${caseId.slice(-4)}`,
    case_id: caseId,
    timestamp: new Date().toISOString(),
    outcome: "insufficient_evidence",
    confidence: 0.35,
    rule_evaluations: [
      {
        rule_id: "rule.evidence",
        rule_description: "Documentary evidence required for every period of residence.",
        citation: "OAS Regs, s. 5",
        outcome: "insufficient_evidence",
        detail: "No evidence on file for any residency period.",
        evidence_used: [],
      },
    ],
    explanation:
      "Cannot determine eligibility: applicant has not yet provided any documentary evidence of residence.",
    pension_type: "",
    partial_ratio: null,
    missing_evidence: ["Proof of residence (any period)", "Identity document"],
    flags: ["intake-incomplete"],
  };
  detail.recommendation = rec;
  detail.case.status = "recommendation_ready";
  return { recommendation: rec };
}

export function mockReviewCase(
  caseId: string,
  body: { action: string; rationale: string; final_outcome: string | null },
): { review: HumanReviewAction } {
  const detail = CASE_DETAILS[caseId];
  if (!detail) throw new Error(`Case not found: ${caseId}`);
  if (!detail.recommendation) throw new Error("No recommendation to review");
  const review: HumanReviewAction = {
    id: `review-${caseId.slice(-4)}-${detail.reviews.length + 1}`,
    case_id: caseId,
    recommendation_id: detail.recommendation.id,
    reviewer: "human:reviewer.preview",
    action: body.action as HumanReviewAction["action"],
    rationale: body.rationale,
    timestamp: new Date().toISOString(),
    final_outcome:
      (body.final_outcome as HumanReviewAction["final_outcome"]) ??
      detail.recommendation.outcome,
  };
  detail.reviews = [...detail.reviews, review];
  if (body.action === "approve" || body.action === "modify" || body.action === "reject") {
    detail.case.status = "decided";
  } else if (body.action === "escalate") {
    detail.case.status = "escalated";
  }
  return { review };
}

export function mockGetAudit(caseId: string): AuditPackage {
  const detail = CASE_DETAILS[caseId];
  if (!detail) throw new Error(`Case not found: ${caseId}`);
  const trail: AuditPackage["audit_trail"] = [
    {
      timestamp: detail.case.created_at,
      event_type: "case_created",
      actor: "system",
      detail: `Case ${detail.case.id} opened for ${detail.case.applicant.legal_name}.`,
      data: {},
    },
  ];
  if (detail.recommendation) {
    trail.push({
      timestamp: detail.recommendation.timestamp,
      event_type: "evaluation_completed",
      actor: "agent:eligibility-engine",
      detail: `Recommendation: ${detail.recommendation.outcome} (confidence ${Math.round(
        detail.recommendation.confidence * 100,
      )}%).`,
      data: { recommendation_id: detail.recommendation.id },
    });
  }
  for (const r of detail.reviews) {
    trail.push({
      timestamp: r.timestamp,
      event_type: "human_review_recorded",
      actor: r.reviewer,
      detail: `${r.action}: ${r.rationale.slice(0, 80)}`,
      data: { review_id: r.id, final_outcome: r.final_outcome },
    });
  }
  return {
    case_id: detail.case.id,
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
    applicant_summary: {
      legal_name: detail.case.applicant.legal_name,
      date_of_birth: detail.case.applicant.date_of_birth,
      legal_status: detail.case.applicant.legal_status,
      country_of_birth: detail.case.applicant.country_of_birth,
    },
    recommendation: detail.recommendation,
    review_actions: detail.reviews,
    audit_trail: trail,
    rules_applied: detail.recommendation?.rule_evaluations ?? [],
    evidence_summary: detail.case.evidence_items.map((e) => ({
      id: e.id,
      type: e.evidence_type,
      verified: e.verified,
    })),
  };
}