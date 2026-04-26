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
 *
 * Resilience:
 *   - Writes are retried on a short backoff if the browser transiently
 *     refuses storage (e.g. Safari private-mode quota=0). The retry runs
 *     in the background and never blocks the caller.
 *   - Reads run a migration pipeline so older snapshot shapes are either
 *     upgraded to the current version or discarded safely.
 */

const KEY = "govops:screen-draft";
const CURRENT_VERSION = 2 as const;
const RETRY_DELAYS_MS = [50, 200, 800];

export interface ScreenDraftSnapshot {
  /** Schema version — bump if the shape changes so old drafts get migrated. */
  v: typeof CURRENT_VERSION;
  jurisdictionId: string;
  /** Opaque payload (kept generic so the form owns its own shape). */
  state: unknown;
  savedAt: number;
}

/**
 * Migration pipeline. Each migrator receives a snapshot of the previous
 * version and returns the next version, or `null` to discard.
 * Only register migrators for shapes you can safely upgrade; otherwise
 * the old snapshot is dropped.
 */
type Migrator = (input: Record<string, unknown>) => Record<string, unknown> | null;

const MIGRATIONS: Record<number, Migrator> = {
  // v1 → v2: shape was identical; just stamp the new version. Older drafts
  // can be safely re-used. If a future migration changes `state`, do the
  // structural work here instead of passing it through.
  1: (snap) => ({ ...snap, v: 2 }),
};

function migrate(raw: unknown): ScreenDraftSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  let snap = raw as Record<string, unknown>;
  let version = typeof snap.v === "number" ? snap.v : NaN;
  // Reject snapshots that don't even claim a numeric version.
  if (!Number.isFinite(version)) return null;
  // Reject snapshots from the future; we can't safely downgrade.
  if (version > CURRENT_VERSION) return null;

  while (version < CURRENT_VERSION) {
    const m = MIGRATIONS[version];
    if (!m) return null; // no path forward — discard.
    const next = m(snap);
    if (!next) return null;
    snap = next;
    const nv = typeof snap.v === "number" ? snap.v : NaN;
    if (!Number.isFinite(nv) || nv <= version) return null; // safety net.
    version = nv;
  }

  // Final shape check.
  if (
    snap.v !== CURRENT_VERSION ||
    typeof snap.jurisdictionId !== "string" ||
    typeof snap.savedAt !== "number"
  ) {
    return null;
  }
  return snap as unknown as ScreenDraftSnapshot;
}

/** Tries one synchronous write. Returns true on success. */
function trySetItem(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Schedule background retries for the most recent payload only. We coalesce
 * by key so rapid edits don't queue a backlog of stale snapshots.
 */
const pendingRetries = new Map<string, ReturnType<typeof setTimeout>>();
function scheduleRetry(key: string, value: string, attempt: number) {
  if (typeof window === "undefined") return;
  const existing = pendingRetries.get(key);
  if (existing) clearTimeout(existing);
  if (attempt >= RETRY_DELAYS_MS.length) {
    pendingRetries.delete(key);
    return; // give up silently after all backoffs.
  }
  const handle = setTimeout(() => {
    pendingRetries.delete(key);
    if (!trySetItem(key, value)) scheduleRetry(key, value, attempt + 1);
  }, RETRY_DELAYS_MS[attempt]);
  pendingRetries.set(key, handle);
}

export function saveScreenDraft(jurisdictionId: string, state: unknown): void {
  if (typeof window === "undefined") return;
  let payload: string;
  try {
    const snap: ScreenDraftSnapshot = {
      v: CURRENT_VERSION,
      jurisdictionId,
      state,
      savedAt: Date.now(),
    };
    payload = JSON.stringify(snap);
  } catch {
    return; // unserializable state — nothing to do.
  }
  if (!trySetItem(KEY, payload)) scheduleRetry(KEY, payload, 0);
}

export function loadScreenDraft(jurisdictionId: string): unknown | null {
  if (typeof window === "undefined") return null;
  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Corrupt JSON — discard so future writes start fresh.
    clearScreenDraft();
    return null;
  }
  const snap = migrate(parsed);
  if (!snap) {
    clearScreenDraft();
    return null;
  }
  if (snap.jurisdictionId !== jurisdictionId) return null;
  return snap.state ?? null;
}

export function clearScreenDraft(): void {
  if (typeof window === "undefined") return;
  // Cancel any in-flight retry that might re-write a stale payload.
  const pending = pendingRetries.get(KEY);
  if (pending) {
    clearTimeout(pending);
    pendingRetries.delete(KEY);
  }
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* swallow */
  }
}

/** Internal helpers exposed for tests only. */
export const __test = {
  CURRENT_VERSION,
  KEY,
  migrate,
};