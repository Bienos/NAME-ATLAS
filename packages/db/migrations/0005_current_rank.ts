import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * `CURRENT_RANK` support — the first derived claim (TASK-009 §7).
 *
 * Two changes, nothing else:
 *
 *   1. `claim_type` gains `CURRENT_RANK` by `ALTER TYPE … ADD VALUE`. That is
 *      the staging pattern migration `0004`'s own header named: "they arrive
 *      by `ALTER TYPE … ADD VALUE` as later tasks emit them — the same
 *      staging migration `0002` used for `entity_type`". No deviation.
 *
 *   2. `evidence_dependencies` (docs/canonical/11 §9.6), so a derived
 *      EvidenceItem records the upstream EvidenceItems it was computed from.
 *      Resolves D-011 in favour of Option A.
 *
 * Why the table exists now and not earlier. §9.6 says it "can be P1 if
 * ClaimEvidence links are sufficient for the first vertical slice", and for
 * TASK-005 they were: `CURRENT_POPULATION` has exactly one input. A rank has
 * two of *different kinds* — the subject surname's own count, and the set it
 * is ranked within — and `docs/canonical/14` §30 names EvidenceDependency as
 * the mechanism for exactly that. `ClaimEvidence` cannot express which input
 * played which role, so `dependency_role` does. That role distinction is the
 * whole reason Option A was chosen over linking both through ClaimEvidence.
 *
 * `evidence_dependency_role` carries the two members a rank needs. Further
 * roles arrive the same staged way — `DENOMINATOR` is the obvious next one,
 * for `RARITY_CONTEXT`, which additionally needs the population denominator
 * TASK-004 left as U-6 with `universe_size` null.
 *
 * ── A PostgreSQL constraint worth knowing, tested not assumed ────────────
 *
 * PostgreSQL 16 permits `ALTER TYPE … ADD VALUE` inside a transaction, and
 * permits a `CREATE TABLE` in the same transaction to reference that type.
 * It does **not** permit *using* the new value in that transaction: an
 * INSERT carrying it fails with `unsafe use of new value`. Kysely runs each
 * migration in a transaction, so a future migration must never add an enum
 * value and seed a row carrying it in one step. This migration only adds the
 * value; the derivation service uses it later, in its own transaction.
 *
 * Deliberately NOT created, their absence being a success condition for
 * TASK-009 (§8): places, digital_assets, name_form_relations,
 * entity_external_ids, research_module_runs, runtime_outbox, and any
 * surface-eligibility table. No `RARITY_CONTEXT` claim type, and no column
 * on `distribution_values` is written — a rank is a claim, never a column
 * (ARCHITECTURE.md §10 invariant 10).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  // --- 1. The claim type (docs/canonical/11 §11) ---------------------------
  await sql`ALTER TYPE claim_type ADD VALUE IF NOT EXISTS 'CURRENT_RANK'`.execute(db);

  // --- 2. EvidenceDependency (docs/canonical/11 §9.6; 14 §30) -------------
  await sql`
    CREATE TYPE evidence_dependency_role AS ENUM ('COUNT', 'UNIVERSE')
  `.execute(db);

  await sql`
    CREATE TABLE evidence_dependencies (
      evidence_dependency_id     uuid PRIMARY KEY,
      derived_evidence_item_id   uuid                     NOT NULL
                                   REFERENCES evidence_items (evidence_item_id),
      depends_on_evidence_item_id uuid                    NOT NULL
                                   REFERENCES evidence_items (evidence_item_id),
      dependency_role            evidence_dependency_role NOT NULL,
      created_at                 timestamptz              NOT NULL DEFAULT now(),
      -- A derived item cannot depend on itself; that is a cycle of length 1
      -- and the cheapest one to forbid outright.
      CONSTRAINT evidence_dependencies_no_self_dependency
        CHECK (derived_evidence_item_id <> depends_on_evidence_item_id)
    )
  `.execute(db);

  // One edge per (derived item, upstream item, role). Re-deriving the same
  // statistic must not accumulate duplicate lineage.
  await sql`
    CREATE UNIQUE INDEX evidence_dependencies_edge_uq
      ON evidence_dependencies
         (derived_evidence_item_id, depends_on_evidence_item_id, dependency_role)
  `.execute(db);
  await sql`
    CREATE INDEX evidence_dependencies_derived_idx
      ON evidence_dependencies (derived_evidence_item_id)
  `.execute(db);
  await sql`
    CREATE INDEX evidence_dependencies_upstream_idx
      ON evidence_dependencies (depends_on_evidence_item_id)
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS evidence_dependencies`.execute(db);
  await sql`DROP TYPE IF EXISTS evidence_dependency_role`.execute(db);
  // PostgreSQL cannot remove a value from an enum. `claim_type` keeps
  // `CURRENT_RANK` after a down migration; that is a property of the engine,
  // not an oversight, and it is harmless because no row will carry it once
  // the claims are gone.
}
