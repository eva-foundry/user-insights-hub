import { createFileRoute } from "@tanstack/react-router";
import { useIntl } from "react-intl";
import { Wordmark } from "@/components/govops/Wordmark";
import { ProvenanceRibbon } from "@/components/govops/ProvenanceRibbon";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const intl = useIntl();
  return (
    <section className="flex min-h-[60vh] flex-col items-start justify-center gap-6">
      <div className="flex items-stretch">
        <ProvenanceRibbon variant="hybrid" />
        <div>
          <h1
            className="text-6xl tracking-tight text-foreground sm:text-7xl"
            style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}
          >
            <Wordmark />
          </h1>
          <p className="mt-4 max-w-xl text-base text-foreground-muted">
            {intl.formatMessage({ id: "app.tagline" })}
          </p>
        </div>
      </div>
    </section>
  );
}
