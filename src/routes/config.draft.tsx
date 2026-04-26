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
  domain?: string;
  value?: string;
  effective_from?: string;
  citation?: string;
  rationale?: string;
  language?: string;
};

export const Route = createFileRoute("/config/draft")({
  head: () => ({
    meta: [{ title: "Draft new ConfigValue — GovOps" }],
  }),
  validateSearch: (s: Record<string, unknown>): DraftSearch => {
    const pick = (k: string) => (typeof s[k] === "string" ? (s[k] as string) : undefined);
    return {
      key: pick("key"),
      jurisdiction_id: pick("jurisdiction_id"),
      value_type: pick("value_type"),
      supersedes_id: pick("supersedes_id"),
      domain: pick("domain"),
      value: pick("value"),
      effective_from: pick("effective_from"),
      citation: pick("citation"),
      rationale: pick("rationale"),
      language: pick("language"),
    };
  },
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

  function onSaveDraft(params: Record<string, string>) {
    nav({
      to: "/config/draft",
      search: params as DraftSearch,
      replace: true,
    });
  }

  return (
    <DraftConfigForm
      initial={search}
      prior={prior}
      onSubmit={onSubmit}
      onSaveDraft={onSaveDraft}
      submitting={submitting}
    />
  );
}