import type { ProvenanceVariant } from "@/components/govops/ProvenanceRibbon";
import type { Verdict } from "@/components/govops/VerdictBadge";
import type { Locale } from "@/lib/i18n";

export type Policy = {
  id: string;
  ref: string;
  title: Partial<Record<Locale, string>> & { en: string };
  verdict: Verdict;
  provenance: ProvenanceVariant;
  updatedAt: string; // ISO
};

export const MOCK_POLICIES: Policy[] = [
  {
    id: "p-001",
    ref: "ORD-2025-014",
    title: {
      en: "Open data publication standard",
      fr: "Norme de publication des données ouvertes",
    },
    verdict: "enacted",
    provenance: "human",
    updatedAt: "2025-09-12T10:24:00Z",
  },
  {
    id: "p-002",
    ref: "PROP-2026-007",
    title: {
      en: "Algorithmic transparency for public services",
      fr: "Transparence algorithmique pour les services publics",
    },
    verdict: "pending",
    provenance: "hybrid",
    updatedAt: "2026-03-18T14:02:00Z",
  },
  {
    id: "p-003",
    ref: "DRAFT-2026-021",
    title: {
      en: "Citizen participation in spatial planning",
      fr: "Participation citoyenne à l'aménagement du territoire",
    },
    verdict: "draft",
    provenance: "agent",
    updatedAt: "2026-04-09T08:51:00Z",
  },
  {
    id: "p-004",
    ref: "PROP-2025-099",
    title: {
      en: "Mandatory facial recognition in transit",
      fr: "Reconnaissance faciale obligatoire dans les transports",
    },
    verdict: "rejected",
    provenance: "citizen",
    updatedAt: "2025-12-04T16:40:00Z",
  },
  {
    id: "p-005",
    ref: "ORD-2026-003",
    title: {
      en: "AI usage disclosure in administrative decisions",
      fr: "Divulgation de l'usage de l'IA dans les décisions administratives",
    },
    verdict: "enacted",
    provenance: "hybrid",
    updatedAt: "2026-02-21T09:15:00Z",
  },
  {
    id: "p-006",
    ref: "SYS-2026-011",
    title: {
      en: "Automated tax-credit eligibility check",
      fr: "Vérification automatisée de l'éligibilité au crédit d'impôt",
    },
    verdict: "pending",
    provenance: "system",
    updatedAt: "2026-04-22T07:00:00Z",
  },
];
