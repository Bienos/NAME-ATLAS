import type { DB } from "@name-atlas/db";
import type { Kysely } from "kysely";
import { completeRights, evaluateSurface, resolveEffectiveRights } from "@name-atlas/truth";

/**
 * Whether the **SEO surface** is allowed for a surname's evidence, and whether
 * the surname itself is public (TASK-027; `docs/canonical/21` §40).
 *
 * `assessIndexability` is pure and reads a payload, and the payload carries
 * rights evaluated for one surface — `FREE`, the surface it was queried on. §40
 * requires the public **and** the SEO surface to be allowed, and those are
 * different evaluations. Until TASK-027 the page passed a hardcoded `false`,
 * which was honest but permanent: no page could ever be indexed.
 *
 * So the decision is made where the database is. Every rights profile backing an
 * active claim about this surname is folded most-restrictively — a page shows
 * facts from several sources, and the strictest of them governs what the page as
 * a whole may do — and `evaluateSurface(…, "SEO")` answers from the fold.
 *
 * Two sources with different terms therefore cannot produce a page that
 * publishes the permissive one's facts under the permissive one's rules while
 * the page also carries the restrictive one's.
 */
export interface SeoGates {
  readonly seoSurfaceAllowed: boolean;
  readonly privacyPublic: boolean;
  /** How many profiles were folded. Zero means nothing is cited, so nothing publishes. */
  readonly profiles: number;
}

const CLOSED: SeoGates = { seoSurfaceAllowed: false, privacyPublic: false, profiles: 0 };

export async function seoGatesFor(db: Kysely<DB>, surnameId: string): Promise<SeoGates> {
  const [entity, profiles] = await Promise.all([
    db
      .selectFrom("knowledge_entities")
      .select(["privacy_class", "lifecycle_status"])
      .where("entity_id", "=", surnameId)
      .executeTakeFirst(),
    db
      .selectFrom("claims")
      .innerJoin("citations", "citations.claim_id", "claims.claim_id")
      .innerJoin(
        "rights_profiles",
        "rights_profiles.rights_profile_id",
        "citations.rights_profile_id",
      )
      .select([
        "rights_profiles.rights_profile_id as rights_profile_id",
        "rights_profiles.metadata_rights as metadata_rights",
        "rights_profiles.transcription_rights as transcription_rights",
        "rights_profiles.image_rights as image_rights",
        "rights_profiles.database_rights as database_rights",
        "rights_profiles.automated_access as automated_access",
        "rights_profiles.commercial_use as commercial_use",
        "rights_profiles.redistribution as redistribution",
        "rights_profiles.review_status as review_status",
      ])
      .where("claims.subject_entity_id", "=", surnameId)
      .where("claims.claim_status", "=", "ACTIVE")
      .distinct()
      .execute(),
  ]);

  const privacyPublic = entity?.privacy_class === "PUBLIC" && entity.lifecycle_status === "ACTIVE";

  if (profiles.length === 0) return { ...CLOSED, privacyPublic };

  // Fold. `resolveEffectiveRights` is most-restrictive-wins, which is exactly
  // the semantics wanted here: the strictest cited source governs the page.
  const [first, ...rest] = profiles;
  if (!first) return { ...CLOSED, privacyPublic };
  const folded = resolveEffectiveRights(first, ...rest);
  const complete = completeRights(folded);
  const seo = evaluateSurface(
    {
      automated_access: complete.automated_access,
      commercial_use: complete.commercial_use,
      redistribution: complete.redistribution,
      metadata_rights: complete.metadata_rights,
      review_status: complete.review_status,
    },
    "SEO",
  );

  return {
    seoSurfaceAllowed: seo.decision === "ALLOWED",
    privacyPublic,
    profiles: profiles.length,
  };
}
