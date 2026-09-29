import { PolonaShapeError } from "./errors.js";

/**
 * Strict readers for Polona's JSON responses.
 *
 * Every reader either returns the value it was asked for or throws a
 * `PolonaShapeError`. Nothing is coerced: a number served as a string is
 * drift, not a number.
 */

export type JsonObject = { readonly [key: string]: unknown };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new PolonaShapeError(
      "invalid_json",
      "$",
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * An object whose keys must be exactly `required`, plus any of `optional`.
 *
 * An absent key and an extra key are both drift. An extra key is not
 * harmless here: it is the first sign that Polona serves a shape this parser
 * was not built from.
 */
export function object(
  value: unknown,
  path: string,
  required: readonly string[],
  optional: readonly string[] = [],
): JsonObject {
  const record = map(value, path);
  for (const key of required) {
    if (!Object.hasOwn(record, key)) {
      throw new PolonaShapeError("missing_field", `${path}.${key}`, "required field is absent");
    }
  }
  for (const key of Object.keys(record)) {
    if (!required.includes(key) && !optional.includes(key)) {
      throw new PolonaShapeError(
        "unexpected_field",
        `${path}.${key}`,
        "field is not in the observed shape",
      );
    }
  }
  return record;
}

/** An object used as a map, whose keys are data (field names, facet names). */
export function map(value: unknown, path: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new PolonaShapeError("wrong_type", path, `expected an object, found ${describe(value)}`);
  }
  return value as JsonObject;
}

export function array(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new PolonaShapeError("wrong_type", path, `expected an array, found ${describe(value)}`);
  }
  return value;
}

export function string(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new PolonaShapeError("wrong_type", path, `expected a string, found ${describe(value)}`);
  }
  return value;
}

export function nullableString(value: unknown, path: string): string | null {
  return value === null ? null : string(value, path);
}

export function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new PolonaShapeError("wrong_type", path, `expected a boolean, found ${describe(value)}`);
  }
  return value;
}

/** A non-negative safe integer. */
export function count(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new PolonaShapeError(
      "wrong_type",
      path,
      `expected a non-negative integer, found ${JSON.stringify(value)}`,
    );
  }
  return value;
}

export function nullableCount(value: unknown, path: string): number | null {
  return value === null ? null : count(value, path);
}

/** A value observed only ever as `null`. Anything else is a shape change. */
export function alwaysNull(value: unknown, path: string): null {
  if (value !== null) {
    throw new PolonaShapeError("wrong_type", path, `expected null, found ${describe(value)}`);
  }
  return null;
}

export function uuid(value: unknown, path: string): string {
  const text = string(value, path);
  if (!UUID_PATTERN.test(text)) {
    throw new PolonaShapeError(
      "unexpected_value",
      path,
      `expected a lower-case UUID, found ${JSON.stringify(text)}`,
    );
  }
  return text;
}

export function oneOf<T extends string>(value: unknown, path: string, allowed: readonly T[]): T {
  const text = string(value, path);
  if (!(allowed as readonly string[]).includes(text)) {
    throw new PolonaShapeError(
      "unexpected_value",
      path,
      `${JSON.stringify(text)} is not one of the observed values ${JSON.stringify(allowed)}`,
    );
  }
  return text as T;
}

/** The `{ en, pl }` label pair every field, attribute and facet carries. */
export function labels(value: unknown, path: string): { readonly en: string; readonly pl: string } {
  const record = object(value, path, ["en", "pl"]);
  return { en: string(record["en"], `${path}.en`), pl: string(record["pl"], `${path}.pl`) };
}
