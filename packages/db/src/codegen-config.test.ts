import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Guards the one property the "generated types are current" CI check depends
 * on: type generation must introspect only the schema this project owns.
 *
 * The pinned `postgis/postgis` image's own init script loads four extensions
 * into every database. Two of them, `postgis_tiger_geocoder` and
 * `postgis_topology`, create the `tiger` and `topology` schemas, which hold
 * roughly 36 tables between them. `kysely-codegen` introspects every schema
 * it can see, so without a restriction it emits those tables on CI and omits
 * them on a development database that has only `postgis` and `pg_trgm` — and
 * the check then compares two environments rather than two schemas.
 *
 * ADR-0002 requires CI to verify that the checked-in types match a freshly
 * migrated database, "or they will silently rot". This assertion keeps that
 * check meaningful instead of unpassable.
 */
const PACKAGE_JSON = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../package.json");

interface PackageManifest {
  readonly scripts: Readonly<Record<string, string>>;
}

function readGenerateTypesScript(): string {
  const manifest = JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf8")) as PackageManifest;
  const script = manifest.scripts["generate-types"];
  if (script === undefined) {
    throw new Error("packages/db/package.json has no generate-types script");
  }
  return script;
}

describe("generate-types script", () => {
  it("restricts introspection to the public schema", () => {
    // Without this, extension-owned schemas leak into the generated types and
    // the output depends on which PostGIS sub-extensions the database happens
    // to carry.
    expect(readGenerateTypesScript()).toContain('--include-pattern="public.*"');
  });

  it("still generates into the checked-in location from the migrated database", () => {
    const script = readGenerateTypesScript();
    expect(script).toContain("--out-file=src/generated/db.ts");
    expect(script).toContain("--dialect=postgres");
    // Types flow FROM the database, never the other way round (ADR-0002).
    expect(script).toContain("$DATABASE_URL");
  });
});
