/**
 * Gives NOWAK well-known bearers for the end-to-end tests (TASK-103), with no
 * network: the pinned Wikidata answers captured for ZAREMBA on 2026-10-03
 * (`fixtures/wikidata-bearers/`), "Zaremba" written as "Nowak" in the names,
 * as `tests/integration/src/notable-bearers.test.ts` does. Nothing here
 * asserts whom Wikidata names NOWAK; the tests prove the page renders what the
 * claim holds. Idempotent: a second run stores nothing new.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { resolveSurname } from "@name-atlas/resolver";
import {
  WikidataPacer,
  ensureWikidataSource,
  fetchWikidataBearers,
  storeWikidataBearers,
} from "@name-atlas/sources";
import type { WikidataFetchDeps } from "@name-atlas/sources";
import { deriveNotableBearers } from "@name-atlas/truth";

const DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/wikidata-bearers/responses",
);
const BEARERS = readFileSync(path.join(DIR, "ZAREMBA.bearers.json"), "utf8").replaceAll(
  " Zaremba",
  " Nowak",
);
const DETAILS = readFileSync(path.join(DIR, "ZAREMBA.details.json"), "utf8");

const deps: WikidataFetchDeps = {
  now: () => Date.now(),
  sleep: async () => {},
  fetch: async (url) => {
    const query = new URL(url).searchParams.get("query") ?? "";
    const body = query.includes("schema:description") ? DETAILS : BEARERS;
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => body };
  },
};

async function main(): Promise<void> {
  const db = createDb(createPool(loadDbConfig()));
  try {
    const lookup = await resolveSurname(db, "NOWAK");
    const resolution = lookup.kind === "RESOLUTION" ? lookup.resolution : null;
    const surnameId =
      resolution?.resolution_status === "EXACT" ? resolution.resolved_surname_id : null;
    if (!surnameId) throw new Error("NOWAK is not in the seeded register");
    const sourceId = await ensureWikidataSource(db);
    const fetched = await fetchWikidataBearers("NOWAK", new WikidataPacer(deps, 0), deps);
    const stored = await storeWikidataBearers(db, { sourceId, surnameId, fetched });
    const derived = await deriveNotableBearers(db, surnameId);
    console.log(
      `[e2e-seed] NOWAK: ${stored.status.toLowerCase()}, claim ${derived.status.toLowerCase()}, ` +
        `${String(fetched.bearers.total)} people`,
    );
  } finally {
    await db.destroy();
  }
}

main().catch((err: unknown) => {
  console.error("[e2e-seed] failed:", err);
  process.exitCode = 1;
});
