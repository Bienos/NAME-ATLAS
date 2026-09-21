/**
 * The golden case schema (`docs/canonical/17` §5, §6, §7).
 *
 * §5 recommends YAML. This corpus is TypeScript, for three reasons recorded in
 * `tasks/026-golden-test-corpus.md` §5 and in this package's README: no YAML
 * parser is a dependency; §6's ten required metadata fields become a compile
 * error rather than a runtime schema check somebody has to remember to run; and
 * §4's `forbidden` list only protects semantics if each entry **executes**,
 * which a string in a YAML array cannot.
 *
 * The field names, nesting and vocabulary of §5 are preserved exactly, so a
 * later YAML loader is a parser over this shape and not a redesign.
 */

/** The QA layers this package covers. §17 names twelve; these two are built. */
export type Domain = "RESOLUTION" | "RIGHTS";

/** §5's `market`. One market exists. */
export type Market = "PL";

/** §7's four case types. Every case states which it is, so §8's "these overlap
 * in underlying fixture data" stays visible and no case pretends to be
 * source-backed when it is engineered. */
export type CaseType =
  /** §7.1 — a real source record, cited. */
  | "REAL_SOURCE_BACKED"
  /** §7.2 — an invented string or entity. Never presented as a real surname. */
  | "SYNTHETIC"
  /** §7.3 — a real spelling with a deliberate edit applied. */
  | "MUTATED_REAL_STRING"
  /** §7.4 — a simulated failure (outage, malformed input, rights withdrawal). */
  | "FAILURE_SIMULATION";

/** §5's `blocking_level`. `P0` blocks release (§13, §21). */
export type BlockingLevel = "P0" | "P1";

export type ReviewRole = "ENGINEERING" | "LEGAL" | "DOMAIN_EXPERT";

/** §5's `fixtures` block. */
export interface FixtureRefs {
  /** The seeded entity set a resolution case runs against. */
  readonly canonical_fixture_id: string;
  /** Source fixtures the case depends on; empty where it needs none. */
  readonly source_fixture_ids: readonly string[];
}

export interface ReviewRecord {
  readonly required_role: ReviewRole;
  /** ISO date, or `null` when unreviewed. §6: never overwrite silently. */
  readonly reviewed_at: string | null;
  readonly reviewed_by: string | null;
}

/**
 * §6's required metadata, in full. Every field is required — that is the whole
 * value of expressing the schema as a type. A case that forgets
 * `linked_requirements` does not compile, so the corpus cannot drift into a
 * pile of cases nobody can trace to a clause.
 */
export interface CaseMetadata {
  readonly case_id: string;
  readonly case_version: number;
  readonly domain: Domain;
  readonly category: string;
  readonly market: Market;
  readonly case_type: CaseType;
  readonly fixtures: FixtureRefs;
  readonly blocking_level: BlockingLevel;
  readonly created_at: string;
  readonly created_by: string;
  readonly review: ReviewRecord;
  /**
   * The clauses this case exists to protect — canonical sections, ADRs, task
   * acceptance criteria. Non-empty by convention and asserted by
   * `registry.test.ts`: a case that protects nothing named is a case whose
   * failure nobody can interpret.
   */
  readonly linked_requirements: readonly string[];
  readonly linked_issues: readonly string[];
  readonly notes: string;
}
