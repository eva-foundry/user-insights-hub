export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{ fontFamily: "var(--font-serif)", fontWeight: 600, letterSpacing: "-0.01em" }}
      aria-label="GovOps"
    >
      Gov<span style={{ color: "var(--agentic)" }}>O</span>ps
    </span>
  );
}
