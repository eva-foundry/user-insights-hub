import type { ValueType } from "./types";

export const KEY_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)+$/;

/** Returns an i18n message id, or null if valid. */
export function validateKey(key: string): string | null {
  if (!key) return "validators.key.required";
  if (!KEY_REGEX.test(key)) return "validators.key.format";
  if (key.split(".").length < 3) return "validators.key.too_shallow";
  return null;
}

/** Returns an i18n message id, or null if valid. */
export function validateRationale(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length < 20) return "validators.rationale.too_short";
  if (trimmed.length > 2000) return "validators.rationale.too_long";
  return null;
}

/**
 * Coerces a raw form string (or already-typed value) into the appropriate
 * ConfigValue runtime shape. Throws an Error whose message is an i18n key.
 */
export function coerceValue(raw: unknown, type: ValueType): unknown {
  switch (type) {
    case "number": {
      const n = Number(raw);
      if (Number.isNaN(n)) throw new Error("validators.value.not_a_number");
      return n;
    }
    case "bool":
      return raw === true || raw === "true";
    case "list":
    case "enum":
      if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
      return String(raw ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    case "formula":
      try {
        return typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch {
        throw new Error("validators.value.bad_json");
      }
    case "string":
    case "prompt":
    default:
      return String(raw ?? "");
  }
}