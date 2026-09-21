import type { SurnameResultResponse } from "@name-atlas/contracts";

/**
 * SEO indexability (ADR-0009 §5; `docs/canonical/21` §17, §40–§43).
 *
 * `docs/canonical/21` §42's P0 policy, `seo-pl-surname@1.0`, applied as
 * written, and gated behind `SEO_INDEXING_ENABLED` because this is an alpha:
 * the directive's §52 asks for a controlled pilot, not a switch flipped for
 * every surname at once. The function is pure so the rule is testable without
 * a request.
 *
 * What it does **not** do: decide anything from the surname itself. A page's
 * indexability comes from what its validated payload can publish, and from
 * nothing else.
 */

export type Indexability = "INDEX" | "NOINDEX" | "BLOCKED" | "NOT_PUBLISHED";

/** §41's substantive value families. `HISTORY` has no producer yet. */
export type ValueFamily = "CURRENT_STATS" | "GEOGRAPHY" | "ONOMASTICS" | "HISTORY";

export interface IndexabilityAssessment {
  readonly indexability: Indexability;
  readonly reason_code: string;
  readonly families: readonly ValueFamily[];
  readonly citations: number;
  readonly policy: "seo-pl-surname@1.0";
}

export const SEO_INDEXING_FLAG = "SEO_INDEXING_ENABLED";

export function indexingEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[SEO_INDEXING_FLAG] === "true";
}

/** The families a payload can publish on the surface it was evaluated for. */
export function publishableFamilies(response: SurnameResultResponse): readonly ValueFamily[] {
  const families: ValueFamily[] = [];
  // A section counts only when its own surface decision is ALLOWED.
  // CONDITIONAL is §6.3's "legal review" row — a value showable subject to a
  // condition nobody has discharged — and publishing it to a search index is
  // not that condition being met (caught by review 2026-09-21).
  if (
    response.population?.state === "READY" &&
    response.population.surface.decision === "ALLOWED"
  ) {
    families.push("CURRENT_STATS");
  }
  if (
    response.distribution?.state === "READY" &&
    response.distribution.surface.decision === "ALLOWED" &&
    response.distribution.entries.some((e) => e.coverage_state === "READY")
  ) {
    families.push("GEOGRAPHY");
  }
  if (response.meaning?.state === "AVAILABLE" && response.meaning.surface.decision === "ALLOWED") {
    families.push("ONOMASTICS");
  }
  return families;
}

/** Distinct citations on the page — §42 wants at least two. */
export function distinctCitations(response: SurnameResultResponse): number {
  const ids = new Set<string>();
  for (const o of response.population?.observations ?? []) ids.add(o.citation.id);
  for (const e of response.rarity?.entries ?? []) ids.add(e.citation.id);
  for (const e of response.distribution?.entries ?? []) ids.add(e.citation.id);
  for (const i of response.meaning?.interpretations ?? []) {
    ids.add(`${i.work.author_or_publisher}|${i.work.title}|${String(i.work.year)}`);
  }
  return ids.size;
}

export interface IndexabilityOptions {
  /** `SEO_INDEXING_ENABLED`. The alpha gate (ADR-0009 §5). */
  readonly enabled: boolean;
  /**
   * `docs/canonical/21` §40's `privacy = pass` gate.
   *
   * The surname's `knowledge_entities.privacy_class` is `PUBLIC`. Supplied by
   * the caller rather than read from the payload because the contract does not
   * carry it, and adding it would be a schema change for a value no consumer
   * needs. `false` is the safe default for a caller that cannot tell.
   */
  readonly privacyPublic: boolean;
  /**
   * Whether the **SEO surface** is allowed for this surname's evidence.
   *
   * `docs/canonical/21` §40 requires *both* the public and the SEO surface to
   * be allowed, and they are different evaluations: a payload queried on `FREE`
   * carries the free decision and says nothing about SEO. Nothing projects the
   * SEO surface yet, so the page passes `false` and the answer is `NOINDEX` —
   * which is correct, not a placeholder. A caller able to evaluate
   * `evaluateSurface(rights, "SEO")` passes the real value.
   */
  readonly seoSurfaceAllowed: boolean;
}

export function assessIndexability(
  response: SurnameResultResponse,
  options: IndexabilityOptions,
): IndexabilityAssessment {
  const policy = "seo-pl-surname@1.0" as const;
  const families = publishableFamilies(response);
  const citations = distinctCitations(response);

  // §40 hard gates that this payload can express: an active canonical
  // surname, and the public surface allowed for the stats family. The
  // remaining gates (privacy, QA, duplicate resolution) have no producer yet
  // and so cannot pass; they are why the flag exists.
  if (response.status !== "RESOLVED" || response.surname === null) {
    return {
      indexability: "NOT_PUBLISHED",
      reason_code: "NOT_RESOLVED",
      families,
      citations,
      policy,
    };
  }
  if (response.population?.state === "RIGHTS_BLOCKED") {
    return { indexability: "BLOCKED", reason_code: "RIGHTS_BLOCKED", families, citations, policy };
  }
  if (!options.enabled) {
    return {
      indexability: "NOINDEX",
      reason_code: "INDEXING_DISABLED",
      families,
      citations,
      policy,
    };
  }
  if (!options.privacyPublic) {
    // §40: privacy = pass. A non-public entity is not published, whatever its
    // rights say — the two dimensions are independent (ARCHITECTURE.md §10
    // invariant 2) and this is the privacy one.
    return {
      indexability: "BLOCKED",
      reason_code: "PRIVACY_NOT_PUBLIC",
      families,
      citations,
      policy,
    };
  }
  if (!options.seoSurfaceAllowed) {
    // §40's second hard gate.
    return {
      indexability: "NOINDEX",
      reason_code: "SEO_SURFACE_NOT_ALLOWED",
      families,
      citations,
      policy,
    };
  }
  if (families.length === 0) {
    return {
      indexability: "NOINDEX",
      reason_code: "NO_PUBLISHABLE_FAMILY",
      families,
      citations,
      policy,
    };
  }
  if (families.length < 2) {
    // §43: CURRENT_STATS alone is PUBLISHED_NOINDEX.
    return {
      indexability: "NOINDEX",
      reason_code: "SINGLE_VALUE_FAMILY",
      families,
      citations,
      policy,
    };
  }
  if (citations < 2) {
    return {
      indexability: "NOINDEX",
      reason_code: "FEWER_THAN_TWO_CITATIONS",
      families,
      citations,
      policy,
    };
  }
  return { indexability: "INDEX", reason_code: "POLICY_SATISFIED", families, citations, policy };
}
