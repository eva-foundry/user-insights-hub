export type ValueType = "number" | "string" | "bool" | "list" | "enum" | "prompt" | "formula";
export type ApprovalStatus = "draft" | "pending" | "approved" | "rejected";

export interface ConfigValue {
  id: string;
  domain: string;
  key: string;
  jurisdiction_id: string | null;
  value: unknown;
  value_type: ValueType;
  effective_from: string;
  effective_to: string | null;
  citation: string | null;
  author: string;
  approved_by: string | null;
  rationale: string;
  supersedes: string | null;
  status: ApprovalStatus;
  language: string | null;
  created_at: string;
}

export interface ListConfigValuesResponse {
  values: ConfigValue[];
  count: number;
}

export interface ListConfigValuesParams {
  domain?: string;
  key_prefix?: string;
  jurisdiction_id?: string;
  language?: string;
}

export interface ListVersionsResponse {
  key: string;
  versions: ConfigValue[]; // backend returns oldest-first; UI flips to newest-first
  count: number;
}

export const DOMAINS = ["rule", "enum", "ui", "prompt", "engine"] as const;
export const JURISDICTIONS = [
  "ca-oas",
  "us-fed",
  "uk-gov",
  "fr-gouv",
  "de-bund",
  "br-fed",
] as const;
export const LANGUAGES = ["en", "fr", "pt", "es", "de", "uk"] as const;

export interface CreateConfigValueRequest {
  domain: string;
  key: string;
  jurisdiction_id: string | null;
  value: unknown;
  value_type: ValueType;
  effective_from: string;
  effective_to: string | null;
  citation: string | null;
  author: string;
  rationale: string;
  supersedes: string | null;
  language: string | null;
}
