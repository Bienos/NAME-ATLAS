import { MissingDatabaseUrlError, createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { resolveSurname } from "@name-atlas/resolver";
import { readPeselRegister } from "@name-atlas/sources/pesel";
import { buildSurnameLookup } from "../lib/lookup-state";
import type { SurnameLookup } from "../lib/lookup-state";

/**
 * Server-only wiring for the results page: one connection pool per process
 * (ARCHITECTURE.md §9), created on first use and kept across dev reloads.
 * `@name-atlas/db` stays the only reader of DATABASE_URL.
 *
 * The page never resolves or selects anything itself — it calls the
 * resolver (identity) and the PESEL read (distribution), both owned by their
 * packages.
 */

type Database = ReturnType<typeof createDb>;

const holder = globalThis as typeof globalThis & { __nameAtlasDatabase?: Database };

function database(): Database | null {
  if (holder.__nameAtlasDatabase) {
    return holder.__nameAtlasDatabase;
  }
  try {
    holder.__nameAtlasDatabase = createDb(createPool(loadDbConfig()));
    return holder.__nameAtlasDatabase;
  } catch (error: unknown) {
    if (error instanceof MissingDatabaseUrlError) {
      return null;
    }
    throw error;
  }
}

export function lookupSurname(raw: string): Promise<SurnameLookup> {
  const db = database();
  return buildSurnameLookup(
    raw,
    db && {
      resolve: (input) => resolveSurname(db, input),
      readRegister: (surnameId) => readPeselRegister(db, surnameId),
      report: (error) => {
        console.error("[surname-lookup]", error);
      },
    },
  );
}
