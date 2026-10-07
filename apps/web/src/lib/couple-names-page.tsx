import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type {
  BirthNameLookup,
  GivenNameMeaningFacts,
  ReadingKey,
  StoredReading,
} from "@name-atlas/truth";
import { readingKey } from "@name-atlas/truth";
import { accountPath } from "./account-paths.js";
import { accountsRuntime } from "./accounts-runtime.js";
import { readBabyNamesSession } from "./baby-names-page.js";
import {
  COUPLE_NAMES_FIELDS,
  COUPLE_NAMES_PATHS,
  COUPLE_NAMES_PROMPT_VERSION,
  COUPLE_NAMES_STATUS_FIELD,
  coupleNamesEnabled,
  readingStatusOf,
} from "./couple-names-config.js";
import type { ReadingStatus } from "./couple-names-config.js";
import { whyNoReading } from "./couple-names-reading.js";
import type { NoReadingWhy } from "./couple-names-reading.js";
import { runningCoupleNamesDeps } from "./couple-names-runtime.js";
import { CoupleNamesView } from "./couple-names-view.js";
import type { Lang } from "./messages.js";

/**
 * The couple first-names page (TASK-156, ADR-0047): `/pl/imiona-pary` and
 * `/en/couple-names`, "Co mówią Wasze imiona razem".
 *
 * Signed out, it explains and links to sign-in. Signed in, two typed first
 * names resolve as the baby-names page resolves one (`findBirthGivenName`),
 * and each shows its origin and meaning from its `GIVEN_NAME_MEANING` claim
 * (`readGivenNameMeaning`, the FREE surface), or the stated absence. Below
 * them, the reading: the stored one for this pair under these claims and this
 * prompt, or a button that asks for one, or why none can be written (a name
 * with no quoted meaning), or that readings are unavailable (no key).
 *
 * Nothing here calls the model: `POST /api/couple-names` does
 * (`couple-names-routes.ts`). Nothing is computed from the two names together.
 *
 * A 404 unless `COUPLE_NAMES_ENABLED` is `1` and accounts are on; `noindex`;
 * `private, no-store` from the middleware.
 */

export const COUPLE_NAMES_METADATA: Readonly<Record<Lang, Metadata>> = {
  pl: {
    title: "Co mówią Wasze imiona razem — Name Atlas",
    robots: { index: false, follow: false },
  },
  en: {
    title: "What your names say together — Name Atlas",
    robots: { index: false, follow: false },
  },
};

export interface CoupleNamesDeps {
  readonly findName: (typed: string) => Promise<BirthNameLookup>;
  readonly readMeaning: (givenNameId: string) => Promise<GivenNameMeaningFacts>;
  readonly findReading: (key: ReadingKey) => Promise<StoredReading | null>;
  /** Whether a reading can be written at all: a key is set (ADR-0013). */
  readonly readingsAvailable: boolean;
}

export type LookupResult =
  | { readonly kind: "EMPTY" }
  | { readonly kind: "INVALID" }
  | { readonly kind: "NOT_FOUND" }
  | { readonly kind: "HELD" }
  | {
      readonly kind: "FOUND";
      readonly name: { readonly id: string; readonly display_name: string };
    };

export interface CoupleNamesSide {
  readonly name: { readonly id: string; readonly display_name: string };
  readonly meaning: GivenNameMeaningFacts;
}

export type ReadingState =
  | { readonly kind: "STORED"; readonly reading: StoredReading }
  | { readonly kind: "OFFER" }
  | {
      readonly kind: "NEEDS";
      readonly missing: readonly { readonly name: string; readonly why: NoReadingWhy }[];
    }
  | { readonly kind: "UNAVAILABLE" };

export type CoupleNamesData =
  | { readonly kind: "signed-out"; readonly lang: Lang; readonly signInHref: string }
  | {
      readonly kind: "signed-in";
      readonly lang: Lang;
      /** What was typed, as typed (trimmed); "" before a search. */
      readonly typed: { readonly a: string; readonly b: string };
      /** The route's word on its way back, if any. */
      readonly status: ReadingStatus | null;
      readonly result:
        | { readonly kind: "NONE" }
        | { readonly kind: "LOOKUP"; readonly a: LookupResult; readonly b: LookupResult }
        | {
            readonly kind: "PAIR";
            readonly a: CoupleNamesSide;
            readonly b: CoupleNamesSide;
            /** The same name twice: shown once. */
            readonly same: boolean;
            readonly reading: ReadingState;
          };
    };

type Query = Readonly<Record<string, string | string[] | undefined>>;

function first(query: Query, key: string): string {
  const value = query[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

async function lookUp(deps: CoupleNamesDeps, typed: string): Promise<LookupResult> {
  if (typed === "") return { kind: "EMPTY" };
  const found = await deps.findName(typed);
  return found.kind === "FOUND" ? { kind: "FOUND", name: found.given_name } : { kind: found.kind };
}

/** The reading's state for two names whose meanings are read: no model call, no figure. */
export async function readingStateOf(
  deps: Pick<CoupleNamesDeps, "findReading" | "readingsAvailable">,
  a: CoupleNamesSide,
  b: CoupleNamesSide,
): Promise<ReadingState> {
  const missing = [a, b]
    .filter((side, i, both) => i === 0 || both[0]!.name.id !== side.name.id)
    .flatMap((side) => {
      const why = whyNoReading(side.meaning);
      return why === null ? [] : [{ name: side.name.display_name, why }];
    });
  if (missing.length > 0) return { kind: "NEEDS", missing };
  if (a.meaning.state !== "READY" || b.meaning.state !== "READY") {
    return { kind: "NEEDS", missing: [] };
  }
  const key = readingKey(
    { given_name_id: a.name.id, claim_id: a.meaning.claim_id },
    { given_name_id: b.name.id, claim_id: b.meaning.claim_id },
    COUPLE_NAMES_PROMPT_VERSION,
  );
  const stored = await deps.findReading(key);
  if (stored !== null) return { kind: "STORED", reading: stored };
  return deps.readingsAvailable ? { kind: "OFFER" } : { kind: "UNAVAILABLE" };
}

/** What the page shows, from the session and the query; no rendering, no cookie. */
export async function loadCoupleNames(input: {
  readonly lang: Lang;
  readonly query: Query;
  readonly session: { readonly userId: string } | null;
  readonly deps: CoupleNamesDeps;
}): Promise<CoupleNamesData> {
  const { lang, session, deps } = input;
  if (session === null) {
    return {
      kind: "signed-out",
      lang,
      signInHref: accountPath(lang, "sign-in", { next: COUPLE_NAMES_PATHS[lang] }),
    };
  }
  const typed = {
    a: first(input.query, COUPLE_NAMES_FIELDS.a).trim().slice(0, 80),
    b: first(input.query, COUPLE_NAMES_FIELDS.b).trim().slice(0, 80),
  };
  const status = readingStatusOf(first(input.query, COUPLE_NAMES_STATUS_FIELD));
  if (typed.a === "" && typed.b === "") {
    return { kind: "signed-in", lang, typed, status, result: { kind: "NONE" } };
  }
  const [a, b] = await Promise.all([lookUp(deps, typed.a), lookUp(deps, typed.b)]);
  if (a.kind !== "FOUND" || b.kind !== "FOUND") {
    return { kind: "signed-in", lang, typed, status, result: { kind: "LOOKUP", a, b } };
  }
  const same = a.name.id === b.name.id;
  const [meaningA, meaningB] = await Promise.all([
    deps.readMeaning(a.name.id),
    same ? Promise.resolve(null) : deps.readMeaning(b.name.id),
  ]);
  const sideA: CoupleNamesSide = { name: a.name, meaning: meaningA };
  const sideB: CoupleNamesSide = { name: b.name, meaning: meaningB ?? meaningA };
  const reading = await readingStateOf(deps, sideA, sideB);
  return {
    kind: "signed-in",
    lang,
    typed,
    status,
    result: { kind: "PAIR", a: sideA, b: sideB, same, reading },
  };
}

export function coupleNamesMetadata(lang: Lang): Metadata {
  return coupleNamesEnabled() ? COUPLE_NAMES_METADATA[lang] : {};
}

/** The route's page: a 404 when off; reads the session cookie, loads, renders. */
export async function CoupleNamesRoute({
  lang,
  searchParams,
}: {
  readonly lang: Lang;
  readonly searchParams: Promise<Query>;
}) {
  if (!coupleNamesEnabled()) notFound();
  const accounts = accountsRuntime();
  if (accounts === null) notFound();
  const query = await searchParams;
  const session = await readBabyNamesSession(accounts);
  const data = await loadCoupleNames({ lang, query, session, deps: runningCoupleNamesDeps() });
  return <CoupleNamesView data={data} />;
}
