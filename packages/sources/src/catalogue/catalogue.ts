/**
 * Source catalogue (TASK-038; docs/canonical/12 §5).
 *
 * Every source named in this repository's source research, as registry data:
 * one `Source` and one default `RightsProfile` per entry. Nothing is fetched
 * and no data is ingested — a catalogue row says a source exists and on what
 * terms it may be used, not what it contains.
 *
 * EVERY VALUE IS TRACEABLE to a named document, and the mapping from its
 * wording to enum values follows tasks/038-source-catalogue-registry.md §5
 * rule by rule:
 *
 *   - docs/canonical/12 §2.1 and §7 (verification snapshot 2026-09-17) — the
 *     only VERIFIED rights evidence. Classified entries only.
 *   - docs/library/NAME_ATLAS_GENEALOGY_SOURCE_ARCHITECTURE(1).md §2 ("GSA"),
 *     docs/library/NAME_ATLAS_DATA_TRUTH_LAYER(1).md §6–9 ("DTL"),
 *     docs/sources/candidate-sources.md and docs/sources/INVENTORY.md —
 *     research and discovery, not rights review. Research-only entries carry
 *     every rights dimension as UNKNOWN; the research's own verdict is quoted
 *     in the notes and never promoted to a permission.
 *
 * Deliberately absent, each owned elsewhere:
 *
 *   - PESEL (`pl_pesel_surnames`), owned by the PESEL importer (TASK-004).
 *   - Polona, whose source default is open decision D-021.
 *   - Meaning works (ADR-0008 Path B). They enter through the onomastics
 *     importer, whose `ensureWork` reuses any existing row with the work's
 *     key without reading its rights — so a catalogue row under such a key
 *     would silently become that work's rights profile.
 */
import type { DB } from "@name-atlas/db";
import type { CachePermission, RightsPermission, RightsProfileSeed } from "../registry.js";

type SourceType = DB["sources"]["source_type"];
type SourceGranularity = DB["sources"]["granularity"];
type SourceReliabilityTier = DB["sources"]["authority_tier"];
type SourceProductionStatus = DB["sources"]["production_status"];

/** Where an entry's classification comes from. */
export type CatalogueBasis =
  | "CANONICAL_12_S7"
  | "RESEARCH_GSA_S2"
  | "RESEARCH_DTL_S6_S9"
  | "RESEARCH_CANDIDATES"
  | "RESEARCH_INVENTORY";

/** docs/canonical/12 §7 "MVP status" labels, verbatim. */
export type CanonicalMvpLabel =
  | "NOW"
  | "NOW/P1"
  | "P1"
  | "RIGHTS-FILTERED"
  | "P1 RIGHTS-FILTERED"
  | "P1 / LEGAL REVIEW"
  | "LEGAL REVIEW / PARTNER"
  | "PARTNER P0"
  | "PARTNER P1"
  | "PARTNER"
  | "LATER PARTNER"
  | "BLOCKED";

/**
 * tasks/038 §5 rule 2. No label maps to APPROVED (rule 1): approval is a
 * recorded decision — as D-007 is for PESEL — and none exists for any
 * catalogued source.
 */
export const MVP_LABEL_PRODUCTION_STATUS: Readonly<
  Record<CanonicalMvpLabel, SourceProductionStatus>
> = {
  NOW: "LEGAL_REVIEW_REQUIRED",
  "NOW/P1": "LEGAL_REVIEW_REQUIRED",
  P1: "LEGAL_REVIEW_REQUIRED",
  "RIGHTS-FILTERED": "LEGAL_REVIEW_REQUIRED",
  "P1 RIGHTS-FILTERED": "LEGAL_REVIEW_REQUIRED",
  "P1 / LEGAL REVIEW": "LEGAL_REVIEW_REQUIRED",
  "LEGAL REVIEW / PARTNER": "PARTNERSHIP_REQUIRED",
  "PARTNER P0": "PARTNERSHIP_REQUIRED",
  "PARTNER P1": "PARTNERSHIP_REQUIRED",
  PARTNER: "PARTNERSHIP_REQUIRED",
  "LATER PARTNER": "PARTNERSHIP_REQUIRED",
  BLOCKED: "BLOCKED",
};

/** `checked_at` for classified entries: the docs/canonical/12 §2 snapshot. */
export const CLASSIFIED_CHECKED_AT = "2026-09-17T00:00:00Z";
/** `checked_at` for research-only entries: when TASK-038 examined the research. */
export const RESEARCH_CHECKED_AT = "2026-09-30T00:00:00Z";

/** The registry row (docs/canonical/11 §9.1), nullable where the schema allows. */
export interface CatalogueSourceSeed {
  readonly source_key: string;
  readonly name: string;
  readonly publisher: string | null;
  readonly source_type: SourceType;
  readonly granularity: SourceGranularity;
  readonly geographic_scope: readonly string[];
  readonly temporal_from: string | null;
  readonly temporal_to: string | null;
  readonly methodology_notes: string;
  readonly authority_tier: SourceReliabilityTier;
  readonly production_status: SourceProductionStatus;
  readonly homepage_or_reference_url: string | null;
}

export interface CatalogueEntry {
  readonly basis: CatalogueBasis;
  /** The verbatim docs/canonical/12 §7 label; null for research-only entries. */
  readonly mvp_label: CanonicalMvpLabel | null;
  /** The research's own rating, quoted; null for classified entries. */
  readonly research_verdict: string | null;
  readonly source: CatalogueSourceSeed;
  readonly rights: RightsProfileSeed;
}

/** The seven `RightsPermission` dimensions of a `RightsProfile`. */
export type PermissionDimension =
  | "metadata_rights"
  | "image_rights"
  | "transcription_rights"
  | "database_rights"
  | "automated_access"
  | "commercial_use"
  | "redistribution";

export const PERMISSION_DIMENSIONS: readonly PermissionDimension[] = [
  "metadata_rights",
  "image_rights",
  "transcription_rights",
  "database_rights",
  "automated_access",
  "commercial_use",
  "redistribution",
];

const GSA_DOC = "docs/library/NAME_ATLAS_GENEALOGY_SOURCE_ARCHITECTURE(1).md §2";
const DTL_DOC = "docs/library/NAME_ATLAS_DATA_TRUTH_LAYER(1).md §6–9";
const CANDIDATES_DOC = "docs/sources/candidate-sources.md";
const INVENTORY_DOC = "docs/sources/INVENTORY.md";

function tierNote(tier: SourceReliabilityTier): string {
  return (
    `authority_tier ${tier} is TASK-038's provisional evaluation under the reliability rubric ` +
    "in docs/library/NAME_ATLAS_GENEALOGY_SOURCE_ARCHITECTURE(1).md §8, not a statement by " +
    "the source; authority and rights are independent (docs/canonical/11 §9.1). Registered " +
    "only: no data from this source has been retrieved or ingested."
  );
}

interface CommonInput {
  readonly key: string;
  readonly name: string;
  readonly publisher: string | null;
  readonly type: SourceType;
  readonly granularity: SourceGranularity;
  readonly scope: readonly string[];
  readonly tier: SourceReliabilityTier;
  /** What the source holds, in the evidence's own terms. */
  readonly holds: string;
  readonly homepage: string | null;
}

interface ClassifiedInput extends CommonInput {
  readonly label: CanonicalMvpLabel;
  readonly rightsUrl: string | null;
  readonly termsVersion?: string;
  /** Dimensions the evidence addresses; every other one is UNKNOWN. */
  readonly permissions: Partial<Record<PermissionDimension, RightsPermission>>;
  readonly localCache: CachePermission;
  readonly attributionRequired: boolean;
  readonly contactRequired: boolean;
  /** The rights evidence, summarised from docs/canonical/12 §2.1 / §7. */
  readonly evidence: string;
}

function permissions(
  given: Partial<Record<PermissionDimension, RightsPermission>>,
): Record<PermissionDimension, RightsPermission> {
  return {
    metadata_rights: given.metadata_rights ?? "UNKNOWN",
    image_rights: given.image_rights ?? "UNKNOWN",
    transcription_rights: given.transcription_rights ?? "UNKNOWN",
    database_rights: given.database_rights ?? "UNKNOWN",
    automated_access: given.automated_access ?? "UNKNOWN",
    commercial_use: given.commercial_use ?? "UNKNOWN",
    redistribution: given.redistribution ?? "UNKNOWN",
  };
}

/** An entry classified by docs/canonical/12 §7. */
function classified(input: ClassifiedInput): CatalogueEntry {
  const production_status = MVP_LABEL_PRODUCTION_STATUS[input.label];
  return {
    basis: "CANONICAL_12_S7",
    mvp_label: input.label,
    research_verdict: null,
    source: {
      source_key: input.key,
      name: input.name,
      publisher: input.publisher,
      source_type: input.type,
      granularity: input.granularity,
      geographic_scope: input.scope,
      temporal_from: null,
      temporal_to: null,
      methodology_notes:
        `${input.holds} Classified by docs/canonical/12 §7 as "${input.label}". ` +
        tierNote(input.tier),
      authority_tier: input.tier,
      production_status,
      homepage_or_reference_url: input.homepage,
    },
    rights: {
      terms_version: input.termsVersion ?? null,
      terms_hash: null,
      checked_at: CLASSIFIED_CHECKED_AT,
      ...permissions(input.permissions),
      local_cache: input.localCache,
      attribution_required: input.attributionRequired,
      attribution_text: null,
      source_owner: input.publisher,
      rights_url: input.rightsUrl,
      contact_required: input.contactRequired,
      review_status: production_status === "BLOCKED" ? "BLOCKED" : "LEGAL_REVIEW_REQUIRED",
      valid_from: null,
      valid_to: null,
      notes:
        "Default profile with no agreement in place, derived by TASK-038 from " +
        `docs/canonical/12 §2.1/§7 (verification snapshot 2026-09-17): ${input.evidence} ` +
        "NO LEGAL REVIEW HAS BEEN PERFORMED. Dimensions the evidence does not address are " +
        "UNKNOWN. attribution_required and contact_required fail closed and " +
        "attribution_text is null because no exact wording is recorded " +
        "(tasks/038 §5 rules 4 and 6).",
    },
  };
}

interface ResearchInput extends CommonInput {
  readonly origin: "GSA" | "DTL" | "CANDIDATES" | "INVENTORY";
  /** The research's own rating, quoted from the table or card. */
  readonly verdict: string;
  /** PRADZIAD and SEZAM only: legacy systems migrated into Szukaj w Archiwach. */
  readonly deprecated?: true;
}

const RESEARCH_ORIGINS: Readonly<
  Record<ResearchInput["origin"], { readonly doc: string; readonly basis: CatalogueBasis }>
> = {
  GSA: { doc: GSA_DOC, basis: "RESEARCH_GSA_S2" },
  DTL: { doc: DTL_DOC, basis: "RESEARCH_DTL_S6_S9" },
  CANDIDATES: { doc: CANDIDATES_DOC, basis: "RESEARCH_CANDIDATES" },
  INVENTORY: { doc: INVENTORY_DOC, basis: "RESEARCH_INVENTORY" },
};

/** An entry named only in research or discovery lists (tasks/038 §5 rule 5). */
function research(input: ResearchInput): CatalogueEntry {
  const { doc, basis } = RESEARCH_ORIGINS[input.origin];
  return {
    basis,
    mvp_label: null,
    research_verdict: input.verdict,
    source: {
      source_key: input.key,
      name: input.name,
      publisher: input.publisher,
      source_type: input.type,
      granularity: input.granularity,
      geographic_scope: input.scope,
      temporal_from: null,
      temporal_to: null,
      methodology_notes:
        `${input.holds} Named only in research and discovery lists (${doc}); not classified by ` +
        `docs/canonical/12. Research verdict, quoted: "${input.verdict}". ` +
        tierNote(input.tier),
      authority_tier: input.tier,
      production_status: input.deprecated ? "DEPRECATED" : "LEGAL_REVIEW_REQUIRED",
      homepage_or_reference_url: input.homepage,
    },
    rights: {
      terms_version: null,
      terms_hash: null,
      checked_at: RESEARCH_CHECKED_AT,
      ...permissions({}),
      local_cache: "UNKNOWN",
      attribution_required: true,
      attribution_text: null,
      source_owner: input.publisher,
      rights_url: null,
      contact_required: true,
      review_status: "LEGAL_REVIEW_REQUIRED",
      valid_from: null,
      valid_to: null,
      notes:
        "Every dimension is UNKNOWN: this source appears only in research and discovery " +
        `lists (${doc}), whose verdict is quoted in the source's methodology_notes and not ` +
        "adopted as a permission. NO LEGAL REVIEW HAS BEEN PERFORMED. attribution_required and " +
        "contact_required fail closed (tasks/038 §5 rules 5 and 6).",
    },
  };
}

// ---------------------------------------------------------------------------
// Classified by docs/canonical/12 §7 — 21 entries (Polona is D-021's)
// ---------------------------------------------------------------------------

const CLASSIFIED: readonly CatalogueEntry[] = [
  classified({
    key: "pl_teryt",
    name: "TERYT",
    publisher: "GUS",
    type: "OFFICIAL_DATASET",
    granularity: "PLACE",
    scope: ["PL"],
    tier: "A_PRIMARY_OFFICIAL",
    holds: "Polish canonical places and administrative units (TERC, SIMC, ULIC registries).",
    homepage: "https://api.stat.gov.pl/Home/TerytApi?lang=en",
    label: "NOW",
    rightsUrl: "https://api.stat.gov.pl/Home/TerytApi?lang=en",
    permissions: { automated_access: "ALLOWED", commercial_use: "ALLOWED" },
    localCache: "ALLOWED",
    attributionRequired: true,
    contactRequired: false,
    evidence:
      "GUS states TERYT ws1 is available to public and commercial entities free of charge; " +
      '§7 local cache "Yes". No attribution rule is recorded, so attribution fails closed.',
  }),
  classified({
    key: "pl_gus_geocoder",
    name: "GUS geocoder",
    publisher: "GUS",
    type: "OFFICIAL_DATASET",
    granularity: "PLACE",
    scope: ["PL"],
    tier: "A_PRIMARY_OFFICIAL",
    holds: "Polish geocoding and reference geometry (REST/JSON).",
    homepage: "https://geo.stat.gov.pl/api/fts/",
    label: "NOW",
    rightsUrl: "https://geo.stat.gov.pl/api/fts/",
    permissions: { automated_access: "ALLOWED", commercial_use: "ALLOWED" },
    localCache: "LIMITED",
    attributionRequired: true,
    contactRequired: false,
    evidence:
      "The GUS geocoder documentation permits commercial and non-commercial use free of " +
      'charge with source attribution; §7 local cache "Response/local cache per policy".',
  }),
  classified({
    key: "global_wikidata",
    name: "Wikidata",
    publisher: null,
    type: "OTHER",
    granularity: "MIXED",
    scope: ["GLOBAL"],
    tier: "D_TERTIARY_LEAD",
    holds: "Labels, identifiers and cross-links for entities, places and people.",
    homepage: "https://www.wikidata.org/wiki/Wikidata:Licensing",
    label: "NOW",
    rightsUrl: "https://www.wikidata.org/wiki/Wikidata:Licensing",
    termsVersion: "CC0",
    permissions: {
      metadata_rights: "ALLOWED",
      database_rights: "ALLOWED",
      automated_access: "ALLOWED",
      commercial_use: "ALLOWED",
      redistribution: "ALLOWED",
    },
    localCache: "ALLOWED",
    attributionRequired: false,
    contactRequired: false,
    evidence:
      "Structured data in the main, property and lexeme namespaces is available under CC0; " +
      '§7 local cache "Yes". Authority must remain claim-specific.',
  }),
  classified({
    key: "global_geonames",
    name: "GeoNames",
    publisher: null,
    type: "OTHER",
    granularity: "PLACE",
    scope: ["GLOBAL"],
    tier: "D_TERTIARY_LEAD",
    holds: "Global place names, aliases and coordinates (bulk dumps and web services).",
    homepage: "https://www.geonames.org/export/",
    label: "NOW",
    rightsUrl: "https://www.geonames.org/export/",
    termsVersion: "CC BY",
    permissions: {
      metadata_rights: "ALLOWED",
      database_rights: "ALLOWED",
      automated_access: "CONDITIONAL",
      commercial_use: "ALLOWED",
      redistribution: "ALLOWED",
    },
    localCache: "ALLOWED",
    attributionRequired: true,
    contactRequired: false,
    evidence:
      "Data under CC BY, commercial use permitted, attribution required; free web services " +
      'are quota-limited (a daily credit limit), hence automated_access CONDITIONAL; §7 local cache "Yes".',
  }),
  classified({
    key: "global_getty_tgn",
    name: "Getty TGN",
    publisher: "Getty",
    type: "ACADEMIC",
    granularity: "PLACE",
    scope: ["GLOBAL"],
    tier: "C_SCHOLARLY_SECONDARY",
    holds: "Historical and current place names (linked data, SPARQL, full downloads).",
    homepage: "https://www.getty.edu/research/tools/vocabularies/lod/",
    label: "NOW/P1",
    rightsUrl: "https://www.getty.edu/research/tools/vocabularies/obtain/download.html",
    termsVersion: "ODC-By 1.0",
    permissions: {
      metadata_rights: "ALLOWED",
      database_rights: "ALLOWED",
      automated_access: "ALLOWED",
      commercial_use: "ALLOWED",
      redistribution: "ALLOWED",
    },
    localCache: "ALLOWED",
    attributionRequired: true,
    contactRequired: false,
    evidence:
      "Getty publishes the Vocabularies under ODC-By 1.0 with linked-data records and full " +
      'data releases; older XML/web-service formats are retired; §7 local cache "Yes".',
  }),
  classified({
    key: "eu_europeana",
    name: "Europeana",
    publisher: "Europeana",
    type: "DIGITAL_LIBRARY",
    granularity: "DOCUMENT",
    scope: ["EUROPE"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "European cultural-heritage metadata (Search, Record and IIIF APIs).",
    homepage: "https://api.europeana.eu/en",
    label: "NOW/P1",
    rightsUrl: "https://www.europeana.eu/en/rights/terms-of-use",
    termsVersion: "Metadata: CC0",
    permissions: {
      metadata_rights: "ALLOWED",
      image_rights: "CONDITIONAL",
      automated_access: "CONDITIONAL",
      commercial_use: "CONDITIONAL",
      redistribution: "CONDITIONAL",
    },
    localCache: "LIMITED",
    attributionRequired: true,
    contactRequired: false,
    evidence:
      "Metadata is published under CC0; digital objects and previews carry their own rights " +
      "statements; the APIs require a free API key (automated_access CONDITIONAL); " +
      '§7 local cache "Metadata yes".',
  }),
  classified({
    key: "global_openhistoricalmap",
    name: "OpenHistoricalMap",
    publisher: null,
    type: "OTHER",
    granularity: "PLACE",
    scope: ["GLOBAL"],
    tier: "D_TERTIARY_LEAD",
    holds: "Contextual historical geography (Overpass API, tiles, bulk); not complete coverage.",
    homepage: "https://wiki.openstreetmap.org/wiki/Open_Historical_Map/FAQ",
    label: "P1",
    rightsUrl: "https://wiki.openstreetmap.org/wiki/Open_Historical_Map/FAQ",
    permissions: {
      metadata_rights: "CONDITIONAL",
      database_rights: "CONDITIONAL",
      commercial_use: "CONDITIONAL",
      redistribution: "CONDITIONAL",
    },
    localCache: "LIMITED",
    attributionRequired: true,
    contactRequired: false,
    evidence:
      "OHM aims to publish as much as possible under CC0, but some imported features carry " +
      "source-specific licences such as ODbL, so element licences must be preserved; " +
      '§7 local cache "Yes with licence tracking".',
  }),
  classified({
    key: "pl_fbc",
    name: "Federacja Bibliotek Cyfrowych",
    publisher: "Poznańskie Centrum Superkomputerowo-Sieciowe",
    type: "DIGITAL_LIBRARY",
    granularity: "DOCUMENT",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Polish digital-library metadata aggregator (metadata interfaces, search).",
    homepage: "https://pro.europeana.eu/organisation/digital-libraries-federation",
    label: "P1 RIGHTS-FILTERED",
    rightsUrl: null,
    permissions: {
      metadata_rights: "CONDITIONAL",
      image_rights: "CONDITIONAL",
      commercial_use: "CONDITIONAL",
    },
    localCache: "LIMITED",
    attributionRequired: true,
    contactRequired: true,
    evidence:
      'Object rights are inherited and provider-specific (§7); §7 local cache "Metadata carefully".',
  }),
  classified({
    key: "pl_szukaj_w_archiwach",
    name: "Szukaj w Archiwach",
    publisher: "NAC / State Archives",
    type: "ARCHIVE",
    granularity: "DOCUMENT",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Polish archival discovery: archival descriptions and digitised objects.",
    homepage: "https://www.szukajwarchiwach.gov.pl/",
    label: "P1 / LEGAL REVIEW",
    rightsUrl: "https://www.szukajwarchiwach.gov.pl/warunki-i-regulamin-serwisu",
    permissions: {},
    localCache: "LIMITED",
    attributionRequired: true,
    contactRequired: true,
    evidence:
      "Current access requires a separate connector review and object/metadata conditions " +
      'require exact verification (§7); §7 local cache "Conditional".',
  }),
  classified({
    key: "pl_grobonet",
    name: "Grobonet",
    publisher: null,
    type: "COMMERCIAL_DATABASE",
    granularity: "PERSON",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Cemetery and burial data from local cemeteries via a vendor platform.",
    homepage: "https://grobonet.com/index.php?page=regulamin",
    label: "LEGAL REVIEW / PARTNER",
    rightsUrl: "https://grobonet.com/index.php?page=regulamin",
    permissions: { commercial_use: "PROHIBITED" },
    localCache: "PROHIBITED",
    attributionRequired: true,
    contactRequired: true,
    evidence:
      "Terms and rights require a provider-specific agreement and automation is not approved " +
      '(§7); §7 local cache "No default". commercial_use is PROHIBITED as the default with no ' +
      "agreement in place.",
  }),
  classified({
    key: "pl_ijp_pan_isnp",
    name: "IJP PAN – Internetowy Słownik Nazwisk w Polsce",
    publisher: "IJP PAN",
    type: "DICTIONARY",
    granularity: "SURNAME",
    scope: ["PL"],
    tier: "C_SCHOLARLY_SECONDARY",
    holds:
      "Surname frequency, geography, historical forms, etymology, morphology and variants; " +
      "its PESEL frequency/geography base is from 2014. D-002 was resolved by ADR-0008 " +
      "(Path B, attributed sources): any meaning taken from a work enters through the " +
      "onomastics importer under that work's own rights, never through this row.",
    homepage: "https://nazwiska.ijppan.pl/info/oslowniku",
    label: "PARTNER P0",
    rightsUrl: "https://nazwiska.ijppan.pl/info/oslowniku",
    permissions: {},
    localCache: "PROHIBITED",
    attributionRequired: true,
    contactRequired: true,
    evidence:
      "Being free to read does not establish permission for bulk commercial ingestion, " +
      'caching or redistribution; commercial bulk rights unconfirmed; §7 local cache "No ' +
      'production cache without agreement".',
  }),
  classified({
    key: "pl_ptg_geneteka",
    name: "Geneteka",
    publisher: "PTG",
    type: "COMMUNITY_INDEX",
    granularity: "PERSON",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Indexed historical birth, marriage and death records.",
    homepage: "https://geneteka.genealodzy.pl/",
    label: "PARTNER P1",
    rightsUrl: "https://geneteka.genealodzy.pl/ogenetece.php",
    permissions: {
      database_rights: "PROHIBITED",
      automated_access: "PROHIBITED",
      commercial_use: "PROHIBITED",
    },
    localCache: "PROHIBITED",
    attributionRequired: true,
    contactRequired: true,
    evidence:
      "PTG describes its services as protected databases and reserves rights against " +
      "unauthorised extraction or reuse of all or a substantial part; permitted uses are " +
      "scientific, educational, popularisation and hobby; §7: do not bulk automate without " +
      'agreement; local cache "No without agreement".',
  }),
  classified({
    key: "pl_ptg_skanoteka",
    name: "Skanoteka",
    publisher: "PTG",
    type: "DIGITAL_LIBRARY",
    granularity: "DOCUMENT",
    scope: ["PL"],
    tier: "A_PRIMARY_OFFICIAL",
    holds: "Scans of archival registers.",
    homepage: null,
    label: "PARTNER",
    rightsUrl: null,
    permissions: { image_rights: "CONDITIONAL", automated_access: "PROHIBITED" },
    localCache: "PROHIBITED",
    attributionRequired: true,
    contactRequired: true,
    evidence:
      '§7 row "PTG Skanoteka/Metryki": no product bulk access without agreement; rights mixed ' +
      '/ partner; local cache "No without agreement".',
  }),
  classified({
    key: "pl_ptg_metryki",
    name: "Metryki",
    publisher: "PTG",
    type: "DIGITAL_LIBRARY",
    granularity: "MIXED",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Index-linked scans of parish and civil registers.",
    homepage: "https://metryki.genealodzy.pl/opjk",
    label: "PARTNER",
    rightsUrl: null,
    permissions: { image_rights: "CONDITIONAL", automated_access: "PROHIBITED" },
    localCache: "PROHIBITED",
    attributionRequired: true,
    contactRequired: true,
    evidence:
      '§7 row "PTG Skanoteka/Metryki": no product bulk access without agreement; rights mixed ' +
      '/ partner; local cache "No without agreement".',
  }),
  classified({
    key: "global_familysearch",
    name: "FamilySearch",
    publisher: "FamilySearch",
    type: "COMMUNITY_INDEX",
    granularity: "MIXED",
    scope: ["GLOBAL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Global person-level genealogy: records, family tree and places.",
    homepage: "https://www.familysearch.org/innovate/getting-started",
    label: "LATER PARTNER",
    rightsUrl: "https://developers.familysearch.org/main/docs/compatibility-review-process",
    permissions: { automated_access: "CONDITIONAL", commercial_use: "CONDITIONAL" },
    localCache: "PROHIBITED",
    attributionRequired: true,
    contactRequired: true,
    evidence:
      "Beta/Production API keys require a compatibility review, and solutions for commercial " +
      "distribution should use the compatible developer route, not scraping; §7 local cache " +
      '"Contract-dependent", with no contract in place.',
  }),
  classified({
    key: "pl_jri_poland",
    name: "JRI-Poland",
    publisher: "JRI-Poland",
    type: "COMMUNITY_INDEX",
    granularity: "PERSON",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Indexes of Polish Jewish vital records.",
    homepage: "https://jri-poland.org/terms-of-use/",
    label: "LATER PARTNER",
    rightsUrl: "https://jri-poland.org/terms-of-use/",
    permissions: { commercial_use: "PROHIBITED" },
    localCache: "PROHIBITED",
    attributionRequired: true,
    contactRequired: true,
    evidence:
      "The Terms of Use limit default database use and ask users to obtain written permission " +
      'for commercial use; §7: no commercial ingestion by default; local cache "Contract-dependent", ' +
      "with no contract in place.",
  }),
  classified({
    key: "global_ancestry",
    name: "Ancestry",
    publisher: "Ancestry",
    type: "COMMERCIAL_DATABASE",
    granularity: "MIXED",
    scope: ["GLOBAL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Person records and user family trees.",
    homepage: "https://www.ancestry.com/c/legal/termsandconditions",
    label: "BLOCKED",
    rightsUrl: "https://www.ancestry.com/c/legal/termsandconditions",
    permissions: { automated_access: "PROHIBITED" },
    localCache: "PROHIBITED",
    attributionRequired: true,
    contactRequired: true,
    evidence:
      "Current terms prohibit automated or programmatic acquisition or monitoring beyond " +
      'intended standard human use; §7 local cache "No".',
  }),
  classified({
    key: "global_myheritage",
    name: "MyHeritage",
    publisher: "MyHeritage",
    type: "COMMERCIAL_DATABASE",
    granularity: "MIXED",
    scope: ["GLOBAL"],
    tier: "D_TERTIARY_LEAD",
    holds: "Person records, record matches and user family trees.",
    homepage: "https://www.myheritage.com/FP/Company/popup-terms-conditions.php?dispLang=EN",
    label: "BLOCKED",
    rightsUrl: "https://www.myheritage.com/FP/Company/popup-terms-conditions.php?dispLang=EN",
    permissions: { automated_access: "PROHIBITED" },
    localCache: "PROHIBITED",
    attributionRequired: true,
    contactRequired: true,
    evidence:
      "Current terms prohibit automated agents or bots harvesting or scraping service data; " +
      '§7 local cache "No".',
  }),
  classified({
    key: "global_findmypast",
    name: "Findmypast",
    publisher: "Findmypast",
    type: "COMMERCIAL_DATABASE",
    granularity: "PERSON",
    scope: ["GLOBAL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Person records, strongest for the UK and Ireland.",
    homepage: "https://www.findmypast.com/help/articles/4411066891409",
    label: "BLOCKED",
    rightsUrl: "https://www.findmypast.com/help/articles/4411066891409",
    permissions: { database_rights: "PROHIBITED", automated_access: "PROHIBITED" },
    localCache: "PROHIBITED",
    attributionRequired: true,
    contactRequired: true,
    evidence:
      "Terms prohibit systematic downloading, screen scraping, caching, data extraction and " +
      'programmatic access for creating an electronic database; §7 local cache "No".',
  }),
  classified({
    key: "global_geneanet",
    name: "Geneanet",
    publisher: "Geneanet",
    type: "COMMERCIAL_DATABASE",
    granularity: "MIXED",
    scope: ["GLOBAL"],
    tier: "D_TERTIARY_LEAD",
    holds: "Genealogy: user trees, records and indexes.",
    homepage: "https://en.geneanet.org/legal/cgu/",
    label: "BLOCKED",
    rightsUrl: "https://en.geneanet.org/legal/cgu/",
    permissions: { automated_access: "PROHIBITED", commercial_use: "PROHIBITED" },
    localCache: "PROHIBITED",
    attributionRequired: true,
    contactRequired: true,
    evidence:
      "Terms prohibit robots and automatic access tools and prohibit commercial use of the " +
      'data under normal site terms; §7 local cache "No".',
  }),
  classified({
    key: "pl_genbaza",
    name: "GenBaza",
    publisher: "Fundacja Centrum Rodziny",
    type: "DIGITAL_LIBRARY",
    granularity: "MIXED",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Scans and indexes of registers.",
    homepage: "https://genbaza.pl/regulamin",
    label: "BLOCKED",
    rightsUrl: "https://genbaza.pl/regulamin",
    permissions: { automated_access: "PROHIBITED", commercial_use: "PROHIBITED" },
    localCache: "PROHIBITED",
    attributionRequired: true,
    contactRequired: true,
    evidence:
      "Terms effective in 2026 prohibit mass or serial automated access and downloading " +
      "without prior written permission and restrict commercial and database reuse; §7: " +
      'mass automation and commercial reuse prohibited; local cache "No".',
  }),
];

// ---------------------------------------------------------------------------
// Research only — GSA §2 master source database, 44 entries
// ---------------------------------------------------------------------------

const RESEARCH_GSA: readonly CatalogueEntry[] = [
  research({
    origin: "GSA",
    key: "pl_basia",
    name: "BaSIA",
    publisher: "WTG Gniazdo",
    type: "COMMUNITY_INDEX",
    granularity: "PERSON",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Person indexes for Wielkopolska.",
    homepage: "https://basia.famula.pl/",
    verdict: "Tier 3; commercial status UNCONFIRMED",
  }),
  research({
    origin: "GSA",
    key: "pl_poznan_project",
    name: "Poznan Project",
    publisher: null,
    type: "COMMUNITY_INDEX",
    granularity: "PERSON",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Indexes of 19th-century marriages (community project).",
    homepage: "https://poznan-project.psnc.pl/",
    verdict: "Tier 3; commercial status UNCONFIRMED",
  }),
  research({
    origin: "GSA",
    key: "pl_pomgenbase",
    name: "PomGenBase",
    publisher: "PTG Gdańsk",
    type: "COMMUNITY_INDEX",
    granularity: "PERSON",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Person indexes for Pomorze.",
    homepage: null,
    verdict: "Tier 3; commercial status UNCONFIRMED",
  }),
  research({
    origin: "GSA",
    key: "pl_lubgens",
    name: "Lubgens",
    publisher: "Lubelskie TG",
    type: "COMMUNITY_INDEX",
    granularity: "PERSON",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Regional birth, marriage and death indexes for Lubelskie.",
    homepage: null,
    verdict: "Tier 3; commercial status UNCONFIRMED",
  }),
  research({
    origin: "GSA",
    key: "pl_swietogen",
    name: "Świętogen",
    publisher: null,
    type: "COMMUNITY_INDEX",
    granularity: "PERSON",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Persons, parents, spouses and places (regional genealogy).",
    homepage: null,
    verdict: "Tier 3; commercial status UNCONFIRMED",
  }),
  research({
    origin: "GSA",
    key: "pl_genealogia_w_archiwach",
    name: "Genealogia w Archiwach",
    publisher: "AP Bydgoszcz/Toruń",
    type: "ARCHIVE",
    granularity: "MIXED",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Civil, parish and population records (Kujawsko-Pomorskie).",
    homepage: "https://archiwa.gov.pl/szukaj/bazy-danych/",
    verdict: "Tier 3; API/use UNCONFIRMED",
  }),
  research({
    origin: "GSA",
    key: "pl_archiwa_panstwowe",
    name: "Archiwa Państwowe",
    publisher: "NDAP",
    type: "ARCHIVE",
    granularity: "DOCUMENT",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Nationwide holdings of the Polish State Archives (catalogue).",
    homepage: null,
    verdict: "Tier 2–4; public-sector/item-specific",
  }),
  research({
    origin: "GSA",
    key: "pl_pradziad",
    name: "PRADZIAD",
    publisher: "NDAP",
    type: "ARCHIVE",
    granularity: "DOCUMENT",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Register of parish and civil register holdings (legacy system).",
    homepage: "https://www.archiwa.gov.pl/wp-content/uploads/2022/02/Arch_CI.pdf",
    verdict: "legacy; use SwA instead (DTL §6: integrated into SzWA)",
    deprecated: true,
  }),
  research({
    origin: "GSA",
    key: "pl_sezam",
    name: "SEZAM",
    publisher: "NDAP",
    type: "ARCHIVE",
    granularity: "DOCUMENT",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Archival catalogue of fonds and descriptions (legacy system).",
    homepage: null,
    verdict: "legacy; use SwA/ZoSIA",
    deprecated: true,
  }),
  research({
    origin: "GSA",
    key: "pl_zosia",
    name: "ZoSIA",
    publisher: "NAC",
    type: "ARCHIVE",
    granularity: "DOCUMENT",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Archive system whose descriptions feed Szukaj w Archiwach.",
    homepage: null,
    verdict: "infrastructure; via SwA",
  }),
  research({
    origin: "GSA",
    key: "pl_agad",
    name: "AGAD",
    publisher: "Archiwum Główne Akt Dawnych",
    type: "ARCHIVE",
    granularity: "DOCUMENT",
    scope: ["PL"],
    tier: "A_PRIMARY_OFFICIAL",
    holds: "Church, civil and state records (catalogue and scans).",
    homepage: null,
    verdict: "Tier 4; item-specific",
  }),
  research({
    origin: "GSA",
    key: "pl_biblioteka_narodowa",
    name: "Biblioteka Narodowa",
    publisher: "Biblioteka Narodowa",
    type: "DIGITAL_LIBRARY",
    granularity: "DOCUMENT",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Catalogues, bibliographic data and digital collections.",
    homepage:
      "https://www.bn.org.pl/aktualnosci/3345-biblioteka-narodowa-otwiera-najwieksza-polska-baze-danych-bibliograficznych.html",
    verdict: "Tier 1/2; item-specific (DTL §6 BN Data: green)",
  }),
  research({
    origin: "GSA",
    key: "pl_ipn_straty",
    name: "IPN Straty.pl",
    publisher: "IPN",
    type: "ARCHIVE",
    granularity: "PERSON",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Victims of repression and WWII.",
    homepage: null,
    verdict: "Tier 3/4; commercial/API UNCONFIRMED",
  }),
  research({
    origin: "GSA",
    key: "pl_indeks_represjonowanych",
    name: "Indeks Represjonowanych",
    publisher: "KARTA/IPN ecosystem",
    type: "COMMUNITY_INDEX",
    granularity: "PERSON",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Index of people subjected to Soviet repression.",
    homepage: null,
    verdict: "Tier 4; UNCONFIRMED",
  }),
  research({
    origin: "GSA",
    key: "pl_wbh_caw",
    name: "WBH / Centralne Archiwum Wojskowe",
    publisher: "Wojskowe Biuro Historyczne",
    type: "ARCHIVE",
    granularity: "PERSON",
    scope: ["PL"],
    tier: "A_PRIMARY_OFFICIAL",
    holds: "Military personnel dossiers and lists.",
    homepage:
      "https://wbh.wp.mil.pl/centralne-archiwum-wojskowe/zasob/akta-personalne-i-odznaczeniowe/",
    verdict: "Tier 4; API/commercial UNCONFIRMED",
  }),
  research({
    origin: "GSA",
    key: "pl_nekrolog",
    name: "Nekrolog.pl",
    publisher: null,
    type: "COMMERCIAL_DATABASE",
    granularity: "PERSON",
    scope: ["PL"],
    tier: "D_TERTIARY_LEAD",
    holds: "Death notices (commercial service).",
    homepage: null,
    verdict: "Tier 5; commercial extraction unconfirmed/restricted",
  }),
  research({
    origin: "GSA",
    key: "global_jewishgen",
    name: "JewishGen",
    publisher: "JewishGen",
    type: "COMMUNITY_INDEX",
    granularity: "MIXED",
    scope: ["GLOBAL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Jewish genealogy, cemetery and Holocaust records.",
    homepage: "https://www.jewishgen.org/gedcom/faq/sndcomp.html",
    verdict: "Tier 3; automation/commercial UNCONFIRMED",
  }),
  research({
    origin: "GSA",
    key: "global_jewishgen_gazetteer",
    name: "JewishGen Gazetteer",
    publisher: "JewishGen",
    type: "OTHER",
    granularity: "PLACE",
    scope: ["GLOBAL"],
    tier: "D_TERTIARY_LEAD",
    holds: "Historic place names and aliases.",
    homepage: null,
    verdict: "Tier 3; machine use UNCONFIRMED",
  }),
  research({
    origin: "GSA",
    key: "global_arolsen_archives",
    name: "Arolsen Archives",
    publisher: "Arolsen Archives",
    type: "ARCHIVE",
    granularity: "MIXED",
    scope: ["GLOBAL"],
    tier: "A_PRIMARY_OFFICIAL",
    holds: "Records of Nazi persecution and displacement (search and scans).",
    homepage: "https://collections.arolsen-archives.org/en/archive/1-1",
    verdict: "Tier 4; publication rights vary",
  }),
  research({
    origin: "GSA",
    key: "pl_gajl_herbarz_polski",
    name: "Gajl – Herbarz Polski",
    publisher: "T. Gajl / publisher",
    type: "PUBLICATION",
    granularity: "SURNAME",
    scope: ["PL"],
    tier: "C_SCHOLARLY_SECONDARY",
    holds: "Surname-to-coat-of-arms references.",
    homepage: null,
    verdict: "Tier 4; commercial DB use UNCONFIRMED",
  }),
  research({
    origin: "GSA",
    key: "pl_wielka_genealogia_minakowskiego",
    name: "Wielka Genealogia Minakowskiego",
    publisher: "M. J. Minakowski",
    type: "ACADEMIC",
    granularity: "PERSON",
    scope: ["PL"],
    tier: "C_SCHOLARLY_SECONDARY",
    holds: "Genealogy of elite and noble families (web and subscription).",
    homepage: null,
    verdict: "Tier 4; automation restricted",
  }),
  research({
    origin: "GSA",
    key: "pl_niesiecki_armorial",
    name: "Niesiecki (armorial, public-domain scans)",
    publisher: null,
    type: "PUBLICATION",
    granularity: "MIXED",
    scope: ["PL"],
    tier: "C_SCHOLARLY_SECONDARY",
    holds: "Historical armorial: noble families and coats of arms, via Polona and similar.",
    homepage: null,
    verdict: "Tier 2; rights-filtered public domain",
  }),
  research({
    origin: "GSA",
    key: "pl_boniecki_armorial",
    name: "Boniecki (armorial, public-domain scans)",
    publisher: null,
    type: "PUBLICATION",
    granularity: "MIXED",
    scope: ["PL"],
    tier: "C_SCHOLARLY_SECONDARY",
    holds: "Historical armorial of Polish nobility, via Polona and similar.",
    homepage: null,
    verdict: "Tier 2; rights-filtered PD",
  }),
  research({
    origin: "GSA",
    key: "pl_uruski_armorial",
    name: "Uruski (armorial, public-domain scans)",
    publisher: null,
    type: "PUBLICATION",
    granularity: "MIXED",
    scope: ["PL"],
    tier: "C_SCHOLARLY_SECONDARY",
    holds: "Historical armorial of nobility and families, via Polona and similar.",
    homepage: null,
    verdict: "Tier 2; rights-filtered PD",
  }),
  research({
    origin: "GSA",
    key: "pl_paprocki_armorial",
    name: "Paprocki (armorial, public-domain scans)",
    publisher: null,
    type: "PUBLICATION",
    granularity: "MIXED",
    scope: ["PL"],
    tier: "C_SCHOLARLY_SECONDARY",
    holds: "Historical heraldry and genealogy, via digital libraries.",
    homepage: null,
    verdict: "Tier 2; rights-filtered PD",
  }),
  research({
    origin: "GSA",
    key: "global_geni",
    name: "Geni",
    publisher: null,
    type: "COMMUNITY_INDEX",
    granularity: "PERSON",
    scope: ["GLOBAL"],
    tier: "D_TERTIARY_LEAD",
    holds: "Collaborative world family tree (API exists).",
    homepage: "https://www.geni.com/platform/developer/help",
    verdict: "partner; commercial use needs review",
  }),
  research({
    origin: "GSA",
    key: "global_wikitree",
    name: "WikiTree",
    publisher: null,
    type: "COMMUNITY_INDEX",
    granularity: "PERSON",
    scope: ["GLOBAL"],
    tier: "D_TERTIARY_LEAD",
    holds: "Collaborative genealogy (API and read tools).",
    homepage: null,
    verdict: "3/partner; commercial terms UNCONFIRMED",
  }),
  research({
    origin: "GSA",
    key: "global_familytreedna",
    name: "FamilyTreeDNA",
    publisher: null,
    type: "COMMERCIAL_DATABASE",
    granularity: "PERSON",
    scope: ["GLOBAL"],
    tier: "D_TERTIARY_LEAD",
    holds: "Genetic genealogy (user or partner access).",
    homepage: null,
    verdict: "Tier 4; sensitive/contractual",
  }),
  research({
    origin: "GSA",
    key: "global_billiongraves",
    name: "BillionGraves",
    publisher: null,
    type: "COMMUNITY_INDEX",
    granularity: "PERSON",
    scope: ["GLOBAL"],
    tier: "D_TERTIARY_LEAD",
    holds: "Cemetery records and gravestone images.",
    homepage: null,
    verdict: "partner; commercial reuse UNCONFIRMED",
  }),
  research({
    origin: "GSA",
    key: "global_find_a_grave",
    name: "Find a Grave",
    publisher: null,
    type: "COMMUNITY_INDEX",
    granularity: "PERSON",
    scope: ["GLOBAL"],
    tier: "D_TERTIARY_LEAD",
    holds: "Memorials and graves.",
    homepage: null,
    verdict: "partner/manual; machine/commercial UNCONFIRMED (DTL §7: red for crawler)",
  }),
  research({
    origin: "GSA",
    key: "nl_open_archives",
    name: "Open Archives",
    publisher: null,
    type: "ARCHIVE",
    granularity: "PERSON",
    scope: ["NL", "EUROPE"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Structured archival genealogy records (OpenAPI and OAI-PMH).",
    homepage: "https://www.openarchieven.nl/api/docs/",
    verdict: "Tier 1/2; provider-level rights (DTL §7: CC0 metadata)",
  }),
  research({
    origin: "GSA",
    key: "global_internet_archive",
    name: "Internet Archive",
    publisher: null,
    type: "DIGITAL_LIBRARY",
    granularity: "DOCUMENT",
    scope: ["GLOBAL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Books, directories and newspapers with OCR.",
    homepage:
      "https://archivesupport.zendesk.com/hc/en-us/articles/360018538912-Internet-Archive-APIs",
    verdict: "Tier 1/2; item-specific",
  }),
  research({
    origin: "GSA",
    key: "global_google_books",
    name: "Google Books",
    publisher: null,
    type: "DIGITAL_LIBRARY",
    granularity: "DOCUMENT",
    scope: ["GLOBAL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Published books with OCR (API).",
    homepage: "https://developers.google.com/books/docs/overview",
    verdict: "5 unless agreement; paid-app commercial terms problematic",
  }),
  research({
    origin: "GSA",
    key: "global_hathitrust",
    name: "HathiTrust",
    publisher: null,
    type: "DIGITAL_LIBRARY",
    granularity: "DOCUMENT",
    scope: ["GLOBAL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Digitised literature (research infrastructure).",
    homepage: null,
    verdict: "Tier 4; production access limited",
  }),
  research({
    origin: "GSA",
    key: "us_nara_catalog",
    name: "NARA Catalog",
    publisher: "US National Archives",
    type: "ARCHIVE",
    granularity: "MIXED",
    scope: ["US"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Immigration, military and naturalisation records (API and bulk).",
    homepage: "https://www.archives.gov/research/catalog/help/api",
    verdict: "Tier 2; US-federal/open + item-specific",
  }),
  research({
    origin: "GSA",
    key: "us_loc_chronicling_america",
    name: "Library of Congress / Chronicling America",
    publisher: "Library of Congress",
    type: "DIGITAL_LIBRARY",
    granularity: "DOCUMENT",
    scope: ["US"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Historical newspapers (API, IIIF and text).",
    homepage: "https://www.loc.gov/apis/json-and-yaml/requests/endpoints/",
    verdict: "Tier 2; rights per material",
  }),
  research({
    origin: "GSA",
    key: "gb_tna_discovery",
    name: "UK National Archives Discovery",
    publisher: "The National Archives (UK)",
    type: "ARCHIVE",
    granularity: "DOCUMENT",
    scope: ["GB"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Catalogue of government, war, probate and other records (API).",
    homepage:
      "https://www.nationalarchives.gov.uk/terms-and-conditions/discovery-for-developers-about-the-application-programming-interface-api/",
    verdict: "Tier 2; API restrictions incl. caching (DTL §7: OGL, green)",
  }),
  research({
    origin: "GSA",
    key: "de_deutsche_digitale_bibliothek",
    name: "Deutsche Digitale Bibliothek",
    publisher: null,
    type: "DIGITAL_LIBRARY",
    granularity: "DOCUMENT",
    scope: ["DE"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "German digital-heritage metadata (API and linked data).",
    homepage: "https://github.com/bundesAPI/ddb-api/blob/main/openapi.yaml",
    verdict: "Tier 2; metadata largely open; object rights vary",
  }),
  research({
    origin: "GSA",
    key: "eu_matricula_online",
    name: "Matricula Online",
    publisher: null,
    type: "DIGITAL_LIBRARY",
    granularity: "DOCUMENT",
    scope: ["EUROPE"],
    tier: "A_PRIMARY_OFFICIAL",
    holds: "Scans of parish registers.",
    homepage: null,
    verdict: "4/5; images under a non-commercial licence",
  }),
  research({
    origin: "GSA",
    key: "us_ellis_island",
    name: "Ellis Island / SOLEIF",
    publisher: null,
    type: "OTHER",
    granularity: "PERSON",
    scope: ["US"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Passenger arrival records.",
    homepage: "https://www.statueofliberty.org/discover/heritagesearch/",
    verdict: "partner/manual; automation/commercial UNCONFIRMED",
  }),
  research({
    origin: "GSA",
    key: "global_openstreetmap",
    name: "OpenStreetMap",
    publisher: null,
    type: "OTHER",
    granularity: "PLACE",
    scope: ["GLOBAL"],
    tier: "D_TERTIARY_LEAD",
    holds: "Modern geographic graph: places and map data (API and dumps).",
    homepage: "https://www.openstreetmap.org/copyright",
    verdict: "Tier 1; ODbL/commercial allowed",
  }),
  research({
    origin: "GSA",
    key: "global_world_historical_gazetteer",
    name: "World Historical Gazetteer",
    publisher: null,
    type: "ACADEMIC",
    granularity: "PLACE",
    scope: ["GLOBAL"],
    tier: "C_SCHOLARLY_SECONDARY",
    holds: "Aggregated historical places (API, research).",
    homepage: null,
    verdict: "5 commercial / research only; aggregate CC BY-NC",
  }),
  research({
    origin: "GSA",
    key: "hist_meyers_gazetteer",
    name: "Meyers Gazetteer",
    publisher: null,
    type: "PUBLICATION",
    granularity: "PLACE",
    scope: ["HISTORICAL_GERMAN_EMPIRE"],
    tier: "C_SCHOLARLY_SECONDARY",
    holds:
      "Towns and administrative units of the German Empire, 1871–1918 (Meyers Orts- und " +
      "Verkehrs-Lexikon, 1912). MeyersGaz.org is a third party's transcription: find places " +
      "there, cite the 1912 book.",
    homepage: "https://www.meyersgaz.org/",
    verdict: "3/4; reuse/API UNCONFIRMED",
  }),
  research({
    origin: "GSA",
    key: "hist_kartenmeister",
    name: "Kartenmeister",
    publisher: null,
    type: "OTHER",
    granularity: "PLACE",
    scope: ["HISTORICAL_FORMER_GERMAN_EAST"],
    tier: "D_TERTIARY_LEAD",
    holds: "German–Polish locality name crosswalk for the former German East.",
    homepage: null,
    verdict: "3/4; reuse/API UNCONFIRMED",
  }),
];

// ---------------------------------------------------------------------------
// Research only — DTL §6–9 source maps and cards, 17 entries
// ---------------------------------------------------------------------------

const RESEARCH_DTL: readonly CatalogueEntry[] = [
  research({
    origin: "DTL",
    key: "pl_gugik_prg_prng",
    name: "GUGiK PRG / PRNG",
    publisher: "GUGiK",
    type: "OFFICIAL_DATASET",
    granularity: "PLACE",
    scope: ["PL"],
    tier: "A_PRIMARY_OFFICIAL",
    holds: "Places, boundaries and addresses (WFS/WMS and downloads).",
    homepage: "https://www.geoportal.gov.pl/pl/dane/panstwowy-rejestr-granic-prg/",
    verdict: "green; automation 5",
  }),
  research({
    origin: "DTL",
    key: "pl_atlas_fontium",
    name: "Atlas Fontium",
    publisher: null,
    type: "ACADEMIC",
    granularity: "PLACE",
    scope: ["PL"],
    tier: "C_SCHOLARLY_SECONDARY",
    holds: "Historical geography layers (OGC services and downloads).",
    homepage: "https://atlasfontium.pl/en/dataatlasfontium-en/?lang=en",
    verdict: "amber; layer-dependent",
  }),
  research({
    origin: "DTL",
    key: "pl_nac",
    name: "NAC",
    publisher: "NAC",
    type: "ARCHIVE",
    granularity: "DOCUMENT",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Photographs and archive objects, reached via Szukaj w Archiwach.",
    homepage: "https://www.nac.gov.pl/archiwum-audiowizualne/zasob/",
    verdict: "object-dependent",
  }),
  research({
    origin: "DTL",
    key: "global_wikimedia",
    name: "Wikimedia",
    publisher: null,
    type: "OTHER",
    granularity: "DOCUMENT",
    scope: ["GLOBAL"],
    tier: "D_TERTIARY_LEAD",
    holds: "Historical media.",
    homepage: null,
    verdict: "licence-per-object",
  }),
  research({
    origin: "DTL",
    key: "pl_rcin",
    name: "RCIN (digitised onomastics)",
    publisher: null,
    type: "DIGITAL_LIBRARY",
    granularity: "DOCUMENT",
    scope: ["PL"],
    tier: "C_SCHOLARLY_SECONDARY",
    holds: "Historic dictionaries and scholarly publications (repository).",
    homepage: null,
    verdict: "item-dependent",
  }),
  research({
    origin: "DTL",
    key: "global_forebears",
    name: "Forebears",
    publisher: null,
    type: "COMMERCIAL_DATABASE",
    granularity: "SURNAME",
    scope: ["GLOBAL"],
    tier: "D_TERTIARY_LEAD",
    holds: "Surname distribution (OnoGraph API).",
    homepage: null,
    verdict: "amber; contract required",
  }),
  research({
    origin: "DTL",
    key: "gb_freebmd",
    name: "FreeBMD",
    publisher: null,
    type: "COMMUNITY_INDEX",
    granularity: "PERSON",
    scope: ["GB"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Birth, marriage and death indexes for England and Wales.",
    homepage: "https://www.freebmd.org.uk/",
    verdict: "amber",
  }),
  research({
    origin: "DTL",
    key: "gb_freereg",
    name: "FreeREG",
    publisher: null,
    type: "COMMUNITY_INDEX",
    granularity: "PERSON",
    scope: ["GB"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Parish register transcriptions.",
    homepage: null,
    verdict: "amber/green",
  }),
  research({
    origin: "DTL",
    key: "gb_freecen",
    name: "FreeCEN",
    publisher: null,
    type: "COMMUNITY_INDEX",
    granularity: "PERSON",
    scope: ["GB"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Census transcriptions.",
    homepage: null,
    verdict: "amber/green",
  }),
  research({
    origin: "DTL",
    key: "ca_lac",
    name: "Canadian LAC",
    publisher: null,
    type: "ARCHIVE",
    granularity: "MIXED",
    scope: ["CA"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Census, immigration and archival records.",
    homepage: null,
    verdict: "amber; public API not verified",
  }),
  research({
    origin: "DTL",
    key: "se_riksarkivet",
    name: "Riksarkivet",
    publisher: "Riksarkivet",
    type: "ARCHIVE",
    granularity: "MIXED",
    scope: ["SE"],
    tier: "A_PRIMARY_OFFICIAL",
    holds:
      "Swedish population and church datasets (REST, OAI-PMH, IIIF, linked data); open " +
      "person data is restricted by age rules and the open APIs focus on material older " +
      "than 110 years.",
    homepage: "https://data.riksarkivet.se/",
    verdict: "green for specified open datasets; strong Phase 2 Scandinavian pilot",
  }),
  research({
    origin: "DTL",
    key: "dk_rigsarkivet",
    name: "Danish Rigsarkivet",
    publisher: null,
    type: "ARCHIVE",
    granularity: "MIXED",
    scope: ["DK"],
    tier: "A_PRIMARY_OFFICIAL",
    holds: "Church and census data.",
    homepage: null,
    verdict: "amber",
  }),
  research({
    origin: "DTL",
    key: "no_digitalarkivet",
    name: "Norway Digitalarkivet",
    publisher: null,
    type: "ARCHIVE",
    granularity: "MIXED",
    scope: ["NO"],
    tier: "A_PRIMARY_OFFICIAL",
    holds: "Historical records.",
    homepage: null,
    verdict: "amber; API/licence requires verification",
  }),
  research({
    origin: "DTL",
    key: "de_bundesarchiv",
    name: "Bundesarchiv",
    publisher: null,
    type: "ARCHIVE",
    granularity: "DOCUMENT",
    scope: ["DE"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Archival descriptions.",
    homepage: null,
    verdict: "amber; no public API confirmed",
  }),
  research({
    origin: "DTL",
    key: "fr_archives_nationales",
    name: "Archives nationales",
    publisher: null,
    type: "ARCHIVE",
    granularity: "MIXED",
    scope: ["FR"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Archival inventories, nominal and geographic datasets, digitised corpora.",
    homepage:
      "https://www.archives-nationales.culture.gouv.fr/ouverture-des-donnees-des-archives-nationales",
    verdict: "green/amber",
  }),
  research({
    origin: "DTL",
    key: "it_antenati",
    name: "Antenati",
    publisher: "Italian State Archives / Ministry ecosystem",
    type: "ARCHIVE",
    granularity: "DOCUMENT",
    scope: ["IT"],
    tier: "A_PRIMARY_OFFICIAL",
    holds: "Civil registers: births, marriages, deaths.",
    homepage: "https://icar.cultura.gov.it/sistemi-e-portali/antenati",
    verdict: "amber; public API none confirmed",
  }),
  research({
    origin: "DTL",
    key: "es_pares",
    name: "PARES",
    publisher: null,
    type: "ARCHIVE",
    granularity: "DOCUMENT",
    scope: ["ES"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "Spanish archival descriptions and digitised documents.",
    homepage: "https://datos.gob.es/es/catalogo/e05234201-pares-portal-de-archivos-espanoles",
    verdict: "amber; no public general API verified",
  }),
];

// ---------------------------------------------------------------------------
// Research only — docs/sources/candidate-sources.md, 11 entries
// ---------------------------------------------------------------------------

const RESEARCH_CANDIDATES: readonly CatalogueEntry[] = [
  research({
    origin: "CANDIDATES",
    key: "pl_gus_population_by_sex",
    name: "Ludność. Stan i struktura — population by sex",
    publisher: "GUS",
    type: "OFFICIAL_DATASET",
    granularity: "MIXED",
    scope: ["PL"],
    tier: "A_PRIMARY_OFFICIAL",
    holds:
      "Total population by sex at 31 December, by territorial unit. Context only: not a " +
      "compatible denominator for PESEL counts.",
    homepage:
      "https://stat.gov.pl/obszary-tematyczne/ludnosc/ludnosc/ludnosc-stan-i-struktura-oraz-ruch-naturalny-w-przekroju-terytorialnym-w-2025-r-stan-w-dniu-31-grudnia,6,40.html",
    verdict: "VERIFIED 2026-09-24; feeds context only",
  }),
  research({
    origin: "CANDIDATES",
    key: "pl_registered_residence_counts",
    name: "Liczba osób zameldowanych na pobyt stały (dane.gov.pl dataset 1082)",
    publisher: null,
    type: "OFFICIAL_DATASET",
    granularity: "MIXED",
    scope: ["PL"],
    tier: "A_PRIMARY_OFFICIAL",
    holds:
      "People registered for permanent residence, by commune, from the PESEL register. A " +
      "same-register denominator for a per-voivodeship share, not for the national files.",
    homepage: "https://dane.gov.pl/pl/dataset/1082,liczba-osob-zameldowanych-na-pobyt-stay",
    verdict:
      "VERIFIED 2026-09-24; CC0 1.0 stated by the publisher; usable for a per-voivodeship " +
      "share provided the reference-date difference is stated",
  }),
  research({
    origin: "CANDIDATES",
    key: "pl_ksiega_adresowa_polski",
    name: "Księga Adresowa Polski (1926/27, 1928, 1929, 1930)",
    publisher: null,
    type: "PUBLICATION",
    granularity: "PERSON",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds:
      "Surname, locality, district, voivodeship and occupation of business owners and " +
      "craftsmen only: occurrences, never a distribution.",
    homepage:
      "https://sbc.org.pl/dlibra/publication/1115789/edition/1018507/ksiega-adresowa-polski-wraz-z-w-m-gdanskiem-dla-handlu-przemyslu-rzemiosl-i-rolnictwa-1929",
    verdict: "Stage 3 discovery candidate; not rights-reviewed",
  }),
  research({
    origin: "CANDIDATES",
    key: "hist_verlustliste_austria_hungary",
    name: "Verlustliste — Austro-Hungarian casualty lists, 1914–1919",
    publisher: null,
    type: "PUBLICATION",
    granularity: "PERSON",
    scope: ["HISTORICAL_AUSTRIA_HUNGARY"],
    tier: "A_PRIMARY_OFFICIAL",
    holds:
      "Surname, home municipality and district, year, list number and page; strongest for " +
      "Galicia. The Prussian lists are still to confirm and are not catalogued.",
    homepage: "https://anno.onb.ac.at/cgi-content/anno?aid=vll",
    verdict: "Stage 3 discovery candidate; not rights-reviewed",
  }),
  research({
    origin: "CANDIDATES",
    key: "pl_lista_strat_1918_1920",
    name: "Lista strat Wojska Polskiego. Polegli i zmarli w wojnach 1918–1920 (1934)",
    publisher: "Wojskowe Biuro Historyczne",
    type: "PUBLICATION",
    granularity: "PERSON",
    scope: ["PL"],
    tier: "A_PRIMARY_OFFICIAL",
    holds:
      "Polish soldiers killed or died in the wars of 1918–1920; place of origin still to be checked.",
    homepage:
      "https://jbc.bj.uj.edu.pl/dlibra/publication/263227/edition/251272/lista-strat-wojska-polskiego-polegli-i-zmarli-w-wojnach-1918-1920",
    verdict:
      "(search summary) public domain; the straty.genealodzy.pl index is PTG's work, so the " +
      "PTG partnership rule applies to it",
  }),
  research({
    origin: "CANDIDATES",
    key: "pl_ihpan_slownik_historyczno_geograficzny",
    name: "Słownik historyczno-geograficzny ziem polskich w średniowieczu (electronic edition)",
    publisher: "IH PAN",
    type: "ACADEMIC",
    granularity: "MIXED",
    scope: ["PL"],
    tier: "C_SCHOLARLY_SECONDARY",
    holds: "Persons recorded at medieval localities, with dates and source references.",
    homepage: "https://www.slownik.ihpan.edu.pl/",
    verdict: "Stage 3 discovery candidate; not rights-reviewed",
  }),
  research({
    origin: "CANDIDATES",
    key: "pl_slownik_geograficzny_krolestwa_polskiego",
    name: "Słownik geograficzny Królestwa Polskiego i innych krajów słowiańskich (1880–1902)",
    publisher: null,
    type: "PUBLICATION",
    granularity: "PLACE",
    scope: ["HISTORICAL_POLISH_AND_SLAVIC_LANDS"],
    tier: "C_SCHOLARLY_SECONDARY",
    holds:
      "Place names with German, Russian and Latin variants, commune, parish, district, governorate.",
    homepage: "http://dir.icm.edu.pl/pl/Slownik_geograficzny/",
    verdict: "Stage 4 discovery candidate; not rights-reviewed",
  }),
  research({
    origin: "CANDIDATES",
    key: "pl_skorowidz_miejscowosci_1921",
    name: "Skorowidz miejscowości Rzeczypospolitej Polskiej (1923–1926)",
    publisher: "GUS",
    type: "PUBLICATION",
    granularity: "PLACE",
    scope: ["PL"],
    tier: "A_PRIMARY_OFFICIAL",
    holds:
      "Localities from the 1921 census: name, type, commune, district, voivodeship, " +
      "population. Religion and nationality columns are not used.",
    homepage:
      "https://polona.pl/item/skorowidz-miejscowosci-rzeczypospolitej-polskiej-opracowany-na-podstawie-wynikow,NjcwOTY1OTU/",
    verdict: "Stage 4 discovery candidate; not rights-reviewed",
  }),
  research({
    origin: "CANDIDATES",
    key: "hist_gemeindelexikon_galizien_1907",
    name: "Gemeindelexikon, vol. 12 Galizien (1907)",
    publisher: null,
    type: "PUBLICATION",
    granularity: "PLACE",
    scope: ["HISTORICAL_GALICIA"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds: "German and Polish commune names, district, parish and civil registry office.",
    homepage: "http://www.halgal.com/gemeindelexikon.html",
    verdict: "Stage 4 discovery candidate; not rights-reviewed",
  }),
  research({
    origin: "CANDIDATES",
    key: "pl_rymut_slownik_nazwisk_1990",
    name: "Słownik nazwisk współcześnie w Polsce używanych (1992–1994)",
    publisher: "K. Rymut (ed.)",
    type: "DICTIONARY",
    granularity: "SURNAME",
    scope: ["PL"],
    tier: "B_AUTHORITATIVE_INDEX",
    holds:
      "Bearers (total, male, female) by the 49 voivodeships, from 1990 PESEL data: an older " +
      "regional distribution, always shown with its 1990 date and never as current.",
    homepage: "https://rcin.org.pl/ijp/dlibra/publication/15152/",
    verdict: "(search summary) scans with OCR, no login required; rights to confirm",
  }),
  research({
    origin: "CANDIDATES",
    key: "us_census_surnames",
    name: "US Census Bureau surname files",
    publisher: "US Census Bureau",
    type: "OFFICIAL_DATASET",
    granularity: "SURNAME",
    scope: ["US"],
    tier: "A_PRIMARY_OFFICIAL",
    holds:
      "Surnames occurring 100 or more times, with count and rank; releases named in the " +
      "research: 1990, 2000, 2010, 2020. Race and ethnicity columns are never used; names are " +
      "upper-case without diacritics and are never merged with Polish forms automatically.",
    homepage: "https://www.census.gov/data/developers/data-sets/surnames.html",
    verdict:
      "2010 file VERIFIED 2026-09-24; 1990, 2000 and 2020 files acquired 2026-09-18 and not " +
      "in the product (INVENTORY.md); terms not assessed",
  }),
];

// ---------------------------------------------------------------------------
// Research only — docs/sources/INVENTORY.md, 3 entries
// ---------------------------------------------------------------------------

const RESEARCH_INVENTORY: readonly CatalogueEntry[] = [
  research({
    origin: "INVENTORY",
    key: "pl_morfeusz",
    name: "Morfeusz — Polish morphological dictionary",
    publisher: null,
    type: "DICTIONARY",
    granularity: "MIXED",
    scope: ["PL"],
    tier: "C_SCHOLARLY_SECONDARY",
    holds:
      "Inflection and word formation. Morphology, not etymology: it may not be used as a " +
      "SURNAME_MEANING source (ADR-0008; INVENTORY.md §4).",
    homepage: null,
    verdict: "acquired 2026-09-18; not in the product; terms not assessed",
  }),
  research({
    origin: "INVENTORY",
    key: "fr_insee_surnames",
    name: "INSEE surname files (national and by department)",
    publisher: "INSEE",
    type: "OFFICIAL_DATASET",
    granularity: "SURNAME",
    scope: ["FR"],
    tier: "A_PRIMARY_OFFICIAL",
    holds: "A birth-cohort surname dataset, national and by department; not comparable with PESEL.",
    homepage: null,
    verdict: "acquired 2026-09-18; not in the product; terms not assessed",
  }),
  research({
    origin: "INVENTORY",
    key: "be_statbel_surnames",
    name: "Statbel surname lists (top 10,000 2017–2026, regions, municipalities)",
    publisher: "Statbel",
    type: "OFFICIAL_DATASET",
    granularity: "SURNAME",
    scope: ["BE"],
    tier: "A_PRIMARY_OFFICIAL",
    holds:
      "Top-10,000 surname lists for 2017–2026, by region and municipality, with municipal " +
      "suppression; not comparable with PESEL.",
    homepage: null,
    verdict: "acquired 2026-09-18; not in the product; terms not assessed",
  }),
];

/** The whole catalogue, in a fixed order: classified first, then research. */
export const SOURCE_CATALOGUE: readonly CatalogueEntry[] = Object.freeze([
  ...CLASSIFIED,
  ...RESEARCH_GSA,
  ...RESEARCH_DTL,
  ...RESEARCH_CANDIDATES,
  ...RESEARCH_INVENTORY,
]);
