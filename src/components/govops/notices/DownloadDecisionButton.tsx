import { useState } from "react";
import { useIntl } from "react-intl";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ScreenRequest } from "@/lib/types";

const BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://127.0.0.1:8000";

export type DownloadDecisionButtonProps =
  | {
      mode: "case";
      caseId: string;
      language?: string;
      label?: string;
      variant?: "default" | "outline" | "secondary";
    }
  | {
      mode: "screen";
      screenRequest: ScreenRequest;
      language?: string;
      label?: string;
      variant?: "default" | "outline" | "secondary";
    };

/**
 * Passive consumer of the backend HTML-rendering endpoints (Phase 10C / ADR-012).
 * Opens the rendered notice in a new tab so the citizen can use the browser's
 * native "Save as PDF" / "Print" affordances. No persistence of the HTML or the
 * X-Notice-Sha256 header — the artefact is intentionally ephemeral.
 */
export function DownloadDecisionButton(props: DownloadDecisionButtonProps) {
  const intl = useIntl();
  const [busy, setBusy] = useState(false);
  const language = props.language ?? "en";
  const variant = props.variant ?? "outline";
  const label = props.label ?? intl.formatMessage({ id: "screen.download.cta" });
  const tooltip = intl.formatMessage({ id: "screen.download.tooltip" });

  const handleClick = async () => {
    setBusy(true);
    try {
      const url =
        props.mode === "case"
          ? `${BASE}/api/cases/${encodeURIComponent(props.caseId)}/notice?lang=${encodeURIComponent(language)}`
          : `${BASE}/api/screen/notice?lang=${encodeURIComponent(language)}`;
      const init: RequestInit =
        props.mode === "case"
          ? { method: "GET" }
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(props.screenRequest),
            };
      const res = await fetch(url, init);
      if (!res.ok) {
        toast.error(intl.formatMessage({ id: "screen.download.error" }));
        return;
      }
      const sha = res.headers.get("X-Notice-Sha256");
      if (sha) console.debug("[notice] X-Notice-Sha256", sha);
      const html = await res.text();
      const win = window.open("", "_blank", "noopener,noreferrer");
      if (!win) {
        toast.error(intl.formatMessage({ id: "screen.download.error" }));
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch {
      toast.error(intl.formatMessage({ id: "screen.download.error" }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      onClick={handleClick}
      disabled={busy}
      title={tooltip}
      aria-label={label}
      className={busy ? "motion-safe:animate-pulse" : undefined}
    >
      <Download className="size-4" aria-hidden />
      {busy ? intl.formatMessage({ id: "screen.download.in_progress" }) : label}
    </Button>
  );
}