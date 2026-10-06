/**
 * A first name's figures as children's first names, for the baby-names page
 * (TASK-141, D-044): its active `GIVEN_NAME_BIRTH_COUNT`, `GIVEN_NAME_BIRTH_RANK`
 * and `GIVEN_NAME_BIRTH_TREND` claims (TASK-137, TASK-139), each with its
 * citation, per sex.
 *
 * A name's figures come from its claims only (ADR-0001, ADR-0032 consequences).
 * The stored lists (`given_name_birth_lists`) give what a list is, never what a
 * name did: its year, its sex and its cut-off, so that a name absent from a
 * list reads "fewer than the cut-off", never 0 (ADR-0042 §2).
 *
 * Older lists' claims stay ACTIVE when a new year arrives (ADR-0043 §7), and
 * every claim key names its lists, so a claim is taken only when its key names
 * a list on an ACTIVE source record; the trend only when its key names the
 * sex's current latest list. The boys' and the girls' figures are never summed.
 */
import { sql } from "kysely";
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import type { CitationDto } from "@name-atlas/contracts";
import { canonicalKey } from "@name-atlas/resolver";
import { evaluateSurface, sectionEligibility } from "./rights.js";
import type { EffectiveRights, Surface } from "./rights.js";
import { GIVEN_NAME_BIRTH_TREND_METHOD_VERSION } from "./version.js";

export type BirthSex = "MALE" | "FEMALE";
export const BIRTH_SEXES: readonly BirthSex[] = ["MALE", "FEMALE"];

/** The first year the full history shows (D-044 §2: "every year since 2000"). */
export const BIRTH_HISTORY_FIRST_YEAR = 2000;

/** A typed first name longer than this is not looked up. */
export const BIRTH_NAME_MAX_LENGTH = 60;

/** One stored list, as the page needs it: what it is, never a name's figure. */
export interface BirthListInfo {
  readonly list_id: string;
  readonly birth_year: number;
  readonly sex: BirthSex;
  /** The publisher's cut-off: a name given fewer times is not on the list. */
  readonly publication_threshold: number;
}

export interface BirthCountFigure {
  readonly claim_id: string;
  readonly count: number;
  readonly citation: CitationDto;
}

export interface BirthRankFigure {
  readonly claim_id: string;
  readonly rank: number;
  readonly universe_size: number;
  readonly citation: CitationDto;
}

/** One year of one sex. Both figures null: the name is not on that year's list. */
export interface BirthYearFigures {
  readonly birth_year: number;
  /** Null when no list of that year and sex is stored. */
  readonly list: BirthListInfo | null;
  readonly count: BirthCountFigure | null;
  readonly rank: BirthRankFigure | null;
}

export interface BirthTrendFigure {
  readonly claim_id: string;
  readonly direction: "RISING" | "STEADY" | "FALLING";
  readonly latest_year: number;
  readonly earlier_year: number;
  readonly window_years: number;
  readonly change_percent: number;
  readonly citations: readonly CitationDto[];
}

export interface BirthSexFigures {
  readonly sex: BirthSex;
  /** The latest year's figures; null when no list of this sex is stored. */
  readonly latest: BirthYearFigures | null;
  /** Null when no trend claim stands on the current latest list. */
  readonly trend: BirthTrendFigure | null;
  /** Every year from 2000 to the latest, oldest first; null unless asked for. */
  readonly history: readonly BirthYearFigures[] | null;
}

export interface BirthNameFacts {
  readonly given_name: { readonly id: string; readonly display_name: string };
  /**
   * READY: the figures below. NOT_ON_ANY_LIST: no count claim on any stored
   * list. RIGHTS_BLOCKED: the surface may not show the claims it has.
   */
  readonly state: "READY" | "NOT_ON_ANY_LIST" | "RIGHTS_BLOCKED";
  /** Boys, then girls; empty unless READY. */
  readonly sexes: readonly BirthSexFigures[];
}

export type BirthNameLookup =
  | { readonly kind: "FOUND"; readonly given_name: { id: string; display_name: string } }
  /** No `given_names` row has the typed form's key. */
  | { readonly kind: "NOT_FOUND" }
  /** A flagged form (ADR-0032 §4): stored, never shown until reviewed. */
  | { readonly kind: "HELD" }
  /** Empty, too long, or nothing left after normalising. */
  | { readonly kind: "INVALID" };

/** The typed name through the resolver's `canonicalKey` to a `given_names` row. */
export async function findBirthGivenName(db: Kysely<DB>, typed: string): Promise<BirthNameLookup> {
  const trimmed = typed.trim();
  if (trimmed === "" || [...trimmed].length > BIRTH_NAME_MAX_LENGTH) return { kind: "INVALID" };
  const key = canonicalKey(trimmed);
  if (key === "") return { kind: "INVALID" };
  const row = await db
    .selectFrom("given_names")
    .select(["given_name_id", "canonical_display", "form_review"])
    .where("canonical_key", "=", key)
    .executeTakeFirst();
  if (row === undefined) return { kind: "NOT_FOUND" };
  if (row.form_review !== null) return { kind: "HELD" };
  return {
    kind: "FOUND",
    given_name: { id: row.given_name_id, display_name: row.canonical_display },
  };
}

/** One claim joined to one of its citations, as {@link readBirthNameFacts} reads it. */
export interface BirthClaimRow {
  readonly claim_id: string;
  readonly claim_type: string;
  readonly claim_key: string;
  readonly method_version: string;
  readonly payload: string;
  readonly citation: CitationDto;
  readonly rights: EffectiveRights;
}

interface ClaimRowSql {
  claim_id: string;
  claim_type: string;
  claim_key: string;
  method_version: string;
  payload: string;
  citation_id: string;
  citation_title: string;
  citation_publisher: string | null;
  citation_publication_date: string | null;
  citation_url: string | null;
  citation_locator: string | null;
  citation_retrieved_at: string | null;
  citation_source_page_url: string | null;
  source_type: string;
  attribution_text: string | null;
  terms_version: string | null;
  automated_access: string;
  commercial_use: string;
  redistribution: string;
  metadata_rights: string;
  review_status: string;
}

/** The lists on ACTIVE source records. */
export async function readActiveBirthLists(db: Kysely<DB>): Promise<BirthListInfo[]> {
  const rows = await db
    .selectFrom("given_name_birth_lists as l")
    .innerJoin("source_records as sr", "sr.source_record_id", "l.source_record_id")
    .select(["l.given_name_birth_list_id", "l.birth_year", "l.sex", "l.publication_threshold"])
    .where("sr.record_status", "=", "ACTIVE")
    .orderBy("l.birth_year")
    .orderBy("l.sex")
    .execute();
  return rows.flatMap((r) =>
    r.sex === "MALE" || r.sex === "FEMALE"
      ? [
          {
            list_id: r.given_name_birth_list_id,
            birth_year: r.birth_year,
            sex: r.sex,
            publication_threshold: r.publication_threshold,
          },
        ]
      : [],
  );
}

/**
 * The name's figures as `surface` may show them; with `history`, every year
 * from 2000 too. The claim types are compared as text, so a database without
 * migration 0041 finds none instead of failing.
 */
export async function readBirthNameFacts(
  db: Kysely<DB>,
  givenName: { readonly id: string; readonly display_name: string },
  options: { readonly surface: Surface; readonly history: boolean },
): Promise<BirthNameFacts> {
  const lists = await readActiveBirthLists(db);
  const result = await sql<ClaimRowSql>`
    SELECT
      c.claim_id::text                 AS claim_id,
      c.claim_type::text               AS claim_type,
      c.claim_key                      AS claim_key,
      c.method_version                 AS method_version,
      c.structured_value::text         AS payload,
      cit.citation_id::text            AS citation_id,
      cit.title                        AS citation_title,
      cit.publisher                    AS citation_publisher,
      cit.publication_date             AS citation_publication_date,
      cit.url_or_reference             AS citation_url,
      cit.supporting_locator           AS citation_locator,
      to_char(cit.accessed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                                       AS citation_retrieved_at,
      src.homepage_or_reference_url    AS citation_source_page_url,
      src.source_type::text            AS source_type,
      rp.attribution_text              AS attribution_text,
      rp.terms_version                 AS terms_version,
      rp.automated_access::text        AS automated_access,
      rp.commercial_use::text          AS commercial_use,
      rp.redistribution::text          AS redistribution,
      rp.metadata_rights::text         AS metadata_rights,
      rp.review_status::text           AS review_status
    FROM claims c
    JOIN citations cit             ON cit.claim_id = c.claim_id
    JOIN sources src               ON src.source_id = cit.source_id
    JOIN rights_profiles rp        ON rp.rights_profile_id = cit.rights_profile_id
    WHERE c.subject_entity_id = ${givenName.id}::uuid
      AND c.claim_type::text IN
        ('GIVEN_NAME_BIRTH_COUNT', 'GIVEN_NAME_BIRTH_RANK', 'GIVEN_NAME_BIRTH_TREND')
      AND c.claim_status = 'ACTIVE'
    ORDER BY c.claim_type::text, c.claim_key, cit.citation_id
  `.execute(db);
  const rows: BirthClaimRow[] = result.rows.map((r) => ({
    claim_id: r.claim_id,
    claim_type: r.claim_type,
    claim_key: r.claim_key,
    method_version: r.method_version,
    payload: r.payload,
    citation: {
      id: r.citation_id,
      title: r.citation_title,
      publisher: r.citation_publisher,
      publication_date: r.citation_publication_date,
      source_type: r.source_type,
      locator: r.citation_locator,
      url: r.citation_url,
      attribution: r.attribution_text,
      terms: r.terms_version,
      retrieved_at: r.citation_retrieved_at,
      source_page_url: r.citation_source_page_url,
    },
    rights: {
      automated_access: r.automated_access,
      commercial_use: r.commercial_use,
      redistribution: r.redistribution,
      metadata_rights: r.metadata_rights,
      review_status: r.review_status,
    },
  }));
  return assembleBirthNameFacts(givenName, lists, rows, options);
}

interface CountValue {
  readonly count: number;
}
interface RankValue {
  readonly rank: number;
  readonly universe_size: number;
}
interface TrendValue {
  readonly direction: "RISING" | "STEADY" | "FALLING";
  readonly latest: { readonly birth_year: number };
  readonly earlier: { readonly birth_year: number };
  readonly window_years: number;
  readonly change_percent: number;
}

/**
 * The selection rules, pure: which claims stand on which current list, the
 * latest list per sex, the trend on it, and the history. Exported for tests.
 */
export function assembleBirthNameFacts(
  givenName: { readonly id: string; readonly display_name: string },
  lists: readonly BirthListInfo[],
  rows: readonly BirthClaimRow[],
  options: { readonly surface: Surface; readonly history: boolean },
): BirthNameFacts {
  const byId = new Map(lists.map((l) => [l.list_id, l]));
  const byYearSex = new Map<string, BirthListInfo>();
  for (const list of lists) {
    const key = `${list.birth_year}|${list.sex}`;
    // ADR-0042 §3: one list per year and sex, never two to choose between or sum.
    if (byYearSex.has(key)) throw new Error(`two active lists for ${key} (ADR-0042 §3)`);
    byYearSex.set(key, list);
  }

  // Key parts: TYPE|given_name_id|list_id (count, rank) or TYPE|given_name_id|latest|earlier (trend).
  const parts = (row: BirthClaimRow) => row.claim_key.split("|");
  const onCurrentList = (row: BirthClaimRow) =>
    parts(row)[1] === givenName.id && byId.has(parts(row)[2] ?? "");
  const kept = rows.filter((row) => {
    if (!onCurrentList(row)) return false;
    if (row.claim_type === "GIVEN_NAME_BIRTH_TREND") {
      return (
        row.method_version === GIVEN_NAME_BIRTH_TREND_METHOD_VERSION &&
        byId.has(parts(row)[3] ?? "")
      );
    }
    return (
      row.claim_type === "GIVEN_NAME_BIRTH_COUNT" || row.claim_type === "GIVEN_NAME_BIRTH_RANK"
    );
  });

  const counts = new Map<string, BirthCountFigure>();
  const ranks = new Map<string, BirthRankFigure>();
  const trends = new Map<string, { row: BirthClaimRow; citations: CitationDto[] }>();
  for (const row of kept) {
    const listId = parts(row)[2] ?? "";
    if (row.claim_type === "GIVEN_NAME_BIRTH_COUNT" && !counts.has(listId)) {
      const value = JSON.parse(row.payload) as CountValue;
      counts.set(listId, { claim_id: row.claim_id, count: value.count, citation: row.citation });
    } else if (row.claim_type === "GIVEN_NAME_BIRTH_RANK" && !ranks.has(listId)) {
      const value = JSON.parse(row.payload) as RankValue;
      ranks.set(listId, {
        claim_id: row.claim_id,
        rank: value.rank,
        universe_size: value.universe_size,
        citation: row.citation,
      });
    } else if (row.claim_type === "GIVEN_NAME_BIRTH_TREND") {
      // A trend cited to two records comes as two rows: one claim, both citations.
      const found = trends.get(listId);
      if (found === undefined) trends.set(listId, { row, citations: [row.citation] });
      else if (found.row.claim_id === row.claim_id) found.citations.push(row.citation);
    }
  }

  if (counts.size === 0) return { given_name: givenName, state: "NOT_ON_ANY_LIST", sexes: [] };

  const used = kept.filter((row) => {
    const listId = parts(row)[2] ?? "";
    if (row.claim_type === "GIVEN_NAME_BIRTH_COUNT")
      return counts.get(listId)?.claim_id === row.claim_id;
    if (row.claim_type === "GIVEN_NAME_BIRTH_RANK")
      return ranks.get(listId)?.claim_id === row.claim_id;
    return trends.get(listId)?.row.claim_id === row.claim_id;
  });
  const rights = used.map((row) => row.rights);
  const [first] = rights;
  if (first !== undefined) {
    const eligibility = sectionEligibility(
      evaluateSurface(first, options.surface),
      rights,
      options.surface,
    );
    if (eligibility.decision === "BLOCKED") {
      return { given_name: givenName, state: "RIGHTS_BLOCKED", sexes: [] };
    }
  }

  const yearOf = (list: BirthListInfo | null, year: number): BirthYearFigures => ({
    birth_year: year,
    list,
    count: list === null ? null : (counts.get(list.list_id) ?? null),
    rank: list === null ? null : (ranks.get(list.list_id) ?? null),
  });

  const sexes = BIRTH_SEXES.map((sex): BirthSexFigures => {
    const ofSex = lists.filter((l) => l.sex === sex);
    const latestList = ofSex.reduce<BirthListInfo | null>(
      (best, l) => (best === null || l.birth_year > best.birth_year ? l : best),
      null,
    );
    if (latestList === null) return { sex, latest: null, trend: null, history: null };
    const trend = trends.get(latestList.list_id);
    const trendValue = trend === undefined ? null : (JSON.parse(trend.row.payload) as TrendValue);
    let history: BirthYearFigures[] | null = null;
    if (options.history) {
      history = [];
      for (let year = BIRTH_HISTORY_FIRST_YEAR; year <= latestList.birth_year; year++) {
        history.push(yearOf(byYearSex.get(`${year}|${sex}`) ?? null, year));
      }
    }
    return {
      sex,
      latest: yearOf(latestList, latestList.birth_year),
      trend:
        trend === undefined || trendValue === null
          ? null
          : {
              claim_id: trend.row.claim_id,
              direction: trendValue.direction,
              latest_year: trendValue.latest.birth_year,
              earlier_year: trendValue.earlier.birth_year,
              window_years: trendValue.window_years,
              change_percent: trendValue.change_percent,
              citations: trend.citations,
            },
      history,
    };
  });
  return { given_name: givenName, state: "READY", sexes };
}
