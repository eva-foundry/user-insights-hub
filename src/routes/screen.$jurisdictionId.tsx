import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useIntl } from "react-intl";
import { ScreenShell } from "@/components/govops/ScreenShell";
import { ScreenForm } from "@/components/govops/ScreenForm";
import { ScreenResult } from "@/components/govops/ScreenResult";
import { submitScreen } from "@/lib/api";
import {
  SCREEN_JURISDICTIONS,
  type ScreenJurisdictionId,
  type ScreenRequest,
  type ScreenResponse,
} from "@/lib/types";

function isValidJurisdiction(id: string): id is ScreenJurisdictionId {
  return (SCREEN_JURISDICTIONS as readonly string[]).includes(id);
}

export const Route = createFileRoute("/screen/$jurisdictionId")({
  head: ({ params }) => ({
    meta: [{ title: `Self-screen — ${params.jurisdictionId.toUpperCase()} — GovOps` }],
  }),
  component: ScreenFormPage,
  notFoundComponent: () => <UnknownJurisdiction />,
});

const PROGRAM_LABELS: Record<ScreenJurisdictionId, { name: string; lede: string }> = {
  ca: {
    name: "Old Age Security — Canada",
    lede: "Federal monthly benefit for seniors aged 65 or over.",
  },
  br: {
    name: "Benefício de Prestação Continuada — Brasil",
    lede: "Assistência mensal para idosos com 65 anos ou mais.",
  },
  es: {
    name: "Pensión No Contributiva — España",
    lede: "Prestación económica para personas mayores sin recursos suficientes.",
  },
  fr: {
    name: "Allocation de Solidarité aux Personnes Âgées — France",
    lede: "Allocation mensuelle pour les personnes âgées à faibles ressources.",
  },
  de: {
    name: "Grundsicherung im Alter — Deutschland",
    lede: "Mindestsicherung für ältere Menschen mit geringem Einkommen.",
  },
  ua: {
    name: "State social assistance — Ukraine",
    lede: "Державна соціальна допомога для осіб похилого віку.",
  },
};

function ScreenFormPage() {
  const intl = useIntl();
  const { jurisdictionId } = Route.useParams() as { jurisdictionId: ScreenJurisdictionId };
  if (!isValidJurisdiction(jurisdictionId)) return <UnknownJurisdiction />;
  const program = PROGRAM_LABELS[jurisdictionId];

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScreenResponse | null>(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReq, setLastReq] = useState<ScreenRequest | null>(null);

  const run = async (req: ScreenRequest) => {
    setLoading(true);
    setError(null);
    setLastReq(req);
    try {
      const res = await submitScreen(req);
      setResult(res);
      setStale(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell showBack>
      <header className="mb-6">
        <h1 className="font-serif text-3xl text-foreground">{program.name}</h1>
        <p className="mt-2 text-foreground-muted">{program.lede}</p>
      </header>

      <section
        aria-labelledby="screen-mini-disclaimer"
        className="rounded border border-border bg-surface-sunken p-3 mb-6 text-sm text-foreground-muted"
      >
        <strong id="screen-mini-disclaimer" className="font-medium text-foreground">
          {intl.formatMessage({ id: "screen.disclaimer.title" })}.
        </strong>{" "}
        {intl.formatMessage({ id: "screen.disclaimer.footer" })}
      </section>

      <ScreenForm
        jurisdictionId={jurisdictionId}
        loading={loading}
        onSubmit={run}
        onChange={() => result && setStale(true)}
      />

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {result && (
        <ScreenResult
          data={result}
          stale={stale}
          jurisdictionId={jurisdictionId}
          onRerun={() => lastReq && run(lastReq)}
        />
      )}
    </ScreenShell>
  );
}

function UnknownJurisdiction() {
  const intl = useIntl();
  return (
    <ScreenShell>
      <h1 className="font-serif text-2xl">404</h1>
      <p className="mt-2 text-foreground-muted">
        {intl.formatMessage({ id: "screen.unknown_jurisdiction" })}
      </p>
      <Link
        to="/screen"
        className="mt-4 inline-block underline underline-offset-2 text-foreground"
      >
        {intl.formatMessage({ id: "screen.back" })}
      </Link>
    </ScreenShell>
  );
}
