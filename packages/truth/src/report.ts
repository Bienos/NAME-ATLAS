/**
 * The frozen surname report (TASK-118, M5's first step; `docs/canonical/11`
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
 * The only entitlement is INTERNAL_TEST: an operator builds a report with
 * `pnpm report:build`, for any resolved surname, eligible or not (the owner's
 * decisions of 2026-10-05). Nothing is offered or sold, and the frozen
 * eligibility says whether it could be.
 *
 * The query service resolves inside its own read-only transaction, which
 * cannot be nested in another, so the reads are bracketed instead: the
 * surname's active claims are read before them and again in the transaction
 * that writes, and a build whose claims changed in between writes nothing.
 */
import { sql } from "kysely";
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import type { CoverageAssessment } from "./coverage-assessment.js";
import { buildDiscoveryIndex } from "./discovery-index.js";
import type { DiscoveryIndex } from "./discovery-index.js";
import { assessPremiumEligibility } from "./premium-eligibility.js";
import type { PremiumEligibility } from "./premium-eligibility.js";
import { querySurnameResult } from "./query.js";

export const REPORT_SCHEMA_VERSION = "report@0";

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
export type ReportSectionType = (typeof REPORT_SECTION_TYPES)[number];

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

/** The response fields each section presents. */
const SECTION_FIELDS: Readonly<Record<ReportSectionType, readonly ResponseField[]>> = {
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

/** What a version freezes, beside its sections. */
export interface ReportPayload {
  readonly report_schema_version: string;
  readonly surface: "PAID";
  readonly entitlement_kind: "INTERNAL_TEST";
  readonly response: SurnameResultResponse;
  readonly coverage: CoverageAssessment;
  readonly discovery_index: DiscoveryIndex;
  readonly eligibility: PremiumEligibility;
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

function countBy(values: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return out;
}

/**
 * The sections of one report version: a pure function of what is frozen and
 * of the surname's active claims.
 */
export function reportSectionsOf(
  payload: ReportPayload,
  claims: readonly ReportClaim[],
): ReportSection[] {
  const { response, coverage, discovery_index: index, eligibility } = payload;
  const roleOrder: Record<PresentationRole, number> = { HERO: 0, SUPPORT: 1, LIMITATION: 2 };

  return REPORT_SECTION_TYPES.map((type): ReportSection => {
    const fields = SECTION_FIELDS[type];
    const refs = claims
      .flatMap((c) => {
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
    if (fields.length > 0) {
      body = {
        fields,
        states: Object.fromEntries(
          fields.map((f) => [f, (response[f] as { state?: string } | null)?.state ?? null]),
        ),
      };
      summary = countBy(fields.flatMap((f) => confidences(response[f])));
    } else if (type === "SOURCES") {
      body = { citation_ids: [...citationsOf(response).keys()] };
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
  /** The surname's active claims changed while the build read them; nothing was written. */
  | { readonly kind: "CLAIMS_CHANGED" };

/** The surname's active claims, in a stable order. */
async function activeClaims(db: Kysely<DB>, surnameId: string): Promise<ReportClaim[]> {
  return db
    .selectFrom("claims")
    .select(["claim_id", "claim_type"])
    .where("subject_entity_id", "=", surnameId)
    .where("claim_status", "=", "ACTIVE")
    .orderBy("claim_type")
    .orderBy("claim_id")
    .execute();
}

const sameClaims = (a: readonly ReportClaim[], b: readonly ReportClaim[]): boolean =>
  a.length === b.length && a.every((c, i) => c.claim_id === b[i]?.claim_id);

/**
 * Freezes the surname's report as its next version, under the INTERNAL_TEST
 * entitlement. The response, coverage, index and eligibility are read between
 * two reads of the surname's active claims; the second is in the transaction
 * that writes, which writes nothing when the two differ.
 */
export async function buildReport(db: Kysely<DB>, input: string): Promise<BuildReportOutcome> {
  const probe = await querySurnameResult(db, input, { surface: "PAID" });
  if (probe.kind === "UNAVAILABLE") return { kind: "UNAVAILABLE", reason: probe.reason };
  if (probe.kind !== "OK" || probe.response.surname === null) return { kind: "NOT_RESOLVED" };
  const surnameId = probe.response.surname.id;
  const claims = await activeClaims(db, surnameId);

  const paid = await querySurnameResult(db, input, { surface: "PAID" });
  if (paid.kind === "UNAVAILABLE") return { kind: "UNAVAILABLE", reason: paid.reason };
  if (paid.kind !== "OK") return { kind: "NOT_RESOLVED" };
  const response = surnameResultResponseSchema.parse(paid.response);
  if (response.status !== "RESOLVED" || response.surname?.id !== surnameId) {
    return { kind: "NOT_RESOLVED" };
  }
  const built = await buildDiscoveryIndex(db, input);
  if (built.kind !== "INDEXED") return built;
  const assessed = await assessPremiumEligibility(db, input);
  if (assessed.kind !== "ASSESSED") return assessed;

  const payload: ReportPayload = {
    report_schema_version: REPORT_SCHEMA_VERSION,
    surface: "PAID",
    entitlement_kind: "INTERNAL_TEST",
    response,
    coverage: built.coverage,
    discovery_index: built.index,
    eligibility: assessed.eligibility,
  };
  const sections = reportSectionsOf(payload, claims);

  return db.transaction().execute(async (trx): Promise<BuildReportOutcome> => {
    if (!sameClaims(claims, await activeClaims(trx, surnameId))) {
      return { kind: "CLAIMS_CHANGED" };
    }

    await trx
      .insertInto("reports")
      .values({
        report_id: uuidv7(),
        surname_id: surnameId,
        report_type: "NAME_ATLAS",
        entitlement_kind: "INTERNAL_TEST",
        status: "READY",
      })
      .onConflict((oc) => oc.columns(["surname_id", "report_type", "entitlement_kind"]).doNothing())
      .execute();
    const report = await trx
      .selectFrom("reports")
      .select("report_id")
      .where("surname_id", "=", surnameId)
      .where("report_type", "=", "NAME_ATLAS")
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
        report_schema_version: REPORT_SCHEMA_VERSION,
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
  });
}
