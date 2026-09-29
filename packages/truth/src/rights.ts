/**
 * Surface eligibility (`ARCHITECTURE.md` §5; `docs/canonical/12` §6.3, §6.4).
 *
 * Rights are a **surface** dimension, orthogonal to truth. Nothing in this
 * module reads a claim, an evidence item or a confidence status, and nothing
 * in `confidence.ts` reads a rights profile. That separation is the point:
 * `ARCHITECTURE.md` §10 invariant 2 says a rights restriction never lowers a
 * confidence status and a permissive licence never raises one.
 *
 * Eligibility is **computed, not stored**. A persisted
 * `SurfaceEligibilityAssessment` is `docs/canonical/14`'s unratified proposal
 * 14-I and is deliberately not built (TASK-005 §8).
 */

/** Rights dimensions this evaluation reads (`docs/canonical/11` §9.4). */
export interface EffectiveRights {
  readonly automated_access: string;
  readonly commercial_use: string;
  readonly redistribution: string;
  readonly metadata_rights: string;
  readonly review_status: string;
}

/** The surfaces `docs/canonical/12` §6.3's matrix distinguishes. */
export type Surface = "INTERNAL" | "FREE" | "PAID" | "SEO";

export type SurfaceDecision = "ALLOWED" | "CONDITIONAL" | "BLOCKED";

export interface SurfaceEligibility {
  readonly surface: Surface;
  readonly decision: SurfaceDecision;
  /** Machine-readable reason. Never consumer copy. */
  readonly reason_code: string;
}

export const SURFACES: readonly Surface[] = ["INTERNAL", "FREE", "PAID", "SEO"];

/**
 * Evaluates one surface against the effective rights profile.
 *
 * The hard gates are `docs/canonical/12` §6.4:
 *
 *   automated_access == PROHIBITED  → no automated production connector
 *   commercial_use in {UNKNOWN, PROHIBITED} → paid_surface_eligible = false
 *
 * and the row-by-row consequences are §6.3's decision matrix. For the PESEL
 * profile TASK-004 seeded (`commercial_use = UNKNOWN`) this yields the
 * "commercial permission unknown" row: paid and SEO blocked, free
 * conditional, internal research allowed.
 */
export function evaluateSurface(rights: EffectiveRights, surface: Surface): SurfaceEligibility {
  const commercialUnknownOrProhibited =
    rights.commercial_use === "UNKNOWN" || rights.commercial_use === "PROHIBITED";

  if (rights.review_status === "BLOCKED") {
    return { surface, decision: "BLOCKED", reason_code: "RIGHTS_REVIEW_BLOCKED" };
  }
  if (rights.review_status === "EXPIRED" && (surface === "PAID" || surface === "SEO")) {
    return { surface, decision: "BLOCKED", reason_code: "RIGHTS_EXPIRED" };
  }

  switch (surface) {
    case "INTERNAL":
      // Internal research use. Only an outright prohibition stops it.
      return rights.metadata_rights === "PROHIBITED"
        ? { surface, decision: "BLOCKED", reason_code: "METADATA_RIGHTS_PROHIBITED" }
        : { surface, decision: "ALLOWED", reason_code: "INTERNAL_USE" };

    case "FREE":
      if (rights.metadata_rights === "PROHIBITED") {
        return { surface, decision: "BLOCKED", reason_code: "METADATA_RIGHTS_PROHIBITED" };
      }
      // §6.3 "Commercial permission unknown" → Free UI: Conditional.
      return commercialUnknownOrProhibited
        ? { surface, decision: "CONDITIONAL", reason_code: "COMMERCIAL_USE_UNRESOLVED" }
        : { surface, decision: "ALLOWED", reason_code: "RIGHTS_PERMIT_FREE_SURFACE" };

    case "PAID":
      // §6.4 hard gate. UNKNOWN is not a maybe here — it is a no.
      return commercialUnknownOrProhibited
        ? { surface, decision: "BLOCKED", reason_code: "COMMERCIAL_USE_UNRESOLVED" }
        : { surface, decision: "ALLOWED", reason_code: "COMMERCIAL_USE_ALLOWED" };

    case "SEO":
      if (commercialUnknownOrProhibited) {
        return { surface, decision: "BLOCKED", reason_code: "COMMERCIAL_USE_UNRESOLVED" };
      }
      return rights.redistribution === "ALLOWED"
        ? { surface, decision: "ALLOWED", reason_code: "REDISTRIBUTION_ALLOWED" }
        : { surface, decision: "BLOCKED", reason_code: "REDISTRIBUTION_UNRESOLVED" };
  }
}

/** Evaluates every surface in a stable order. */
export function evaluateAllSurfaces(rights: EffectiveRights): readonly SurfaceEligibility[] {
  return SURFACES.map((surface) => evaluateSurface(rights, surface));
}

const DECISION_SEVERITY: Readonly<Record<SurfaceDecision, number>> = {
  ALLOWED: 0,
  CONDITIONAL: 1,
  BLOCKED: 2,
};

/**
 * The surface decision for one section of a result.
 *
 * It starts from `base`, the decision already in force for the result, and
 * each of the section's own claims can only tighten it. The most restrictive
 * decision wins, and ties keep the earlier reason. A claim therefore never
 * appears on a surface its own rights forbid, even when another section's
 * rights allow that surface. A section with no claims keeps `base`.
 */
export function sectionEligibility(
  base: SurfaceEligibility,
  rights: readonly EffectiveRights[],
  surface: Surface,
): SurfaceEligibility {
  return rights.reduce<SurfaceEligibility>((strictest, claimRights) => {
    const own = evaluateSurface(claimRights, surface);
    return DECISION_SEVERITY[own.decision] > DECISION_SEVERITY[strictest.decision]
      ? own
      : strictest;
  }, base);
}

// ---------------------------------------------------------------------------
// Per-asset rights (ADR-0007, resolving D-003)
// ---------------------------------------------------------------------------
//
// Everything above this line evaluates one decision per surface from
// `metadata_rights`. That is right for PESEL, whose only asset is a data row,
// and insufficient for a digital library, where one object can be
// metadata-open and image-restricted at the same time. `docs/canonical/12`
// §16.4 requires metadata, transcription and image rights to be evaluated
// **independently**, and §6.1 requires a child rights layer to be able to
// restrict its parent. Both are implemented below.
//
// `evaluateSurface` is deliberately left untouched: the metadata row of the
// matrix delegates to it, so the surfaces PESEL already has cannot move under
// this change. `rights.test.ts` asserts that agreement.

/** The four values of the `rights_permission` enum (migration 0003). */
export type Permission = "ALLOWED" | "CONDITIONAL" | "UNKNOWN" | "PROHIBITED";

/**
 * Restrictiveness order, least to most.
 *
 * `UNKNOWN` sits between `CONDITIONAL` and `PROHIBITED`: it is stricter than a
 * permission we hold under conditions, and it is not itself a refusal, but on
 * a public surface ADR-0007 §1 treats it as one.
 */
const RESTRICTIVENESS: Record<Permission, number> = {
  ALLOWED: 0,
  CONDITIONAL: 1,
  UNKNOWN: 2,
  PROHIBITED: 3,
};

/**
 * Reads a stored value as a `Permission`.
 *
 * An unrecognised string is `UNKNOWN`, never `ALLOWED`. A permission we cannot
 * parse is a permission we do not have.
 */
export function asPermission(value: string | null | undefined): Permission {
  switch (value) {
    case "ALLOWED":
    case "CONDITIONAL":
    case "PROHIBITED":
      return value;
    default:
      return "UNKNOWN";
  }
}

/** Returns whichever of the two permissions restricts more. */
export function mostRestrictive(a: Permission, b: Permission): Permission {
  return RESTRICTIVENESS[a] >= RESTRICTIVENESS[b] ? a : b;
}

/** The rights dimensions asset evaluation reads (`docs/canonical/12` §6.2). */
export interface FullRights {
  readonly metadata_rights: Permission;
  readonly transcription_rights: Permission;
  readonly image_rights: Permission;
  readonly database_rights: Permission;
  readonly automated_access: Permission;
  readonly commercial_use: Permission;
  readonly redistribution: Permission;
  readonly review_status: string;
  readonly attribution_required: boolean;
  readonly attribution_text: string | null;
  readonly source_owner: string | null;
  readonly rights_url: string | null;
}

/**
 * A partially-stated rights position, as a record-level or asset-level layer
 * carries it. Every field is optional: a layer states only what it overrides.
 */
export interface RightsLayer {
  readonly metadata_rights?: string | null;
  readonly transcription_rights?: string | null;
  readonly image_rights?: string | null;
  readonly database_rights?: string | null;
  readonly automated_access?: string | null;
  readonly commercial_use?: string | null;
  readonly redistribution?: string | null;
  readonly review_status?: string | null;
  readonly attribution_required?: boolean | null;
  readonly attribution_text?: string | null;
  readonly source_owner?: string | null;
  readonly rights_url?: string | null;
}

const PERMISSION_KEYS = [
  "metadata_rights",
  "transcription_rights",
  "image_rights",
  "database_rights",
  "automated_access",
  "commercial_use",
  "redistribution",
] as const;

/**
 * Normalises any rights-shaped record into a complete, fail-closed posture.
 *
 * An absent dimension becomes `UNKNOWN`, which on a public surface is a
 * refusal. That is the point: a profile that forgot to state image rights must
 * not publish images.
 */
export function completeRights(layer: RightsLayer): FullRights {
  return {
    metadata_rights: asPermission(layer.metadata_rights),
    transcription_rights: asPermission(layer.transcription_rights),
    image_rights: asPermission(layer.image_rights),
    database_rights: asPermission(layer.database_rights),
    automated_access: asPermission(layer.automated_access),
    commercial_use: asPermission(layer.commercial_use),
    redistribution: asPermission(layer.redistribution),
    review_status: layer.review_status ?? "LEGAL_REVIEW_REQUIRED",
    attribution_required: layer.attribution_required ?? false,
    attribution_text: layer.attribution_text ?? null,
    source_owner: layer.source_owner ?? null,
    rights_url: layer.rights_url ?? null,
  };
}

/** Review statuses ordered by how much they restrict, least to most. */
const REVIEW_RESTRICTIVENESS: Record<string, number> = {
  APPROVED: 0,
  CONDITIONAL: 1,
  LEGAL_REVIEW_REQUIRED: 2,
  EXPIRED: 3,
  BLOCKED: 4,
};

function reviewRank(status: string): number {
  return REVIEW_RESTRICTIVENESS[status] ?? REVIEW_RESTRICTIVENESS["LEGAL_REVIEW_REQUIRED"]!;
}

/**
 * `docs/canonical/12` §6.1 — DigitalAsset rights override SourceRecord rights
 * override Source default rights, and "a child may be more restrictive than
 * the parent".
 *
 * Implemented as a most-restrictive-wins fold, so a child can only tighten. A
 * child layer claiming *more* permission than its parent is ignored rather
 * than honoured, which is what makes object-level rights supplied by a third
 * party safe to ingest: a wrong or hostile value can only restrict us further.
 *
 * Attribution composes the other way round, because it is an obligation rather
 * than a permission: the most specific layer that states one wins, and a
 * required attribution can never be cleared by a child.
 */
export function resolveEffectiveRights(
  base: RightsLayer,
  ...children: readonly (RightsLayer | null | undefined)[]
): FullRights {
  let result = completeRights(base);

  for (const child of children) {
    if (!child) continue;
    const layer = completeRights(child);
    const merged: Record<string, unknown> = { ...result };

    for (const key of PERMISSION_KEYS) {
      // An absent child dimension reads as UNKNOWN, which would wrongly
      // restrict a parent that said ALLOWED. So only a dimension the child
      // actually states participates in the fold.
      if (child[key] === undefined || child[key] === null) continue;
      merged[key] = mostRestrictive(result[key], layer[key]);
    }

    merged["review_status"] =
      child.review_status == null
        ? result.review_status
        : reviewRank(layer.review_status) >= reviewRank(result.review_status)
          ? layer.review_status
          : result.review_status;

    merged["attribution_required"] = result.attribution_required || layer.attribution_required;
    merged["attribution_text"] = layer.attribution_text ?? result.attribution_text;
    merged["source_owner"] = layer.source_owner ?? result.source_owner;
    merged["rights_url"] = layer.rights_url ?? result.rights_url;

    result = merged as unknown as FullRights;
  }

  return result;
}

/** The eight rows of `docs/canonical/12` §6.3's decision matrix. */
export type RightsState =
  | "FULLY_OPEN"
  | "ATTRIBUTION_REQUIRED"
  | "METADATA_OPEN_IMAGE_RESTRICTED"
  | "NON_COMMERCIAL_ONLY"
  | "COMMERCIAL_UNKNOWN"
  | "PARTNERSHIP_REQUIRED"
  | "AUTOMATED_ACCESS_PROHIBITED"
  | "RIGHTS_EXPIRED";

/**
 * Classifies a posture as one of §6.3's rows.
 *
 * Several rows can describe the same profile, so the order below is the
 * decision and not an implementation detail: the row tested first is the one
 * that restricts the most. `RIGHTS_EXPIRED` outranks everything because an
 * expired review means we no longer know the terms at all.
 *
 * This is reporting, not enforcement: `evaluateAsset` reads the dimensions
 * directly and never consults this function. It exists so an operator can see
 * *which row of the canonical matrix* a source is sitting on.
 */
export function classifyRightsState(rights: FullRights): RightsState {
  if (rights.review_status === "EXPIRED") return "RIGHTS_EXPIRED";
  if (rights.review_status === "BLOCKED") return "PARTNERSHIP_REQUIRED";
  if (rights.automated_access === "PROHIBITED") return "AUTOMATED_ACCESS_PROHIBITED";
  if (rights.commercial_use === "PROHIBITED") return "NON_COMMERCIAL_ONLY";
  if (rights.commercial_use === "UNKNOWN") return "COMMERCIAL_UNKNOWN";
  if (
    rights.metadata_rights === "ALLOWED" &&
    (rights.image_rights !== "ALLOWED" || rights.transcription_rights !== "ALLOWED")
  ) {
    return "METADATA_OPEN_IMAGE_RESTRICTED";
  }
  if (rights.attribution_required) return "ATTRIBUTION_REQUIRED";
  return "FULLY_OPEN";
}

/**
 * The three permissions `docs/canonical/12` §16.4 requires to be evaluated
 * independently. `METADATA` covers the catalogue record and the citation;
 * `TRANSCRIPTION` the OCR text; `IMAGE` the scan itself.
 */
export type AssetKind = "METADATA" | "TRANSCRIPTION" | "IMAGE";

export const ASSET_KINDS: readonly AssetKind[] = ["METADATA", "TRANSCRIPTION", "IMAGE"];

/**
 * `LOCATOR_ONLY` is ADR-0007 §3: the object may be named and linked at a
 * stable locator, but the asset may not be copied, cropped, proxied or
 * re-hosted. It is the honest middle between "blocked" and "reproduce", and it
 * is what a restricted scan under open metadata actually permits.
 */
export type AssetDecision = "ALLOWED" | "ALLOWED_WITH_ATTRIBUTION" | "LOCATOR_ONLY" | "BLOCKED";

export interface AssetEligibility {
  readonly asset: AssetKind;
  readonly surface: Surface;
  readonly decision: AssetDecision;
  /** Machine-readable reason. Never consumer copy. */
  readonly reason_code: string;
  /** The text that must be displayed; null when none is required. */
  readonly attribution: string | null;
}

function permissionFor(rights: FullRights, asset: AssetKind): Permission {
  switch (asset) {
    case "METADATA":
      return rights.metadata_rights;
    case "TRANSCRIPTION":
      return rights.transcription_rights;
    case "IMAGE":
      return rights.image_rights;
  }
}

/**
 * The attribution line to display, or null when none can be built.
 *
 * `attribution_text` is used verbatim when the profile carries one, because a
 * rights holder's own wording is not ours to paraphrase. Otherwise a line is
 * composed from the owner and the rights URL.
 */
export function attributionFor(rights: FullRights): string | null {
  if (rights.attribution_text !== null && rights.attribution_text.trim() !== "") {
    return rights.attribution_text.trim();
  }
  const owner = rights.source_owner?.trim();
  const url = rights.rights_url?.trim();
  if (owner && url) return `${owner} — ${url}`;
  if (owner) return owner;
  if (url) return url;
  return null;
}

/**
 * Evaluates one asset kind on one surface (ADR-0007).
 *
 * `METADATA` delegates to `evaluateSurface` so that the behaviour every
 * existing claim already depends on is preserved by construction rather than
 * by a parallel reimplementation that could drift.
 */
export function evaluateAsset(
  rights: FullRights,
  asset: AssetKind,
  surface: Surface,
): AssetEligibility {
  const attribution = attributionFor(rights);

  const finish = (decision: AssetDecision, reason_code: string): AssetEligibility => {
    if (decision === "BLOCKED" || surface === "INTERNAL") {
      return { asset, surface, decision, reason_code, attribution: null };
    }
    if (!rights.attribution_required) {
      return { asset, surface, decision, reason_code, attribution: null };
    }
    // ADR-0007 §5. An attribution obligation that cannot be discharged is not
    // a licence to publish without it.
    if (attribution === null) {
      return {
        asset,
        surface,
        decision: "BLOCKED",
        reason_code: "ATTRIBUTION_REQUIRED_BUT_UNAVAILABLE",
        attribution: null,
      };
    }
    return {
      asset,
      surface,
      decision: decision === "ALLOWED" ? "ALLOWED_WITH_ATTRIBUTION" : decision,
      reason_code,
      attribution,
    };
  };

  if (asset === "METADATA") {
    const base = evaluateSurface(rights, surface);
    if (base.decision === "BLOCKED") {
      return {
        asset,
        surface,
        decision: "BLOCKED",
        reason_code: base.reason_code,
        attribution: null,
      };
    }
    // CONDITIONAL on the surface evaluation is not a permission to publish
    // metadata freely, but it is not a refusal either: it is the "legal review"
    // row of §6.3. It carries through unchanged as LOCATOR_ONLY would overstate
    // it, so it maps to ALLOWED only when the evaluation said ALLOWED.
    return base.decision === "ALLOWED"
      ? finish("ALLOWED", base.reason_code)
      : finish("LOCATOR_ONLY", base.reason_code);
  }

  if (rights.review_status === "BLOCKED") {
    return finish("BLOCKED", "RIGHTS_REVIEW_BLOCKED");
  }
  if (rights.review_status === "EXPIRED" && (surface === "PAID" || surface === "SEO")) {
    return finish("BLOCKED", "RIGHTS_EXPIRED");
  }

  const permission = permissionFor(rights, asset);

  if (surface === "INTERNAL") {
    // Internal research and rights review. Only an outright prohibition stops
    // it: refusing to let staff read what was retrieved would make the rights
    // question itself unanswerable (ADR-0007 §1).
    return permission === "PROHIBITED"
      ? finish("BLOCKED", `${asset}_RIGHTS_PROHIBITED`)
      : finish("ALLOWED", "INTERNAL_USE");
  }

  if (permission !== "ALLOWED") {
    if (asset === "IMAGE") {
      // §6.3 row 3: metadata open, image restricted. The object may still be
      // named and linked when its metadata is publishable here — but the scan
      // is never copied. If the metadata is not publishable either, we do not
      // even name the object.
      const metadata = evaluateAsset(rights, "METADATA", surface);
      return metadata.decision === "BLOCKED"
        ? finish("BLOCKED", "METADATA_NOT_PUBLISHABLE")
        : finish("LOCATOR_ONLY", `IMAGE_RIGHTS_${permission}`);
    }
    return finish("BLOCKED", `TRANSCRIPTION_RIGHTS_${permission}`);
  }

  const commercialUnresolved =
    rights.commercial_use === "UNKNOWN" || rights.commercial_use === "PROHIBITED";

  if ((surface === "PAID" || surface === "SEO") && commercialUnresolved) {
    return finish("BLOCKED", "COMMERCIAL_USE_UNRESOLVED");
  }
  if (surface === "SEO" && rights.redistribution !== "ALLOWED") {
    return finish("BLOCKED", "REDISTRIBUTION_UNRESOLVED");
  }
  if (surface === "FREE" && commercialUnresolved) {
    // §6.3 "Commercial permission unknown" → Free UI: Conditional. For an
    // asset rather than a fact, conditional means link, do not reproduce.
    return finish("LOCATOR_ONLY", "COMMERCIAL_USE_UNRESOLVED");
  }

  return finish("ALLOWED", `${asset}_RIGHTS_ALLOWED`);
}

/** Every asset kind against every surface, in a stable order. */
export function evaluateRightsMatrix(rights: FullRights): readonly AssetEligibility[] {
  return ASSET_KINDS.flatMap((asset) =>
    SURFACES.map((surface) => evaluateAsset(rights, asset, surface)),
  );
}

// --- `docs/canonical/12` §6.4's three hard gates, as named functions -------

/** `if automated_access == PROHIBITED: connector.execute = false` */
export function connectorExecutable(rights: FullRights): boolean {
  return rights.automated_access !== "PROHIBITED" && rights.review_status !== "BLOCKED";
}

/** `if commercial_use in {UNKNOWN, PROHIBITED}: evidence.paid_surface_eligible = false` */
export function paidSurfaceEligible(rights: FullRights): boolean {
  return rights.commercial_use === "ALLOWED" || rights.commercial_use === "CONDITIONAL";
}

/**
 * `if image_rights != ALLOWED: digital_asset.reproduction_eligible = false`
 *
 * Taken literally: `CONDITIONAL` is not `ALLOWED`. A scan is reproduced on an
 * explicit permission or not at all; `LOCATOR_ONLY` is what everything else
 * gets, and a locator is not a reproduction.
 */
export function reproductionEligible(rights: FullRights): boolean {
  return rights.image_rights === "ALLOWED";
}

// --- OCR excerpts (`docs/canonical/12` §16.5, ADR-0007 §2) ----------------

/**
 * ADR-0007 §2. A deliberate policy number, not a measurement: long enough to
 * show a surname in its sentence, short enough that no sequence of excerpts
 * reconstitutes a page.
 */
export const TRANSCRIPTION_EXCERPT_MAX_CHARS = 300;

export type TranscriptionExcerpt =
  | { readonly kind: "OMITTED"; readonly reason_code: string }
  | { readonly kind: "EXCERPT"; readonly text: string; readonly truncated: boolean };

/**
 * Prepares OCR text for a public surface.
 *
 * Storing OCR is evidence handling and happens regardless of this function:
 * without the matched text there is no `EvidenceItem` and no way to show why a
 * claim was made. *Publishing* an excerpt is the separate permission decided
 * here, and it requires an explicit `transcription_rights = ALLOWED`.
 *
 * Length is counted in code points, so a surname carrying combining marks is
 * not cut in half by a UTF-16 unit boundary.
 */
export function excerptTranscription(
  text: string,
  rights: FullRights,
  surface: Surface = "FREE",
): TranscriptionExcerpt {
  const eligibility = evaluateAsset(rights, "TRANSCRIPTION", surface);
  if (eligibility.decision === "BLOCKED" || eligibility.decision === "LOCATOR_ONLY") {
    return { kind: "OMITTED", reason_code: eligibility.reason_code };
  }
  const points = Array.from(text);
  if (points.length <= TRANSCRIPTION_EXCERPT_MAX_CHARS) {
    return { kind: "EXCERPT", text, truncated: false };
  }
  return {
    kind: "EXCERPT",
    text: points.slice(0, TRANSCRIPTION_EXCERPT_MAX_CHARS).join("").trimEnd(),
    truncated: true,
  };
}
