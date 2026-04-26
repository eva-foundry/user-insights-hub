/**
 * Session-only persistence for the self-screening form.
 *
 * Why sessionStorage (not localStorage):
 *   The form contains potentially personal data (date of birth, residency).
 *   sessionStorage scopes the snapshot to the current browser tab/session
 *   and is wiped when the tab closes — so a user who navigates to /policies
 *   and back can resume their draft, but nothing persists across sessions.
 *
 * This module never touches network, never logs, and silently no-ops on
 * any storage failure (private mode, quota, SSR).
 */

const KEY = "govops:screen-draft";

export interface ScreenDraftSnapshot {
  /** Schema version — bump if the shape changes so old drafts get discarded. */
  v: 1;
  jurisdictionId: string;
  /** Opaque payload (kept generic so the form owns its own shape). */
  state: unknown;
  savedAt: number;
}

export function saveScreenDraft(jurisdictionId: string, state: unknown): void {
  if (typeof window === "undefined") return;
  try {
    const snap: ScreenDraftSnapshot = { v: 1, jurisdictionId, state, savedAt: Date.now() };
    window.sessionStorage.setItem(KEY, JSON.stringify(snap));
  } catch {
    /* swallow */
  }
}

export function loadScreenDraft(jurisdictionId: string): unknown | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as Partial<ScreenDraftSnapshot>;
    if (!snap || snap.v !== 1) return null;
    if (snap.jurisdictionId !== jurisdictionId) return null;
    return snap.state ?? null;
  } catch {
    return null;
  }
}

export function clearScreenDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* swallow */
  }
}