import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useIntl, FormattedDate } from "react-intl";
import { toast } from "sonner";
import { Check, AlertTriangle, MoreHorizontal } from "lucide-react";
import {
  fetchFederationPack,
  listFederationPacks,
  listFederationRegistry,
  setFederationPackEnabled,
} from "@/lib/api";
import type {
  FederationPack,
  FederationRegistryEntry,
  FederationTrustStatus,
} from "@/lib/federation-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/admin/federation")({
  head: () => ({
    meta: [
      { title: "Federation — GovOps Admin" },
      {
        name: "description",
        content:
          "Trusted lawcode publishers, imported packs, and on-demand fetches.",
      },
    ],
  }),
  component: FederationPage,
});

const TRUST_TONE: Record<FederationTrustStatus, string> = {
  trusted: "var(--verdict-enacted)",
  unsigned_only: "var(--verdict-pending)",
  untrusted: "var(--verdict-rejected)",
};

function TrustChip({ status }: { status: FederationTrustStatus }) {
  const intl = useIntl();
  const c = TRUST_TONE[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
      style={{
        backgroundColor: `color-mix(in oklab, ${c} 14%, transparent)`,
        color: c,
        fontFamily: "var(--font-mono)",
      }}
    >
      {intl.formatMessage({ id: `admin.federation.trust.${status}` })}
    </span>
  );
}

function FederationPage() {
  const intl = useIntl();
  const [registry, setRegistry] = useState<FederationRegistryEntry[]>([]);
  const [packs, setPacks] = useState<FederationPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // form
  const [publisherId, setPublisherId] = useState("");
  const [dryRun, setDryRun] = useState(false);
  const [allowUnsigned, setAllowUnsigned] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([listFederationRegistry(), listFederationPacks()]);
      setRegistry(r.entries);
      setPacks(p.packs);
      if (!publisherId && r.entries[0]) setPublisherId(r.entries[0].publisher_id);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const lastFetchedById = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const r of registry) m.set(r.publisher_id, r.last_fetched_at);
    for (const p of packs) m.set(p.publisher_id, p.fetched_at);
    return m;
  }, [registry, packs]);

  const onFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publisherId) return;
    setSubmitting(true);
    try {
      const res = await fetchFederationPack(publisherId, { dryRun, allowUnsigned });
      toast.success(
        intl.formatMessage(
          { id: "admin.federation.fetch.success" },
          {
            publisher: res.publisher_id,
            pack: res.pack_name,
            version: res.version,
            files: res.file_count,
            signed: String(res.signed),
          },
        ),
      );
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onRefetch = async (pid: string) => {
    try {
      await fetchFederationPack(pid, { dryRun: false, allowUnsigned: false });
      toast.success(intl.formatMessage({ id: "admin.federation.action.refetch" }));
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Re-fetch failed");
    }
  };

  const onToggle = async (pid: string, enable: boolean) => {
    try {
      await setFederationPackEnabled(pid, enable);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Toggle failed");
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1
          className="text-3xl tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}
        >
          {intl.formatMessage({ id: "admin.federation.heading" })}
        </h1>
        <p className="max-w-3xl text-sm text-foreground-muted">
          {intl.formatMessage({ id: "admin.federation.lede" })}
        </p>
      </header>

      {/* Section 1: Registered publishers */}
      <section
        aria-labelledby="federation-registry-heading"
        className="space-y-3 rounded-md border border-border bg-surface-raised p-5"
      >
        <h2
          id="federation-registry-heading"
          className="text-lg text-foreground"
          style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}
        >
          {intl.formatMessage({ id: "admin.federation.section.registry" })}
        </h2>
        {loading ? (
          <p className="text-sm text-foreground-muted">…</p>
        ) : registry.length === 0 ? (
          <p className="text-sm text-foreground-muted">
            {intl.formatMessage({ id: "admin.federation.empty_registry" })}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-foreground-muted">
                  <th className="py-2">
                    {intl.formatMessage({ id: "admin.federation.col.publisher_id" })}
                  </th>
                  <th>{intl.formatMessage({ id: "admin.federation.col.name" })}</th>
                  <th>{intl.formatMessage({ id: "admin.federation.col.manifest_url" })}</th>
                  <th>{intl.formatMessage({ id: "admin.federation.col.trust" })}</th>
                  <th>{intl.formatMessage({ id: "admin.federation.col.last_fetched" })}</th>
                </tr>
              </thead>
              <tbody>
                {registry.map((r) => {
                  const lf = lastFetchedById.get(r.publisher_id) ?? null;
                  return (
                    <tr key={r.publisher_id} className="border-t border-border">
                      <td
                        className="py-2"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {r.publisher_id}
                      </td>
                      <td>{r.name}</td>
                      <td className="max-w-[18rem] truncate" title={r.manifest_url}>
                        <a
                          href={r.manifest_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-authority hover:underline"
                        >
                          {r.manifest_url}
                        </a>
                      </td>
                      <td>
                        <TrustChip status={r.trust_status} />
                      </td>
                      <td className="text-foreground-muted">
                        {lf ? (
                          <FormattedDate
                            value={lf}
                            year="numeric"
                            month="short"
                            day="numeric"
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section 2: Imported packs */}
      <section
        aria-labelledby="federation-packs-heading"
        className="space-y-3 rounded-md border border-border bg-surface-raised p-5"
      >
        <h2
          id="federation-packs-heading"
          className="text-lg text-foreground"
          style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}
        >
          {intl.formatMessage({ id: "admin.federation.section.packs" })}
        </h2>
        {loading ? (
          <p className="text-sm text-foreground-muted">…</p>
        ) : packs.length === 0 ? (
          <p className="text-sm text-foreground-muted">
            {intl.formatMessage({ id: "admin.federation.empty_packs" })}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-foreground-muted">
                  <th className="py-2">
                    {intl.formatMessage({ id: "admin.federation.col.publisher" })}
                  </th>
                  <th>{intl.formatMessage({ id: "admin.federation.col.pack_name" })}</th>
                  <th>{intl.formatMessage({ id: "admin.federation.col.version" })}</th>
                  <th>{intl.formatMessage({ id: "admin.federation.col.fetched_at" })}</th>
                  <th>{intl.formatMessage({ id: "admin.federation.col.signed" })}</th>
                  <th>{intl.formatMessage({ id: "admin.federation.col.files" })}</th>
                  <th>{intl.formatMessage({ id: "admin.federation.col.status" })}</th>
                  <th className="text-right">
                    {intl.formatMessage({ id: "admin.federation.col.actions" })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {packs.map((p) => {
                  const signedLabel = intl.formatMessage({
                    id: p.signed ? "admin.federation.signed.true" : "admin.federation.signed.false",
                  });
                  return (
                    <tr key={p.publisher_id} className="border-t border-border">
                      <td
                        className="py-2"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {p.publisher_id}
                      </td>
                      <td>{p.pack_name}</td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{p.version}</td>
                      <td className="text-foreground-muted">
                        <FormattedDate
                          value={p.fetched_at}
                          year="numeric"
                          month="short"
                          day="numeric"
                        />
                      </td>
                      <td>
                        <span
                          className="inline-flex items-center gap-1 text-xs"
                          title={signedLabel}
                        >
                          {p.signed ? (
                            <Check
                              className="size-4"
                              style={{ color: "var(--verdict-enacted)" }}
                              aria-hidden
                            />
                          ) : (
                            <AlertTriangle
                              className="size-4"
                              style={{ color: "var(--verdict-pending)" }}
                              aria-hidden
                            />
                          )}
                          <span className="sr-only">{signedLabel}</span>
                        </span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{p.file_count}</td>
                      <td>
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                          style={{
                            backgroundColor: p.enabled
                              ? "color-mix(in oklab, var(--verdict-enacted) 14%, transparent)"
                              : "color-mix(in oklab, var(--foreground-muted) 14%, transparent)",
                            color: p.enabled
                              ? "var(--verdict-enacted)"
                              : "var(--foreground-muted)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {intl.formatMessage({
                            id: p.enabled
                              ? "admin.federation.status.active"
                              : "admin.federation.status.disabled",
                          })}
                        </span>
                      </td>
                      <td className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="actions">
                              <MoreHorizontal className="size-4" aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onRefetch(p.publisher_id)}>
                              {intl.formatMessage({ id: "admin.federation.action.refetch" })}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onToggle(p.publisher_id, !p.enabled)}
                            >
                              {intl.formatMessage({
                                id: p.enabled
                                  ? "admin.federation.action.disable"
                                  : "admin.federation.action.enable",
                              })}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section 3: Fetch a pack */}
      <section
        aria-labelledby="federation-fetch-heading"
        className="space-y-3 rounded-md border border-border bg-surface-raised p-5"
      >
        <h2
          id="federation-fetch-heading"
          className="text-lg text-foreground"
          style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}
        >
          {intl.formatMessage({ id: "admin.federation.section.fetch" })}
        </h2>
        <form onSubmit={onFetch} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fed-publisher">
              {intl.formatMessage({ id: "admin.federation.fetch.publisher_id" })}
            </Label>
            {registry.length > 0 ? (
              <Select value={publisherId} onValueChange={setPublisherId}>
                <SelectTrigger id="fed-publisher">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {registry.map((r) => (
                    <SelectItem key={r.publisher_id} value={r.publisher_id}>
                      {r.publisher_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="fed-publisher"
                placeholder={intl.formatMessage({ id: "admin.federation.empty_registry" })}
                value={publisherId}
                onChange={(e) => setPublisherId(e.target.value)}
                disabled
              />
            )}
          </div>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={dryRun}
                onCheckedChange={(v) => setDryRun(v === true)}
              />
              {intl.formatMessage({ id: "admin.federation.fetch.dry_run" })}
            </label>
            <label
              className="flex items-center gap-2 text-sm"
              title={intl.formatMessage({
                id: "admin.federation.allow_unsigned_warning",
              })}
            >
              <Checkbox
                checked={allowUnsigned}
                onCheckedChange={(v) => setAllowUnsigned(v === true)}
              />
              {intl.formatMessage({ id: "admin.federation.fetch.allow_unsigned" })}
            </label>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={submitting || !publisherId}>
              {submitting
                ? intl.formatMessage({ id: "admin.federation.fetch_in_progress" })
                : intl.formatMessage({ id: "admin.federation.fetch.submit" })}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
