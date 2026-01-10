import crypto from "crypto";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };

type JsonObject = { [k: string]: JsonValue };

function isPlainObject(v: unknown): v is JsonObject {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Canonicalize a JSON value deterministically:
 * - Objects: sort keys lexicographically and canonicalize values
 * - Arrays: preserve order (callers must supply stable ordering upstream)
 * - Numbers: preserve as-is (caller must ensure stable rounding if needed)
 */
export function canonicalizeJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((x) => canonicalizeJson(x));
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const out: JsonObject = {};
    for (const k of keys) {
      out[k] = canonicalizeJson(value[k]);
    }
    return out;
  }

  return value;
}

export function stableJsonStringify(value: JsonValue): string {
  const canon = canonicalizeJson(value);
  return JSON.stringify(canon);
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function buildM3InputsHash(payload: JsonValue): string {
  return sha256Hex(stableJsonStringify(payload));
}
