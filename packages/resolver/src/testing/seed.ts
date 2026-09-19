/**
 * Test-only seeding for resolver tests (TASK-003 §4 item 10, §7.4).
 *
 * This is the only code in the package that writes to the database, and it
 * is deliberately unreachable from the lookup path: it lives under a
 * separate package entry (`@name-atlas/resolver/testing`) and
 * `import-boundary.test.ts` proves `lookup.ts` never imports it.
 *
 * Every record seeded here is SYNTHETIC. It exercises resolver mechanics
 * and must never be presented as PESEL or any other source evidence.
 * Production data enters through TASK-004's importer, not through this.
 */
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import { canonicalKey, toNfc } from "../normalize.js";
import { detectScripts } from "../script.js";
import { CANONICAL_KEY_VERSION, NORMALIZATION_VERSION } from "../version.js";

type SurnameStatus = DB["surnames"]["entity_status"];
type NameFormType = DB["name_forms"]["form_type"];
type AttestationStatus = DB["name_forms"]["attestation_status"];

export interface SeedSurnameInput {
  /** Stored as given (after NFC); the canonical key is derived from it. */
  readonly canonical_display: string;
  readonly entity_status?: SurnameStatus;
  /** ISO 15924; defaults to the display form's detected primary script. */
  readonly primary_script?: string;
}

export interface SeededSurname {
  readonly surname_id: string;
  readonly canonical_key: string;
}

/** Inserts a knowledge entity and a surname. Synthetic data only. */
export async function seedTestSurname(
  db: Kysely<DB>,
  input: SeedSurnameInput,
): Promise<SeededSurname> {
  const surname_id = uuidv7();
  const display = toNfc(input.canonical_display);
  const canonical_key = canonicalKey(display);

  await db
    .insertInto("knowledge_entities")
    .values({
      entity_id: surname_id,
      entity_type: "SURNAME",
      scope: "SURNAME_LEVEL",
      privacy_class: "PUBLIC",
      lifecycle_status: "ACTIVE",
    })
    .execute();

  await db
    .insertInto("surnames")
    .values({
      surname_id,
      canonical_display: display,
      canonical_key,
      canonical_key_version: CANONICAL_KEY_VERSION,
      primary_script: input.primary_script ?? detectScripts(display).primary_script,
      primary_locale: null,
      entity_status: input.entity_status ?? "ACTIVE",
      merged_into_surname_id: null,
    })
    .execute();

  return { surname_id, canonical_key };
}

export interface SeedNameFormInput {
  /** Stored exactly (after NFC); the search key is derived from it. */
  readonly form: string;
  /** `null` models a form whose association is not yet accepted. */
  readonly surname_id: string | null;
  readonly form_type: NameFormType;
  readonly attestation_status: AttestationStatus;
  /** ISO 15924; defaults to the form's detected primary script. */
  readonly script?: string;
  readonly language_code?: string | null;
}

export interface SeededNameForm {
  readonly name_form_id: string;
  readonly search_key: string;
}

/** Inserts a knowledge entity and a name form. Synthetic data only. */
export async function seedTestNameForm(
  db: Kysely<DB>,
  input: SeedNameFormInput,
): Promise<SeededNameForm> {
  const name_form_id = uuidv7();
  const nfc = toNfc(input.form);
  const search_key = canonicalKey(nfc);

  await db
    .insertInto("knowledge_entities")
    .values({
      entity_id: name_form_id,
      entity_type: "NAME_FORM",
      scope: "SURNAME_LEVEL",
      privacy_class: "PUBLIC",
      lifecycle_status: "ACTIVE",
    })
    .execute();

  await db
    .insertInto("name_forms")
    .values({
      name_form_id,
      surname_id: input.surname_id,
      form: nfc,
      unicode_nfc: nfc,
      search_key,
      normalization_version: NORMALIZATION_VERSION,
      script: input.script ?? detectScripts(nfc).primary_script,
      language_code: input.language_code ?? null,
      form_type: input.form_type,
      attestation_status: input.attestation_status,
    })
    .execute();

  return { name_form_id, search_key };
}

/** Row counts of the three identity tables — for zero-write assertions. */
export interface IdentityRowCounts {
  readonly knowledge_entities: number;
  readonly surnames: number;
  readonly name_forms: number;
}

export async function countIdentityRows(db: Kysely<DB>): Promise<IdentityRowCounts> {
  const count = async (table: "knowledge_entities" | "surnames" | "name_forms") => {
    const row = await db
      .selectFrom(table)
      .select((eb) => eb.fn.countAll<string>().as("n"))
      .executeTakeFirstOrThrow();
    return Number(row.n);
  };
  return {
    knowledge_entities: await count("knowledge_entities"),
    surnames: await count("surnames"),
    name_forms: await count("name_forms"),
  };
}
