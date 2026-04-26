// Text-rendered wordmark: "GovOps" with the middle "O" carrying the agentic
// accent (spec govops-002) so the system register is visible at a glance.
// The PNG variants in /public are reserved for og:image / favicons; the live UI
// uses text for crispness, RTL handling, and accessibility.
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{
        fontFamily: "var(--font-serif)",
        fontWeight: 600,
        letterSpacing: "-0.01em",
        whiteSpace: "nowrap",
      }}
      aria-label="GovOps"
    >
      Gov<span style={{ color: "var(--agentic)" }}>O</span>ps
    </span>
  );
}
