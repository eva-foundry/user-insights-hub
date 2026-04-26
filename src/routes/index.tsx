import { createFileRoute } from "@tanstack/react-router";
import { Wordmark } from "@/components/govops/Wordmark";

export const Route = createFileRoute("/")({
  component: Index,
});

// govops-002: home renders only the wordmark per spec ("empty home, only the
// words 'GovOps'"). All business UI is deferred to govops-003+.
function Index() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center">
      <h1 className="text-6xl tracking-tight text-foreground sm:text-7xl">
        <Wordmark />
      </h1>
    </section>
  );
}
