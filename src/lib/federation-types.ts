export type FederationTrustStatus = "trusted" | "unsigned_only" | "untrusted";

export interface FederationRegistryEntry {
  publisher_id: string;
  name: string;
  manifest_url: string;
  trust_status: FederationTrustStatus;
  last_fetched_at: string | null;
}

export interface FederationPack {
  publisher_id: string;
  pack_name: string;
  version: string;
  fetched_at: string;
  signed: boolean;
  file_count: number;
  enabled: boolean;
}

export interface FederationFetchResult {
  publisher_id: string;
  pack_name: string;
  version: string;
  file_count: number;
  signed: boolean;
  dry_run: boolean;
}
