import { sql } from "kysely";
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import type { MixedScriptPolicy, SuggestionOutcome, SurnameResolution } from "@name-atlas/resolver";

/**
 * What a resolution golden case observes.
 *
 * `docs/canonical/17` §11 is explicit that a case tests the outcome, the match
 * type, the decision mode, the resolved ids, the three human-in-the-loop flags,
 * candidate inclusion, candidate exclusion and candidate provenance — and
 * closes with "Do not evaluate only top-1 string". So the observation carries
 * the whole resolution and the whole suggestion outcome, never a projection of
 * them.
 *
 * It also carries an identity snapshot taken **before and after** the case ran.
 * Four of §13's seven P0 hard fails are about something being *persisted* —
 * a search candidate becoming an attested historical form, an OCR candidate
 * being accepted, an unaccepted association quietly gaining a `surname_id`.
 * Those cannot be detected from a return value, only from the table.
 */
export interface NameFormFingerprint {
  readonly name_form_id: string;
  readonly form: string;
  readonly form_type: string;
  readonly attestation_status: string;
  readonly surname_id: string | null;
}

export interface IdentitySnapshot {
  readonly knowledge_entities: number;
  readonly surnames: number;
  readonly name_forms: readonly NameFormFingerprint[];
}

export interface ResolutionObservation {
  readonly resolution: SurnameResolution;
  readonly suggestion: SuggestionOutcome;
  readonly before: IdentitySnapshot;
  readonly after: IdentitySnapshot;
  /**
   * The mixed-script policy the case ran under. `MIXED_SCRIPT_CONFUSABLE_…`
   * means something different under `RESOLVE_FLAGGED`, where resolving a
   * flagged input is the documented behaviour and therefore not silent.
   */
  readonly mixed_script_policy: MixedScriptPolicy;
}

/** Reads the identity tables. Used only by the golden harness. */
export async function snapshotIdentity(db: Kysely<DB>): Promise<IdentitySnapshot> {
  const scalar = async (table: "knowledge_entities" | "surnames"): Promise<number> => {
    const row = await db
      .selectFrom(table)
      .select((eb) => eb.fn.countAll<string>().as("n"))
      .executeTakeFirstOrThrow();
    return Number(row.n);
  };
  const forms = await db
    .selectFrom("name_forms")
    .select(["name_form_id", "form", "form_type", "attestation_status", "surname_id"])
    .orderBy("name_form_id")
    .execute();
  return {
    knowledge_entities: await scalar("knowledge_entities"),
    surnames: await scalar("surnames"),
    name_forms: forms.map((f) => ({
      name_form_id: f.name_form_id,
      form: f.form,
      form_type: String(f.form_type),
      attestation_status: String(f.attestation_status),
      surname_id: f.surname_id,
    })),
  };
}

/**
 * Asserts the database really is reachable and holds the extensions the corpus
 * needs. Called once, so a misconfigured server fails with its own message
 * instead of as a wall of unrelated assertion failures.
 */
export async function assertCorpusPreconditions(db: Kysely<DB>): Promise<void> {
  const row = await sql<{
    trgm: string | null;
  }>`SELECT (SELECT extversion FROM pg_extension WHERE extname = 'pg_trgm') AS trgm`.execute(db);
  if (!row.rows[0]?.trgm) {
    throw new Error("pg_trgm is not installed: the fuzzy candidate cases cannot run");
  }
}
