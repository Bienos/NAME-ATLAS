import { seedTestNameForm, seedTestSurname } from "@name-atlas/resolver/testing";
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";

/**
 * `surname-set-v1` — the canonical entity fixture the resolution corpus runs
 * against (`docs/canonical/17` §9).
 *
 * **Every entity here is synthetic** in the sense §7.2 requires: the strings are
 * real Polish spellings, used as realistic *strings*, and nothing about any of
 * them is a claim. No count, no region, no date and no evidence is attached to
 * any of them. A surname appearing in this file says nothing about how many
 * people bear it or where.
 *
 * The set is deliberately small. §8 sizes the P0 resolution corpus at 160 cases
 * over 36 seed entities and immediately adds that these "overlap in underlying
 * fixture data […] This is **not** 598 independent surname research projects".
 * What each entity here exists for is written next to it; an entity nothing
 * asserts against would be scenery.
 */
export interface SeededCorpus {
  readonly fixture_id: "surname-set-v1";
  readonly surnames: Readonly<Record<string, string>>;
  readonly forms: Readonly<Record<string, string>>;
}

export async function seedCorpus(db: Kysely<DB>): Promise<SeededCorpus> {
  const surnames: Record<string, string> = {};
  const forms: Record<string, string> = {};

  const surname = async (key: string, display: string): Promise<void> => {
    surnames[key] = (await seedTestSurname(db, { canonical_display: display })).surname_id;
  };

  // --- §9.1 modern anchor forms -------------------------------------------
  await surname("nowak", "Nowak");
  await surname("kowalski", "Kowalski");
  // §4's worked example. `Luczak` is deliberately NOT seeded: the whole point
  // of RES-DIAC-001 is what happens to an input that differs from a stored
  // entity by a diacritic alone.
  await surname("luczak", "Łuczak");
  await surname("gorski", "Górski");
  await surname("cichowski", "Cichowski");
  await surname("wisniewski", "Wiśniewski");
  await surname("kwiatkowski", "Kwiatkowski");

  // --- §9.2 compound / particle -------------------------------------------
  // Hyphenated. ADR-0005's separator map folds every dash-like code point to
  // `-`, so an en dash addresses the same entity; a space does not, and the
  // corpus asserts both directions.
  await surname("nowakKowalska", "Nowak-Kowalska");

  // --- the ambiguity pair --------------------------------------------------
  // Two distinct entities that a single attested variant names. This is the
  // §13 `AMBIGUOUS → SILENT AUTO-RESOLUTION` fixture, and it is the ordinary
  // Polish case rather than an exotic one: a gendered pair.
  await surname("grabowski", "Grabowski");
  await surname("grabowska", "Grabowska");

  // --- §9.3 cross-script ---------------------------------------------------
  // A Cyrillic entity, so that a Latin/Cyrillic confusable input has somewhere
  // it could wrongly land.
  await surname("kovalskyCyrl", "Ковальський");

  const form = async (
    key: string,
    input: Parameters<typeof seedTestNameForm>[1],
  ): Promise<void> => {
    forms[key] = (await seedTestNameForm(db, input)).name_form_id;
  };

  // --- eligible forms: `resolvable_name_forms` admits these ----------------
  await form("novak", {
    form: "Novak",
    surname_id: surnames["nowak"] ?? null,
    form_type: "MODERN_VARIANT",
    attestation_status: "ATTESTED",
  });

  // The ambiguity: one string, two accepted associations.
  await form("grabowskyA", {
    form: "Grabowsky",
    surname_id: surnames["grabowski"] ?? null,
    form_type: "MODERN_VARIANT",
    attestation_status: "ATTESTED",
  });
  await form("grabowskyB", {
    form: "Grabowsky",
    surname_id: surnames["grabowska"] ?? null,
    form_type: "MODERN_VARIANT",
    attestation_status: "ATTESTED",
  });

  // --- ineligible forms: each excluded by the view for a different reason --
  // A search candidate. §13: never usable for automatic resolution.
  await form("kowalskjCandidate", {
    form: "Kowalskj",
    surname_id: surnames["kowalski"] ?? null,
    form_type: "SEARCH_CANDIDATE",
    attestation_status: "GENERATED_CANDIDATE",
  });
  // An OCR-style reading, attested as historical. `HISTORICAL_ATTESTED` is
  // outside the view's form_type list: a historical spelling is evidence about
  // the past, not an address for a modern lookup.
  await form("kowalzkiHistorical", {
    form: "Kowalzki",
    surname_id: surnames["kowalski"] ?? null,
    form_type: "HISTORICAL_ATTESTED",
    attestation_status: "ATTESTED",
  });
  // Contested. Eligible form_type, ineligible attestation.
  await form("cichowskyDisputed", {
    form: "Cichowsky",
    surname_id: surnames["cichowski"] ?? null,
    form_type: "MODERN_VARIANT",
    attestation_status: "DISPUTED",
  });
  // An unaccepted association: the string exists, nothing has decided whose
  // it is.
  await form("nowaczekUnaccepted", {
    form: "Nowaczek",
    surname_id: null,
    form_type: "MODERN_VARIANT",
    attestation_status: "ATTESTED",
  });

  return { fixture_id: "surname-set-v1", surnames, forms };
}
