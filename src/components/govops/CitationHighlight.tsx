/**
 * Wraps the matched query substring inside `text` with a semantic <mark>.
 * Falls back to the unmodified text when there's no match or no query.
 */
export function CitationHighlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark
        style={{
          backgroundColor: "var(--surface-sunken)",
          color: "var(--foreground)",
          padding: "0 0.15em",
          borderRadius: "2px",
        }}
      >
        {text.slice(idx, idx + needle.length)}
      </mark>
      {text.slice(idx + needle.length)}
    </>
  );
}
