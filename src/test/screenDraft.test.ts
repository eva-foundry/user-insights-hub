import { afterEach, describe, expect, it, vi } from "vitest";
import {
  saveScreenDraft,
  loadScreenDraft,
  clearScreenDraft,
  __test,
} from "@/lib/screenDraft";

afterEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("screenDraft — round-trip", () => {
  it("saves and restores by jurisdiction", () => {
    saveScreenDraft("ca", { date_of_birth: "1960-01-01" });
    expect(loadScreenDraft("ca")).toEqual({ date_of_birth: "1960-01-01" });
    expect(loadScreenDraft("fr")).toBeNull();
  });

  it("clear removes the snapshot", () => {
    saveScreenDraft("ca", { x: 1 });
    clearScreenDraft();
    expect(loadScreenDraft("ca")).toBeNull();
  });
});

describe("screenDraft — migration", () => {
  it("migrates a v1 snapshot to the current version", () => {
    const v1 = {
      v: 1,
      jurisdictionId: "ca",
      state: { date_of_birth: "1960-01-01" },
      savedAt: Date.now(),
    };
    window.sessionStorage.setItem(__test.KEY, JSON.stringify(v1));
    expect(loadScreenDraft("ca")).toEqual({ date_of_birth: "1960-01-01" });
  });

  it("discards an unknown future version", () => {
    window.sessionStorage.setItem(
      __test.KEY,
      JSON.stringify({ v: 999, jurisdictionId: "ca", state: {}, savedAt: 0 }),
    );
    expect(loadScreenDraft("ca")).toBeNull();
    // and clears the bad snapshot so future writes start fresh.
    expect(window.sessionStorage.getItem(__test.KEY)).toBeNull();
  });

  it("discards corrupt JSON", () => {
    window.sessionStorage.setItem(__test.KEY, "{not json");
    expect(loadScreenDraft("ca")).toBeNull();
    expect(window.sessionStorage.getItem(__test.KEY)).toBeNull();
  });

  it("discards a snapshot without a numeric version", () => {
    window.sessionStorage.setItem(__test.KEY, JSON.stringify({ jurisdictionId: "ca" }));
    expect(loadScreenDraft("ca")).toBeNull();
  });

  it("migrate() unit returns null for non-objects", () => {
    expect(__test.migrate(null)).toBeNull();
    expect(__test.migrate("string")).toBeNull();
    expect(__test.migrate(42)).toBeNull();
  });
});

describe("screenDraft — retry on storage failure", () => {
  it("retries once setItem starts succeeding", async () => {
    vi.useFakeTimers();
    let attempts = 0;
    const realSet = window.sessionStorage.setItem.bind(window.sessionStorage);
    const setSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation((k: string, v: string) => {
        attempts++;
        if (attempts < 2) throw new DOMException("QuotaExceededError");
        realSet(k, v);
      });

    saveScreenDraft("ca", { x: 1 });
    expect(attempts).toBe(1); // initial sync attempt failed

    await vi.advanceTimersByTimeAsync(60); // first backoff = 50ms
    expect(attempts).toBe(2);
    expect(setSpy).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("gives up silently after exhausting retries (no throw)", async () => {
    vi.useFakeTimers();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    expect(() => saveScreenDraft("ca", { x: 1 })).not.toThrow();
    await vi.advanceTimersByTimeAsync(2000); // exhaust 50+200+800
    vi.useRealTimers();
  });
});