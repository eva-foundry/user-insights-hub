import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { DraftConfigForm } from "@/components/govops/DraftConfigForm";
import { createConfigValue, getConfigValue } from "@/lib/api";
import { MOCK_CONFIG_VALUES } from "@/lib/mock-config-values";
import type { ConfigValue, CreateConfigValueRequest } from "@/lib/types";

type DraftSearch = {
  key?: string;
  jurisdiction_id?: string;
  value_type?: string;
  supersedes_id?: string;
};

export const Route = createFileRoute("/config/draft")({
  head: () => ({
    meta: [{ title: "Draft new ConfigValue — GovOps" }],
  }),
  validateSearch: (s: Record<string, unknown>): DraftSearch => ({
    key: typeof s.key === "string" ? s.key : undefined,
    jurisdiction_id: typeof s.jurisdiction_id === "string" ? s.jurisdiction_id : undefined,
    value_type: typeof s.value_type === "string" ? s.value_type : undefined,
    supersedes_id: typeof s.supersedes_id === "string" ? s.supersedes_id : undefined,
  }),
  component: DraftPage,
});

function DraftPage() {
  const search = Route.useSearch();
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [prior, setPrior] = useState<ConfigValue | null>(null);

  // Load the prior version when superseding (live → mock fallback).
  useEffect(() => {
    if (!search.supersedes_id) {
      setPrior(null);
      return;
    }
    let cancelled = false;
    getConfigValue(search.supersedes_id)
      .catch(() => MOCK_CONFIG_VALUES.find((v) => v.id === search.supersedes_id) ?? null)
      .then((v) => {
        if (!cancelled) setPrior(v ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [search.supersedes_id]);

  async function onSubmit(body: CreateConfigValueRequest) {
    setSubmitting(true);
    try {
      const created = await createConfigValue(body);
      nav({
        to: "/config/$key/$jurisdictionId",
        params: {
          key: created.key,
          jurisdictionId: created.jurisdiction_id ?? "global",
        },
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DraftConfigForm
      initial={search}
      prior={prior}
      onSubmit={onSubmit}
      submitting={submitting}
    />
  );
}