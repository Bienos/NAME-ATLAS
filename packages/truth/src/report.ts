/**
 * The frozen surname report (TASK-119, M5's first step; `docs/canonical/11`
 * §26, `docs/canonical/23` RPT-001).
 *
 * A report version is an immutable snapshot of what the PAID surface says
 * about a surname: the validated response of the query service, with the
 * coverage, DiscoveryIndex and premium eligibility it was read with, split
 * into `docs/canonical/11` §26.3's sections, each linked to the claims behind
 * it (§26.4). The report consumes the approved claim bundle through the query
 * service, never a source call (`docs/canonical/23` §22). A section with
 * nothing to show says why; nothing is omitted and nothing reads as zero.
 *
 * The only entitlement written is INTERNAL_TEST: an operator builds a report with
 * `pnpm report:build`, for any resolved surname, eligible or not (the owner's
 * decisions of 2026-10-05). Nothing is offered or sold, and the frozen
 * eligibility says whether it could be. While the report is free (TASK-173,
 * D-052), a signed-in reader's full-name report is composed the same way on
 * the FREE surface and never written (`composeReaderReport`).
 *
 * The query service resolves inside its own read-only transaction, which
 * cannot be nested in another, so the reads are bracketed instead: the
 * surname's active claims are read before them and again in the transaction
 * that writes, and a build whose claims changed in between writes nothing.
 *
 * The full-name report (TASK-124, ADR-0041) is the same report for a first
 * name and a surname together: a first-name chapter, `GIVEN_NAME`, before the
 * surname's nine, read from the name's own claims. The two names are never
 * combined into a count of people (ADR-0032 §7, D-033).
 */
import { sql } from "kysely";
import type { Kysely, Transaction } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import type { CitationDto, SurnameResultResponse } from "@name-atlas/contracts";
import { canonicalKey } from "@name-atlas/resolver";
import type { CoverageAssessment } from "./coverage-assessment.js";
import { buildDiscoveryIndex } from "./discovery-index.js";
import type { DiscoveryIndex } from "./discovery-index.js";
import { readBirthNameFacts } from "./given-name-birth-facts.js";
import type { BirthNameFacts } from "./given-name-birth-facts.js";
import { readGivenNameFacts, readGivenNameMeaning } from "./given-name-facts.js";
import type { GivenNameReportFacts } from "./given-name-facts.js";
import { assessPremiumEligibility } from "./premium-eligibility.js";
import type { PremiumEligibility } from "./premium-eligibility.js";
import { querySurnameResult } from "./query.js";

export const REPORT_SCHEMA_VERSION = "report@0";
/**
 * The full-name report's payload: `report@0`'s, plus the first name's facts
 * (TASK-124). `@1` adds the name's origin and meaning (TASK-147); a version
 * frozen under `@0` has none. `@2` adds the name as a first name given to
 * children, every year from 2000 (TASK-159); a version frozen earlier has none.
 */
export const FULL_NAME_REPORT_SCHEMA_VERSION = "full_name_report@2";

/** `docs/canonical/11` §26.3's section types, in the report's order. */
export const REPORT_SECTION_TYPES = [
  "ORIGIN",
  "DISTRIBUTION",
  "TIMELINE",
  "ARCHIVES",
  "VARIANTS",
  "PLACES",
  "MIGRATION",
  "SOURCES",
  "LIMITATIONS",
] as const;
/** The full-name report's sections: the first name's chapter, then the surname's (ADR-0041). */
export const FULL_NAME_SECTION_TYPES = ["GIVEN_NAME", ...REPORT_SECTION_TYPES] as const;
export type ReportSectionType = (typeof FULL_NAME_SECTION_TYPES)[number];

export type PresentationRole = "HERO" | "SUPPORT" | "LIMITATION";

/** The response fields a section presents. */
type ResponseField = "meaning" | "population" | "rarity" | "distribution" | "change" | "archive";

/**
 * Which section presents each claim type, from which response field, and in
 * what role when that field is shown. A claim whose field is not shown (rights,
 * or no approved data) is referenced as a LIMITATION. NOTABLE_BEARERS has no
 * section type in §26.3: famous bearers are free (ADR-0037), and the frozen
 * response carries them.
 */
const CLAIM_PLACEMENT: Readonly<
  Record<string, { section: ReportSectionType; field: ResponseField; role: PresentationRole }>
> = {
  SURNAME_MEANING: { section: "ORIGIN", field: "meaning", role: "HERO" },
  CURRENT_POPULATION: { section: "DISTRIBUTION", field: "population", role: "HERO" },
  CURRENT_RANK: { section: "DISTRIBUTION", field: "rarity", role: "SUPPORT" },
  RARITY_CONTEXT: { section: "DISTRIBUTION", field: "rarity", role: "SUPPORT" },
  CURRENT_DISTRIBUTION: { section: "DISTRIBUTION", field: "distribution", role: "SUPPORT" },
  SURNAME_DISTRIBUTION_SHIFT: { section: "TIMELINE", field: "change", role: "HERO" },
  ARCHIVE_AVAILABILITY: { section: "ARCHIVES", field: "archive", role: "HERO" },
};

/**
 * The first name's claims, all in the GIVEN_NAME chapter: the count leads, the
 * rank, the meaning and the figures as a name given to children support it. A
 * claim the frozen facts do not show is a LIMITATION.
 */
const GIVEN_NAME_ROLES: Readonly<Record<string, PresentationRole>> = {
  GIVEN_NAME_POPULATION: "HERO",
  GIVEN_NAME_RANK: "SUPPORT",
  GIVEN_NAME_MEANING: "SUPPORT",
  GIVEN_NAME_BIRTH_COUNT: "SUPPORT",
  GIVEN_NAME_BIRTH_RANK: "SUPPORT",
  GIVEN_NAME_BIRTH_TREND: "SUPPORT",
};

/** The response fields each section presents. */
const SECTION_FIELDS: Readonly<Record<ReportSectionType, readonly ResponseField[]>> = {
  GIVEN_NAME: [],
  ORIGIN: ["meaning"],
  DISTRIBUTION: ["population", "rarity", "distribution"],
  TIMELINE: ["change"],
  ARCHIVES: ["archive"],
  VARIANTS: [],
  PLACES: [],
  MIGRATION: [],
  SOURCES: [],
  LIMITATIONS: [],
};

/** The coverage dimension that says why a sourceless section is empty. */
const SOURCELESS: Partial<Record<ReportSectionType, string>> = {
  VARIANTS: "VARIANTS",
  PLACES: "HISTORICAL_PLACES",
  MIGRATION: "MIGRATION",
};

export interface ReportClaim {
  readonly claim_id: string;
  readonly claim_type: string;
}

export interface ReportClaimReference {
  readonly claim_id: string;
  readonly presentation_role: PresentationRole;
}

export interface ReportSection {
  readonly section_type: ReportSectionType;
  readonly title_payload: { readonly message_key: string };
  readonly body_payload: Readonly<Record<string, unknown>>;
  readonly section_confidence_summary: Readonly<Record<string, number>>;
  readonly claims: readonly ReportClaimReference[];
}

/**
 * Who a report is composed for, and the surface it is read on (ADR-0001):
 * `INTERNAL_TEST`, an operator's frozen version, on the PAID surface; and
 * `FREE_SIGNED_IN`, a signed-in reader's copy while the report is free
 * (TASK-173, D-052), on the FREE surface, as the baby-names view reads it for
 * a reader who did not buy (D-051). Only `INTERNAL_TEST` is ever stored.
 */
export const REPORT_ENTITLEMENT_SURFACES = {
  INTERNAL_TEST: "PAID",
  FREE_SIGNED_IN: "FREE",
} as const;
export type ReportEntitlement = keyof typeof REPORT_ENTITLEMENT_SURFACES;

/** What a version freezes, beside its sections. */
export interface ReportPayload {
  readonly report_schema_version: string;
  readonly surface: (typeof REPORT_ENTITLEMENT_SURFACES)[ReportEntitlement];
  readonly entitlement_kind: ReportEntitlement;
  readonly response: SurnameResultResponse;
  readonly coverage: CoverageAssessment;
  readonly discovery_index: DiscoveryIndex;
  /** The surname's eligibility under its own policy; a full-name report freezes it too. */
  readonly eligibility: PremiumEligibility;
  /** The first name's facts: a full-name report only. */
  readonly given_name?: GivenNameReportFacts;
}

function shown(response: SurnameResultResponse, field: ResponseField): boolean {
  const state = (response[field] as { state?: string } | null)?.state;
  return state === "READY" || state === "AVAILABLE";
}

/** Every `confidence` under a value, as a status: a string, or an object's `status`. */
function confidences(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const v of value) confidences(v, out);
  } else if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === "confidence") {
        if (typeof v === "string") out.push(v);
        else if (v !== null && typeof v === "object" && "status" in v) {
          out.push(String((v as { status: unknown }).status));
        }
      } else {
        confidences(v, out);
      }
    }
  }
  return out;
}

/** Every distinct citation in the response, by id, in first-seen order. */
function citationsOf(value: unknown, out = new Map<string, unknown>()): Map<string, unknown> {
  if (Array.isArray(value)) {
    for (const v of value) citationsOf(v, out);
  } else if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === "citation" && v !== null && typeof v === "object" && "id" in v) {
        const id = String((v as { id: unknown }).id);
        if (!out.has(id)) out.set(id, v);
      } else {
        citationsOf(v, out);
      }
    }
  }
  return out;
}

/**
 * What a citation cites, apart from its id: two citations with the same key
 * name the same publication, and the bibliography lists it once. Each birth
 * claim has its own citation row of its list (TASK-137), so a name's yearly
 * figures would otherwise list each year's file twice, once per figure.
 */
export function referenceKey(c: CitationDto): string {
  return JSON.stringify([c.title, c.publisher, c.publication_date, c.url, c.locator]);
}

/**
 * The claims and citations a READY births figure shows, in its chapter's
 * order: each sex's years, oldest first, then the sex's trend.
 */
function birthsShown(births: BirthNameFacts | null): {
  readonly claimIds: string[];
  readonly citations: CitationDto[];
} {
  const claimIds: string[] = [];
  const citations: CitationDto[] = [];
  if (births?.state !== "READY") return { claimIds, citations };
  for (const sex of births.sexes) {
    for (const year of sex.history ?? (sex.latest === null ? [] : [sex.latest])) {
      for (const figure of [year.count, year.rank]) {
        if (figure === null) continue;
        claimIds.push(figure.claim_id);
        citations.push(figure.citation);
      }
    }
    if (sex.trend !== null) {
      claimIds.push(sex.trend.claim_id);
      citations.push(...sex.trend.citations);
    }
  }
  return { claimIds, citations };
}

/**
 * A full-name report's bibliography: the first name's sources lead, in its
 * chapter's order (the lists, the lists of names given to children, each
 * publication once, then the works), and the surname's follow.
 */
function fullNameSourceIds(given: GivenNameReportFacts, response: SurnameResultResponse): string[] {
  const ids = [...citationsOf(given.lists).keys()];
  const seen = new Set(ids);
  const references = new Set<string>();
  for (const c of birthsShown(given.births).citations) {
    if (seen.has(c.id) || references.has(referenceKey(c))) continue;
    references.add(referenceKey(c));
    seen.add(c.id);
    ids.push(c.id);
  }
  for (const id of citationsOf([given.meaning, response]).keys()) {
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function countBy(values: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return out;
}

/** A full-name report's gaps about the first name, for LIMITATIONS. */
function givenNameGaps(facts: GivenNameReportFacts): Record<string, unknown>[] {
  return [
    // D-043, D-046: meanings only from a free permission or the public domain,
    // and none of those works explains this name.
    ...(facts.meaning.state === "READY"
      ? []
      : [
          {
            topic: "MEANING",
            reason_code:
              facts.meaning.state === "RIGHTS_BLOCKED" ? "RIGHTS_BLOCKED" : "NO_ADMISSIBLE_SOURCE",
          },
        ]),
    // TASK-159: on no list of names given to children, or not to be shown.
    ...(facts.births === null || facts.births.state === "READY"
      ? []
      : [{ topic: "BIRTHS", reason_code: facts.births.state }]),
    // D-033, ADR-0032 §7: no source pairs first names with surnames.
    { topic: "FULL_NAME_COUNT", reason_code: "NO_SOURCE_PAIRS_NAMES" },
    ...(facts.state === "READY"
      ? facts.lists
          .filter((l) => l.rank === null)
          .map((l) => ({
            topic: "RANK",
            comparability_group: l.comparability_group,
            reason_code: "NO_ACTIVE_CLAIM",
          }))
      : [{ topic: "COUNT", reason_code: facts.state }]),
  ];
}

/**
 * The sections of one report version: a pure function of what is frozen and
 * of the subject's active claims (the surname's, and for a full-name report
 * the first name's too).
 */
export function reportSectionsOf(
  payload: ReportPayload,
  claims: readonly ReportClaim[],
): ReportSection[] {
  const { response, coverage, discovery_index: index, eligibility, given_name: given } = payload;
  const roleOrder: Record<PresentationRole, number> = { HERO: 0, SUPPORT: 1, LIMITATION: 2 };
  const types = given === undefined ? REPORT_SECTION_TYPES : FULL_NAME_SECTION_TYPES;
  const givenShown = new Set([
    ...(given?.lists ?? []).flatMap((l) => [
      l.count.claim_id,
      ...(l.rank === null ? [] : [l.rank.claim_id]),
    ]),
    ...(given?.meaning.state === "READY" ? [given.meaning.claim_id] : []),
    ...birthsShown(given?.births ?? null).claimIds,
  ]);

  return types.map((type): ReportSection => {
    const fields = SECTION_FIELDS[type];
    const refs = claims
      .flatMap((c) => {
        if (type === "GIVEN_NAME") {
          const placed = GIVEN_NAME_ROLES[c.claim_type];
          if (placed === undefined) return [];
          const role: PresentationRole = givenShown.has(c.claim_id) ? placed : "LIMITATION";
          return [{ claim_id: c.claim_id, presentation_role: role, claim_type: c.claim_type }];
        }
        const placed = CLAIM_PLACEMENT[c.claim_type];
        if (placed === undefined || placed.section !== type) return [];
        const role: PresentationRole = shown(response, placed.field) ? placed.role : "LIMITATION";
        return [{ claim_id: c.claim_id, presentation_role: role, claim_type: c.claim_type }];
      })
      .sort(
        (a, b) =>
          roleOrder[a.presentation_role] - roleOrder[b.presentation_role] ||
          a.claim_type.localeCompare(b.claim_type) ||
          a.claim_id.localeCompare(b.claim_id),
      )
      .map(({ claim_id, presentation_role }) => ({ claim_id, presentation_role }));

    let body: Record<string, unknown>;
    let summary: Record<string, number> = {};
    if (type === "GIVEN_NAME" && given !== undefined) {
      body = {
        state: given.state,
        lists: given.lists.map((l) => ({
          comparability_group: l.comparability_group,
          snapshot_date: l.snapshot_date,
          rank: l.rank === null ? "NO_ACTIVE_CLAIM" : "READY",
        })),
        meaning:
          given.meaning.state === "READY"
            ? { state: "READY", works: given.meaning.works.length }
            : { state: given.meaning.state },
        ...(given.births === null
          ? {}
          : {
              births:
                given.births.state === "READY"
                  ? {
                      state: "READY",
                      sexes: given.births.sexes.map((s) => ({
                        sex: s.sex,
                        latest_year: s.latest?.birth_year ?? null,
                        years_on_lists: (s.history ?? []).filter((y) => y.count !== null).length,
                        trend: s.trend?.direction ?? null,
                      })),
                    }
                  : { state: given.births.state },
            }),
      };
      summary = countBy(confidences([given.lists, given.meaning]));
    } else if (fields.length > 0) {
      body = {
        fields,
        states: Object.fromEntries(
          fields.map((f) => [f, (response[f] as { state?: string } | null)?.state ?? null]),
        ),
      };
      summary = countBy(fields.flatMap((f) => confidences(response[f])));
    } else if (type === "SOURCES") {
      body = {
        citation_ids:
          given === undefined
            ? [...citationsOf(response).keys()]
            : fullNameSourceIds(given, response),
      };
    } else if (type === "LIMITATIONS") {
      body = {
        coverage: coverage.dimensions
          .filter((d) => d.availability !== "STRONG")
          .map((d) => ({
            dimension: d.dimension,
            availability: d.availability,
            reason_code: d.reason_code,
          })),
        discovery: index.entries
          .filter((e) => e.eligible_count === 0)
          .map((e) => ({
            category: e.category,
            availability: e.availability_status,
            reason_code: e.reason_code,
          })),
        eligibility: { state: eligibility.state, reason_codes: eligibility.reason_codes },
        ...(given === undefined ? {} : { given_name: givenNameGaps(given) }),
      };
    } else {
      const dimension = coverage.dimensions.find((d) => d.dimension === SOURCELESS[type]);
      body = {
        availability: dimension?.availability ?? "NOT_RETRIEVED",
        reason_code: dimension?.reason_code ?? "NO_SOURCE_YET",
      };
    }

    return {
      section_type: type,
      title_payload: { message_key: `report.section.${type.toLowerCase()}` },
      body_payload: body,
      section_confidence_summary: summary,
      claims: refs,
    };
  });
}

export type BuildReportOutcome =
  | {
      readonly kind: "BUILT";
      readonly report_id: string;
      readonly report_version_id: string;
      readonly version_number: number;
      readonly eligibility: PremiumEligibility;
      readonly sections: readonly ReportSection[];
    }
  | { readonly kind: "NOT_RESOLVED" }
  | { readonly kind: "UNAVAILABLE"; readonly reason: string }
  /** The subject's active claims changed while the build read them; nothing was written. */
  | { readonly kind: "CLAIMS_CHANGED" };

export type BuildFullNameReportOutcome =
  | BuildReportOutcome
  /** No first name with this written form is on the lists. */
  | { readonly kind: "GIVEN_NAME_NOT_FOUND" }
  /** A one-character or abbreviated form, not shown until reviewed (ADR-0032 §4). */
  | { readonly kind: "GIVEN_NAME_UNREVIEWED"; readonly form_review: string };

/** An entity's active claims, in a stable order. */
async function activeClaims(db: Kysely<DB>, entityId: string): Promise<ReportClaim[]> {
  return db
    .selectFrom("claims")
    .select(["claim_id", "claim_type"])
    .where("subject_entity_id", "=", entityId)
    .where("claim_status", "=", "ACTIVE")
    .orderBy("claim_type")
    .orderBy("claim_id")
    .execute();
}

const sameClaims = (a: readonly ReportClaim[], b: readonly ReportClaim[]): boolean =>
  a.length === b.length && a.every((c, i) => c.claim_id === b[i]?.claim_id);

/** The surname's part of a report: what its surface says, and the claims it was read between. */
type SurnamePart =
  | {
      readonly kind: "READ";
      readonly surnameId: string;
      readonly claims: readonly ReportClaim[];
      readonly payload: ReportPayload;
    }
  | Exclude<BuildReportOutcome, { kind: "BUILT" } | { kind: "CLAIMS_CHANGED" }>;

async function readSurnamePart(
  db: Kysely<DB>,
  input: string,
  entitlement: ReportEntitlement = "INTERNAL_TEST",
): Promise<SurnamePart> {
  const surface = REPORT_ENTITLEMENT_SURFACES[entitlement];
  const probe = await querySurnameResult(db, input, { surface });
  if (probe.kind === "UNAVAILABLE") return { kind: "UNAVAILABLE", reason: probe.reason };
  if (probe.kind !== "OK" || probe.response.surname === null) return { kind: "NOT_RESOLVED" };
  const surnameId = probe.response.surname.id;
  const claims = await activeClaims(db, surnameId);

  const read = await querySurnameResult(db, input, { surface });
  if (read.kind === "UNAVAILABLE") return { kind: "UNAVAILABLE", reason: read.reason };
  if (read.kind !== "OK") return { kind: "NOT_RESOLVED" };
  const response = surnameResultResponseSchema.parse(read.response);
  if (response.status !== "RESOLVED" || response.surname?.id !== surnameId) {
    return { kind: "NOT_RESOLVED" };
  }
  const built = await buildDiscoveryIndex(db, input);
  if (built.kind !== "INDEXED") return built;
  const assessed = await assessPremiumEligibility(db, input);
  if (assessed.kind !== "ASSESSED") return assessed;

  return {
    kind: "READ",
    surnameId,
    claims,
    payload: {
      report_schema_version: REPORT_SCHEMA_VERSION,
      surface,
      entitlement_kind: entitlement,
      response,
      coverage: built.coverage,
      discovery_index: built.index,
      eligibility: assessed.eligibility,
    },
  };
}

/** Writes the next version of the subject's report, with its sections and their claims. */
async function writeVersion(
  trx: Transaction<DB>,
  subject: {
    readonly surnameId: string;
    readonly givenNameId: string | null;
    readonly reportType: "NAME_ATLAS" | "FULL_NAME";
  },
  payload: ReportPayload,
  sections: readonly ReportSection[],
): Promise<Extract<BuildReportOutcome, { kind: "BUILT" }>> {
  await trx
    .insertInto("reports")
    .values({
      report_id: uuidv7(),
      surname_id: subject.surnameId,
      given_name_id: subject.givenNameId,
      report_type: subject.reportType,
      entitlement_kind: "INTERNAL_TEST",
      status: "READY",
    })
    .onConflict((oc) => oc.constraint("reports_one_per_subject").doNothing())
    .execute();
  const report = await trx
    .selectFrom("reports")
    .select("report_id")
    .where("surname_id", "=", subject.surnameId)
    .where((eb) =>
      subject.givenNameId === null
        ? eb("given_name_id", "is", null)
        : eb("given_name_id", "=", subject.givenNameId),
    )
    .where("report_type", "=", subject.reportType)
    .where("entitlement_kind", "=", "INTERNAL_TEST")
    .forUpdate()
    .executeTakeFirstOrThrow();
  const last = await trx
    .selectFrom("report_versions")
    .select(sql<number>`coalesce(max(version_number), 0)`.as("n"))
    .where("report_id", "=", report.report_id)
    .executeTakeFirstOrThrow();
  const versionNumber = Number(last.n) + 1;

  const reportVersionId = uuidv7();
  await trx
    .insertInto("report_versions")
    .values({
      report_version_id: reportVersionId,
      report_id: report.report_id,
      version_number: versionNumber,
      report_schema_version: payload.report_schema_version,
      coverage_assessment_version: payload.coverage.assessment_version,
      discovery_index_version: payload.discovery_index.generation_version,
      eligibility_policy_version: payload.eligibility.policy_version,
      eligibility_state: payload.eligibility.state,
      rendered_payload: JSON.stringify(payload),
    })
    .execute();

  for (const [i, section] of sections.entries()) {
    const sectionId = uuidv7();
    await trx
      .insertInto("report_sections")
      .values({
        report_section_id: sectionId,
        report_version_id: reportVersionId,
        section_type: section.section_type,
        sequence_number: i + 1,
        title_payload: JSON.stringify(section.title_payload),
        body_payload: JSON.stringify(section.body_payload),
        section_confidence_summary: JSON.stringify(section.section_confidence_summary),
      })
      .execute();
    if (section.claims.length > 0) {
      await trx
        .insertInto("report_claim_references")
        .values(
          section.claims.map((c, j) => ({
            report_section_id: sectionId,
            claim_id: c.claim_id,
            presentation_role: c.presentation_role,
            sequence: j + 1,
          })),
        )
        .execute();
    }
  }

  return {
    kind: "BUILT",
    report_id: report.report_id,
    report_version_id: reportVersionId,
    version_number: versionNumber,
    eligibility: payload.eligibility,
    sections,
  };
}

/**
 * Freezes the surname's report as its next version, under the INTERNAL_TEST
 * entitlement. The response, coverage, index and eligibility are read between
 * two reads of the surname's active claims; the second is in the transaction
 * that writes, which writes nothing when the two differ.
 */
export async function buildReport(db: Kysely<DB>, input: string): Promise<BuildReportOutcome> {
  const part = await readSurnamePart(db, input);
  if (part.kind !== "READ") return part;
  const sections = reportSectionsOf(part.payload, part.claims);

  return db.transaction().execute(async (trx): Promise<BuildReportOutcome> => {
    if (!sameClaims(part.claims, await activeClaims(trx, part.surnameId))) {
      return { kind: "CLAIMS_CHANGED" };
    }
    return writeVersion(
      trx,
      { surnameId: part.surnameId, givenNameId: null, reportType: "NAME_ATLAS" },
      part.payload,
      sections,
    );
  });
}

/** A full-name report composed and not yet written: what both names say, and their claims. */
type FullNameComposition =
  | {
      readonly kind: "COMPOSED";
      readonly surnameId: string;
      readonly givenNameId: string;
      readonly surnameClaims: readonly ReportClaim[];
      readonly givenClaims: readonly ReportClaim[];
      readonly payload: ReportPayload;
      readonly sections: readonly ReportSection[];
    }
  | Exclude<BuildFullNameReportOutcome, { kind: "BUILT" } | { kind: "CLAIMS_CHANGED" }>;

/**
 * The full-name report for a first name and a surname, read and not written:
 * the surname's part exactly as {@link buildReport} reads it, and the first
 * name's facts from its own claims, both on the entitlement's surface.
 */
async function composeFullNameReport(
  db: Kysely<DB>,
  input: { readonly givenName: string; readonly surname: string },
  entitlement: ReportEntitlement,
): Promise<FullNameComposition> {
  const surface = REPORT_ENTITLEMENT_SURFACES[entitlement];
  const name = await db
    .selectFrom("given_names")
    .select(["given_name_id", "canonical_display", "form_review"])
    .where("canonical_key", "=", canonicalKey(input.givenName))
    .executeTakeFirst();
  if (name === undefined) return { kind: "GIVEN_NAME_NOT_FOUND" };
  if (name.form_review !== null) {
    return { kind: "GIVEN_NAME_UNREVIEWED", form_review: name.form_review };
  }
  const givenClaims = await activeClaims(db, name.given_name_id);
  const subject = { id: name.given_name_id, display_name: name.canonical_display };
  const given: GivenNameReportFacts = {
    ...(await readGivenNameFacts(db, subject, surface)),
    meaning: await readGivenNameMeaning(db, name.given_name_id, surface),
    // D-044 as ADR-0037 records it: every tier from 28,99 zł holds the baby-names figures.
    births: await readBirthNameFacts(db, subject, { surface, history: true }),
  };

  const part = await readSurnamePart(db, input.surname, entitlement);
  if (part.kind !== "READ") return part;
  const payload: ReportPayload = {
    ...part.payload,
    report_schema_version: FULL_NAME_REPORT_SCHEMA_VERSION,
    given_name: given,
  };
  return {
    kind: "COMPOSED",
    surnameId: part.surnameId,
    givenNameId: name.given_name_id,
    surnameClaims: part.claims,
    givenClaims,
    payload,
    sections: reportSectionsOf(payload, [...givenClaims, ...part.claims]),
  };
}

/** Whether both names' active claims are still the ones the composition was read between. */
async function claimsUnchanged(
  db: Kysely<DB>,
  c: Extract<FullNameComposition, { kind: "COMPOSED" }>,
): Promise<boolean> {
  return (
    sameClaims(c.surnameClaims, await activeClaims(db, c.surnameId)) &&
    sameClaims(c.givenClaims, await activeClaims(db, c.givenNameId))
  );
}

/**
 * Freezes the full-name report for a first name and a surname as its next
 * version (TASK-124, ADR-0041): the surname's part exactly as
 * {@link buildReport} reads it, and the first name's facts from its own
 * claims, on the PAID surface. Both names' claims are read before and again
 * in the transaction that writes. A first name not on the lists, or one held
 * for review, writes nothing.
 */
export async function buildFullNameReport(
  db: Kysely<DB>,
  input: { readonly givenName: string; readonly surname: string },
): Promise<BuildFullNameReportOutcome> {
  const composed = await composeFullNameReport(db, input, "INTERNAL_TEST");
  if (composed.kind !== "COMPOSED") return composed;

  return db.transaction().execute(async (trx): Promise<BuildFullNameReportOutcome> => {
    if (!(await claimsUnchanged(trx, composed))) return { kind: "CLAIMS_CHANGED" };
    return writeVersion(
      trx,
      {
        surnameId: composed.surnameId,
        givenNameId: composed.givenNameId,
        reportType: "FULL_NAME",
      },
      composed.payload,
      composed.sections,
    );
  });
}

export type ComposeReaderReportOutcome =
  | { readonly kind: "COMPOSED"; readonly version: StoredReportVersion }
  | Exclude<BuildFullNameReportOutcome, { kind: "BUILT" }>;

/**
 * A signed-in reader's full-name report while it is free (TASK-173, D-052):
 * composed as {@link buildFullNameReport} composes it, but on the FREE
 * surface, and never written. It comes back in a stored version's shape, as
 * the database would return it, so the preview's parser and the PDF read it
 * as they read a frozen one. It has no id and its version number is 0: there
 * is no version to come back to. Both names' claims are read again after the
 * reads; when they changed, nothing is returned.
 */
export async function composeReaderReport(
  db: Kysely<DB>,
  input: { readonly givenName: string; readonly surname: string },
  now: Date = new Date(),
): Promise<ComposeReaderReportOutcome> {
  const composed = await composeFullNameReport(db, input, "FREE_SIGNED_IN");
  if (composed.kind !== "COMPOSED") return composed;
  if (!(await claimsUnchanged(db, composed))) return { kind: "CLAIMS_CHANGED" };
  return {
    kind: "COMPOSED",
    version: {
      report_version_id: "",
      report_type: "FULL_NAME",
      version_number: 0,
      report_schema_version: composed.payload.report_schema_version,
      eligibility_state: composed.payload.eligibility.state,
      generated_at: `${now.toISOString().slice(0, 19)}Z`,
      // Through JSON, as `rendered_payload` comes back from the database.
      payload: JSON.parse(JSON.stringify(composed.payload)) as unknown,
      sections: composed.sections.map((section, i) => ({
        section_type: section.section_type,
        sequence_number: i + 1,
        title_payload: JSON.parse(JSON.stringify(section.title_payload)) as unknown,
        body_payload: JSON.parse(JSON.stringify(section.body_payload)) as unknown,
        section_confidence_summary: JSON.parse(
          JSON.stringify(section.section_confidence_summary),
        ) as unknown,
        claims: section.claims,
      })),
    },
  };
}

/** A stored version as written: its frozen payload is returned unparsed. */
export interface StoredReportVersion {
  readonly report_version_id: string;
  /** `NAME_ATLAS`, the surname report, or `FULL_NAME` (TASK-124). */
  readonly report_type: string;
  readonly version_number: number;
  readonly report_schema_version: string;
  readonly eligibility_state: string;
  readonly generated_at: string;
  readonly payload: unknown;
  readonly sections: readonly {
    readonly section_type: string;
    readonly sequence_number: number;
    readonly title_payload: unknown;
    readonly body_payload: unknown;
    readonly section_confidence_summary: unknown;
    readonly claims: readonly ReportClaimReference[];
  }[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

/** Whether a string could be a report version's id: a lower-case UUID. */
export function isReportVersionId(value: string): boolean {
  return UUID.test(value);
}

/**
 * Reads one stored version with its sections, in order, and the claims behind
 * each (TASK-120). Read-only. Null when the id is not a UUID or no version has
 * it. The caller validates the payload before it renders anything from it.
 */
export async function readReportVersion(
  db: Kysely<DB>,
  reportVersionId: string,
): Promise<StoredReportVersion | null> {
  if (!isReportVersionId(reportVersionId)) return null;
  const version = await db
    .selectFrom("report_versions as v")
    .innerJoin("reports as r", "r.report_id", "v.report_id")
    .select([
      "v.report_version_id",
      "r.report_type",
      "v.version_number",
      "v.report_schema_version",
      "v.eligibility_state",
      sql<string>`to_char(v.generated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`.as(
        "generated_at",
      ),
      "v.rendered_payload",
    ])
    .where("v.report_version_id", "=", reportVersionId)
    .executeTakeFirst();
  if (version === undefined) return null;

  const sections = await db
    .selectFrom("report_sections")
    .select([
      "report_section_id",
      "section_type",
      "sequence_number",
      "title_payload",
      "body_payload",
      "section_confidence_summary",
    ])
    .where("report_version_id", "=", reportVersionId)
    .orderBy("sequence_number")
    .execute();
  const refs =
    sections.length === 0
      ? []
      : await db
          .selectFrom("report_claim_references")
          .select(["report_section_id", "claim_id", "presentation_role", "sequence"])
          .where(
            "report_section_id",
            "in",
            sections.map((s) => s.report_section_id),
          )
          .orderBy("report_section_id")
          .orderBy("sequence")
          .execute();

  return {
    report_version_id: version.report_version_id,
    report_type: version.report_type,
    version_number: version.version_number,
    report_schema_version: version.report_schema_version,
    eligibility_state: version.eligibility_state,
    generated_at: version.generated_at,
    payload: version.rendered_payload,
    sections: sections.map((s) => ({
      section_type: s.section_type,
      sequence_number: s.sequence_number,
      title_payload: s.title_payload,
      body_payload: s.body_payload,
      section_confidence_summary: s.section_confidence_summary,
      claims: refs
        .filter((r) => r.report_section_id === s.report_section_id)
        .map((r) => ({
          claim_id: r.claim_id,
          presentation_role: r.presentation_role as PresentationRole,
        })),
    })),
  };
}
