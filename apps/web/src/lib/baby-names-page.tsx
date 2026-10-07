import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { BABY_NAMES_FULL_TIERS, createAccountsDb, createPurchases } from "@name-atlas/accounts";
import type { Purchases } from "@name-atlas/accounts";
import type { CitationDto } from "@name-atlas/contracts";
import {
  BIRTH_HISTORY_FIRST_YEAR,
  BIRTH_SEXES,
  findBirthGivenName,
  readActiveBirthLists,
  readBirthNameFacts,
  readGivenNameFacts,
  readGivenNameMeaning,
  stockListOfSex,
} from "@name-atlas/truth";
import type {
  BirthCountFigure,
  BirthListInfo,
  BirthNameFacts,
  BirthNameLookup,
  BirthSex,
  BirthSexFigures,
  BirthYearFigures,
  GivenNameFacts,
  GivenNameMeaningFacts,
  GivenNameMeaningWork,
} from "@name-atlas/truth";
import { accountPath } from "./account-paths.js";
import { accountsRuntime } from "./accounts-runtime.js";
import {
  BABY_NAMES_COMPARE_PATHS,
  BABY_NAMES_FIELD,
  BABY_NAMES_LIST_PATHS,
  BABY_NAMES_PATHS,
  BABY_NAMES_SHARE_PATHS,
  babyNamesEnabled,
  babyNamesFreeUntil,
  readBabyNamesAccess,
} from "./baby-names-config.js";
import { BABY_NAMES_TEXT } from "./baby-names-text.js";
import { COUPLE_NAMES_PATHS, coupleNamesEnabled } from "./couple-names-config.js";
import { db } from "./db.js";
import { ConfidenceBadge, Tabs } from "../design-system/components/index.js";
import { formatDate, formatDecimal, formatInteger, formatPercent } from "./messages.js";
import type { Lang } from "./messages.js";
import { ORIGINS } from "./given-name-meaning-view.js";
import { sessionCookieName } from "./session-cookie.js";
import { SiteShell } from "./site-shell.js";

/**
 * The baby-names page (TASK-141, D-044): `/pl/imiona-dla-dziecka` and
 * `/en/baby-names`, one page with a search box (D-044 §7).
 *
 * Signed out, it explains and links to sign-in. Signed in, a typed first name's
 * figures for boys and girls apart, read from its claims
 * (`readBirthNameFacts`): the latest year's count, rank and direction for
 * everyone, and every year since 2000 for an account holding a tier that
 * includes it (`BABY_NAMES_FULL_TIERS`). Nobody else is offered a way to pay:
 * the 8,99 zł tier is "Wkrótce", with no button (ADR-0023 §2.5).
 *
 * TASK-145: under each sex, apart from the birth-year figures, the people
 * holding the name in the PESEL register's list of men or of women
 * (`readGivenNameFacts`, claims only): free for every signed-in reader. The
 * two lists are never summed, and never added to a birth-year figure. To move
 * the register block into the 8,99 zł view, render it only when `full` is true.
 *
 * TASK-151 (ADR-0046, Brand System v1): the result is a family of tiles in
 * the `.atlas-v1` scope. Free, per sex: the hero (the count as the one big
 * number, its share of the list's children, the rank with a track), "1 na N"
 * with a dot grid, the direction with the two shares the claim was decided on,
 * the register; then the meaning in a work's own words (ADR-0045) or one line
 * saying there is none, and the locked card. Entitled: a bar chart of every
 * year from 2000, the "×N" against 2000, three callouts, a rank ladder and the
 * year table. Every figure is a claim's or the list's stored `people_sum`
 * through `packages/truth`; nothing is computed here but formatting and
 * geometry.
 *
 * A 404 unless `BABY_NAMES_ENABLED` is `1` and accounts are on; `noindex`;
 * `private, no-store` from the middleware.
 */

export const BABY_NAMES_METADATA: Readonly<Record<Lang, Metadata>> = {
  pl: { title: "Imiona dla dziecka · Name Atlas", robots: { index: false, follow: false } },
  en: { title: "Baby names · Name Atlas", robots: { index: false, follow: false } },
};

type Query = Readonly<Record<string, string | string[] | undefined>>;

export interface BabyNamesDeps {
  readonly findName: (typed: string) => Promise<BirthNameLookup>;
  readonly readFacts: (
    givenName: { readonly id: string; readonly display_name: string },
    history: boolean,
    /** Read on the PAID surface: true only for an account holding the view (TASK-160). */
    paid?: boolean,
  ) => Promise<BirthNameFacts>;
  /** The name's register (stock) facts, claims only (TASK-145). */
  readonly readStock: (givenName: {
    readonly id: string;
    readonly display_name: string;
  }) => Promise<GivenNameFacts>;
  /** The stored birth lists, for a name that is on none of them. */
  readonly readLists: () => Promise<readonly BirthListInfo[]>;
  /** Whether the account holds a tier that includes the full figures. */
  readonly hasFullView: (userId: string) => Promise<boolean>;
  /** The free window's end while it is open (TASK-160, D-051); absent or null: no window. */
  readonly freeUntil?: () => Date | null;
  /**
   * The name's origin and meaning as the works state them (TASK-147,
   * ADR-0045), on the PAID surface for an account holding the view and FREE
   * otherwise, the free window included; the rights decide what each may see.
   */
  readonly readMeaning: (
    givenName: { readonly id: string; readonly display_name: string },
    paid: boolean,
  ) => Promise<GivenNameMeaningFacts>;
}

export type BabyNamesData =
  | { readonly kind: "signed-out"; readonly lang: Lang; readonly signInHref: string }
  | {
      readonly kind: "signed-in";
      readonly lang: Lang;
      /** What was typed, as typed (trimmed); "" before a search. */
      readonly typed: string;
      readonly full: boolean;
      /** The free window's end (ISO) when `full` comes from it alone (TASK-160), else null. */
      readonly freeUntil: string | null;
      /** The sex whose section comes first and whose tab is current (`?sex=boys|girls`). */
      readonly focus: BirthSex;
      readonly result:
        | { readonly kind: "NONE" }
        | { readonly kind: "INVALID" }
        | { readonly kind: "NOT_FOUND" }
        | { readonly kind: "HELD" }
        | {
            readonly kind: "FACTS";
            readonly facts: BirthNameFacts;
            readonly stock: GivenNameFacts;
            readonly meaning: GivenNameMeaningFacts;
          }
        /** On no birth list, but the register holds it: the register block and each sex's cut-off. */
        | {
            readonly kind: "STOCK_ONLY";
            readonly name: { readonly id: string; readonly display_name: string };
            readonly stock: GivenNameFacts;
            readonly cutoffs: readonly BirthCutoff[];
            readonly meaning: GivenNameMeaningFacts;
          };
    };

/** The sex tabs' query field and values, the list page's (TASK-146) and the share cards' (TASK-152). */
export const BABY_NAMES_SEX_FIELD = "sex";
export const BABY_NAMES_SEX_VALUES: Readonly<Record<string, BirthSex>> = {
  boys: "MALE",
  girls: "FEMALE",
};
export const BABY_NAMES_SEX_PARAM: Readonly<Record<BirthSex, string>> = {
  MALE: "boys",
  FEMALE: "girls",
};
const SEX_VALUES = BABY_NAMES_SEX_VALUES;
const SEX_PARAM = BABY_NAMES_SEX_PARAM;

/** The latest stored list of one sex: the year and cut-off a rare name stayed below. */
export interface BirthCutoff {
  readonly sex: BirthSex;
  readonly birth_year: number;
  readonly threshold: number;
}

function cutoffsOf(lists: readonly BirthListInfo[]): BirthCutoff[] {
  return BIRTH_SEXES.flatMap((sex) => {
    const latest = lists
      .filter((l) => l.sex === sex)
      .reduce<BirthListInfo | null>(
        (best, l) => (best === null || l.birth_year > best.birth_year ? l : best),
        null,
      );
    return latest === null
      ? []
      : [{ sex, birth_year: latest.birth_year, threshold: latest.publication_threshold }];
  });
}

function first(query: Query, key: string): string {
  const value = query[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** What the page shows, from the session and the query; no rendering, no cookie. */
export async function loadBabyNames(input: {
  readonly lang: Lang;
  readonly query: Query;
  readonly session: { readonly userId: string } | null;
  readonly deps: BabyNamesDeps;
}): Promise<BabyNamesData> {
  const { lang, session, deps } = input;
  if (session === null) {
    return {
      kind: "signed-out",
      lang,
      signInHref: accountPath(lang, "sign-in", { next: BABY_NAMES_PATHS[lang] }),
    };
  }
  const typed = first(input.query, BABY_NAMES_FIELD[lang]).trim();
  const asked = SEX_VALUES[first(input.query, BABY_NAMES_SEX_FIELD)] ?? null;
  const { full, paid, freeUntil } = await readBabyNamesAccess(deps, session.userId);
  const base = {
    kind: "signed-in",
    lang,
    typed,
    full,
    freeUntil: freeUntil?.toISOString() ?? null,
    focus: asked ?? "MALE",
  } as const;
  if (typed === "") return { ...base, result: { kind: "NONE" } };
  const lookup = await deps.findName(typed);
  if (lookup.kind !== "FOUND") return { ...base, result: { kind: lookup.kind } };
  const [facts, stock, meaning] = await Promise.all([
    deps.readFacts(lookup.given_name, full, paid),
    deps.readStock(lookup.given_name),
    deps.readMeaning(lookup.given_name, paid),
  ]);
  if (facts.state === "NOT_ON_ANY_LIST") {
    if (stock.state === "UNAVAILABLE") return { ...base, result: { kind: "NOT_FOUND" } };
    const cutoffs = cutoffsOf(await deps.readLists());
    const result = {
      kind: "STOCK_ONLY",
      name: lookup.given_name,
      stock,
      cutoffs,
      meaning,
    } as const;
    const sexes = stockSexes(stock);
    return { ...base, focus: sexes.find((s) => s === asked) ?? sexes[0] ?? "MALE", result };
  }
  // Only the sexes the name is on (TASK-157). Unasked, the one with a count on its
  // latest list comes first; boys when both or neither have one.
  const shown = shownSexes(facts);
  const focus =
    shown.find((s) => s.sex === asked)?.sex ??
    shown.find((s) => s.latest?.count !== null && s.latest !== null)?.sex ??
    shown[0]?.sex ??
    "MALE";
  return { ...base, focus, result: { kind: "FACTS", facts, stock, meaning } };
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

/** "Imiona nadawane dzieciom w Polsce, Ministerstwo Cyfryzacji, resource 1159538". */
export function Source({ citations, lang }: { citations: readonly CitationDto[]; lang: Lang }) {
  const t = BABY_NAMES_TEXT[lang];
  return (
    <p className="baby-source note">
      {t.sourceLine}:{" "}
      {citations.map((c, i) => {
        const resource = c.locator?.startsWith("resource:")
          ? t.resource(c.locator.slice("resource:".length))
          : null;
        const label = [c.title, c.publisher, resource].filter((x) => x !== null).join(", ");
        return (
          <span key={c.id}>
            {i > 0 ? "; " : ""}
            {c.url === null || c.url === "" ? label : <a href={c.url}>{label}</a>}
          </span>
        );
      })}
    </p>
  );
}

/** Each claim has its own citation row; one source record is named once. */
function distinct(citations: readonly CitationDto[]): CitationDto[] {
  const seen = new Set<string>();
  return citations.filter((c) => {
    const key = `${c.title}|${c.locator ?? c.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function threshold(year: BirthYearFigures, lang: Lang): string {
  return year.list === null ? "" : formatInteger(year.list.publication_threshold, lang);
}

/** A share in parts per million as "3,7%": display rounding only. */
function formatShare(perMillion: number, lang: Lang): string {
  return formatPercent(perMillion / 1_000_000, lang);
}

/** A dot grid is drawn up to this many dots; above it the figure stands alone. */
export const DOT_GRID_MAX = 60;

/** The rank track's marker: rank ÷ universe_size, the left end the most common. */
export function trackPosition(rank: number, universe: number): string {
  if (universe < 1 || rank < 1) return "0%";
  return `${(Math.min(1, rank / universe) * 100).toFixed(1)}%`;
}

function rankOf(rank: { rank: number; universe_size: number }, lang: Lang): string {
  return BABY_NAMES_TEXT[lang].rankOf(
    formatInteger(rank.rank, lang),
    formatInteger(rank.universe_size, lang),
  );
}

/** The hero tile: the count as the one big number, its share, the rank with its track, the source. */
function Hero({
  latest,
  sex,
  lang,
}: {
  latest: BirthYearFigures & { count: BirthCountFigure };
  sex: BirthSex;
  lang: Lang;
}) {
  const t = BABY_NAMES_TEXT[lang];
  const citations = distinct(
    latest.rank === null ? [latest.count.citation] : [latest.count.citation, latest.rank.citation],
  );
  return (
    <section className="bn-tile bn-hero" aria-label={t.childrenIn(latest.birth_year)}>
      <p className="atlas-eyebrow bn-eyebrow">{t.eyebrowGot(latest.birth_year)}</p>
      <p className="bn-big">
        <strong data-figure="count">{formatInteger(latest.count.count, lang)}</strong>{" "}
        <span className="bn-big-noun">{t.noun[sex]}</span>
      </p>
      {latest.count.share_per_million === null ? null : (
        <p className="bn-share" data-figure="share">
          {t.shareLine(formatShare(latest.count.share_per_million, lang), sex, latest.birth_year)}
        </p>
      )}
      {latest.rank === null ? null : (
        <div
          className="bn-rank"
          data-figure="rank"
          data-rank={latest.rank.rank}
          data-of={latest.rank.universe_size}
        >
          <p className="bn-rank-line">
            <strong>{t.place(formatInteger(latest.rank.rank, lang))}</strong>{" "}
            <span>{t.ofNames(formatInteger(latest.rank.universe_size, lang))}</span>
          </p>
          <div
            className="bn-track"
            role="img"
            aria-label={t.trackLabel(
              formatInteger(latest.rank.rank, lang),
              formatInteger(latest.rank.universe_size, lang),
            )}
          >
            <span className="bn-track-line" />
            <span
              className="bn-track-mark atlas-point"
              style={{ left: trackPosition(latest.rank.rank, latest.rank.universe_size) }}
            />
          </div>
          <p className="bn-track-labels" aria-hidden="true">
            <span>{t.trackMost}</span>
            <span>{t.trackRarest}</span>
          </p>
        </div>
      )}
      <Source citations={citations} lang={lang} />
    </section>
  );
}

/** "1 na 27" with the Atlas Point dot grid when N ≤ 60; omitted when there is no share. */
function HowCommon({
  count,
  sex,
  year,
  name,
  lang,
}: {
  count: BirthCountFigure;
  sex: BirthSex;
  year: number;
  name: string;
  lang: Lang;
}) {
  const t = BABY_NAMES_TEXT[lang];
  if (count.one_in === null) return null;
  const n = formatInteger(count.one_in, lang);
  return (
    <section className="bn-tile bn-common" aria-label={t.howCommonHeading}>
      <h4 className="bn-tile-heading">{t.howCommonHeading}</h4>
      <p className="bn-one-in">
        <strong data-figure="one-in" data-one-in={count.one_in}>
          {t.oneIn(n)}
        </strong>{" "}
        <span>{t.oneInNoun[sex]}</span>
      </p>
      {count.one_in <= DOT_GRID_MAX ? (
        <div className="bn-dots" role="img" aria-label={t.dotsLabel(n)} data-dots={count.one_in}>
          {Array.from({ length: count.one_in }, (_, i) => (
            <span key={i} className={i === 0 ? "bn-dot bn-dot-lit atlas-point" : "bn-dot"} />
          ))}
        </div>
      ) : null}
      <p className="bn-caption">{t.oneInCaption(n, sex, year, name)}</p>
    </section>
  );
}

/** The direction chip, its basis, and the two shares it was decided on. */
function Direction({ figures, lang }: { figures: BirthSexFigures; lang: Lang }) {
  const t = BABY_NAMES_TEXT[lang];
  const trend = figures.trend;
  return (
    <section className="bn-tile bn-direction" aria-label={t.direction}>
      <h4 className="bn-tile-heading">{t.direction}</h4>
      <p className="bn-chip-line">
        <span
          className="atlas-badge bn-chip"
          data-figure="trend"
          data-direction={trend?.direction ?? "NONE"}
        >
          {trend === null ? "—" : t.directions[trend.direction]}
        </span>
      </p>
      {trend === null ? (
        <p className="note">{t.noTrend}</p>
      ) : (
        <>
          {trend.latest_share_per_million === null ? null : (
            <p className="bn-shares" data-figure="shares">
              {t.sharesLine(
                trend.earlier_year,
                trend.earlier_share_per_million === null
                  ? t.belowThreshold
                  : formatShare(trend.earlier_share_per_million, lang),
                trend.latest_year,
                formatShare(trend.latest_share_per_million, lang),
              )}
            </p>
          )}
          <p className="note baby-basis">
            {t.trendBasis(trend.latest_year, trend.earlier_year, trend.change_percent)}
          </p>
          <Source citations={distinct(trend.citations)} lang={lang} />
        </>
      )}
    </section>
  );
}

/** One sex's free tiles: the hero, how common, the direction, the register. */
function SexSection({
  figures,
  stock,
  name,
  current,
  lang,
}: {
  figures: BirthSexFigures;
  stock: GivenNameFacts;
  name: string;
  current: boolean;
  lang: Lang;
}) {
  const t = BABY_NAMES_TEXT[lang];
  const latest = figures.latest;
  return (
    <section
      id={`sex-${SEX_PARAM[figures.sex]}`}
      className="baby-sex bn-sex"
      data-sex={figures.sex}
      data-current={current ? "true" : undefined}
      aria-labelledby={`sex-heading-${SEX_PARAM[figures.sex]}`}
    >
      <h3 id={`sex-heading-${SEX_PARAM[figures.sex]}`} className="bn-sex-heading">
        {t.sex[figures.sex]}
      </h3>
      {latest === null ? (
        <p className="note bn-tile">{t.noList}</p>
      ) : latest.count === null ? (
        // Absent from the latest list: below its cut-off, never 0; no direction (D-044 §6).
        <p className="baby-absent bn-tile bn-absent">
          {t.belowCutoff(latest.birth_year, threshold(latest, lang))}
        </p>
      ) : (
        <>
          <Hero latest={{ ...latest, count: latest.count }} sex={figures.sex} lang={lang} />
          <HowCommon
            count={latest.count}
            sex={figures.sex}
            year={latest.birth_year}
            name={name}
            lang={lang}
          />
          <Direction figures={figures} lang={lang} />
          <ShareEntry name={name} sex={figures.sex} lang={lang} />
        </>
      )}
      <Register stock={stock} sex={figures.sex} lang={lang} />
    </section>
  );
}

/**
 * "Udostępnij" (TASK-152): the way to this sex's share cards, shown only where
 * the free view has figures to put on a card. A link to the sheet, which
 * works without script; the sheet does the sharing.
 */
function ShareEntry({ name, sex, lang }: { name: string; sex: BirthSex; lang: Lang }) {
  const t = BABY_NAMES_TEXT[lang];
  const href = `${BABY_NAMES_SHARE_PATHS[lang]}?${new URLSearchParams({
    [BABY_NAMES_FIELD[lang]]: name,
    [BABY_NAMES_SEX_FIELD]: SEX_PARAM[sex],
  }).toString()}`;
  return (
    <p className="bn-share-entry">
      <a className="bn-share-link" href={href} data-share={sex}>
        {t.shareEntry}
      </a>
      <span className="note bn-share-note">{t.shareEntryNote}</span>
    </p>
  );
}

/** The two sexes as tabs: in-page links, the current one marked by text and a rule (`aria-current`). */
function SexTabs({ lang, typed, focus }: { lang: Lang; typed: string; focus: BirthSex }) {
  const t = BABY_NAMES_TEXT[lang];
  const href = (sex: BirthSex) =>
    `${BABY_NAMES_PATHS[lang]}?${new URLSearchParams({
      [BABY_NAMES_FIELD[lang]]: typed,
      [BABY_NAMES_SEX_FIELD]: SEX_PARAM[sex],
    }).toString()}#sex-${SEX_PARAM[sex]}`;
  return (
    <Tabs className="atlas-tabs bn-tabs" aria-label={t.tabsLabel}>
      {BIRTH_SEXES.map((sex) => (
        <a
          key={sex}
          role="tab"
          className="bn-tab"
          href={href(sex)}
          aria-selected={sex === focus}
          aria-current={sex === focus ? "true" : undefined}
          data-sex={sex}
        >
          {t.sex[sex]}
        </a>
      ))}
    </Tabs>
  );
}

const CONFIDENCE_LEVELS = [
  "VERIFIED",
  "LIKELY",
  "POSSIBLE",
  "UNCONFIRMED",
  "CONFLICTING",
  "INSUFFICIENT_DATA",
] as const;
type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];
function confidenceLevel(status: string): ConfidenceLevel | null {
  return (CONFIDENCE_LEVELS as readonly string[]).includes(status)
    ? (status as ConfidenceLevel)
    : null;
}

function originWords(work: GivenNameMeaningWork, lang: Lang): string | null {
  if (work.origin === null) return null;
  const word = ORIGINS[work.origin.code]?.[lang] ?? work.origin.code;
  return `${word} (${BABY_NAMES_TEXT[lang].quote(work.origin.as_printed)})`;
}

/**
 * "Co znaczy": each work's origin and meaning in its own words with its
 * citation (ADR-0045 §5; on the Polish page Yonge's English line is followed
 * by Name Atlas's literal translation, marked as ours); otherwise one muted line.
 * Never a composed meaning.
 */
function Meaning({ meaning, lang }: { meaning: GivenNameMeaningFacts; lang: Lang }) {
  const t = BABY_NAMES_TEXT[lang];
  const level = meaning.state === "READY" ? confidenceLevel(meaning.confidence.status) : null;
  const translated =
    lang === "pl" && meaning.state === "READY" && meaning.works.some((w) => w.translation !== null);
  return (
    <section
      className="bn-tile bn-meaning"
      data-meaning={meaning.state}
      aria-label={t.meaningHeading}
    >
      <h3 className="bn-tile-heading">{t.meaningHeading}</h3>
      {meaning.state === "RIGHTS_BLOCKED" ? (
        <p className="note bn-muted">{t.rightsBlocked}</p>
      ) : meaning.state !== "READY" ? (
        <p className="note bn-muted">{t.meaningNone}</p>
      ) : (
        <>
          <ul className="bn-works">
            {meaning.works.map((w) => {
              const origin = originWords(w, lang);
              return (
                <li key={w.citation.id} className="bn-work">
                  <dl className="bn-work-facts">
                    {origin === null ? null : (
                      <div>
                        <dt>{t.origin}</dt>
                        <dd data-meaning-origin={w.origin?.code}>{origin}</dd>
                      </div>
                    )}
                    {w.literal_gloss === null ? null : (
                      <div>
                        <dt>{t.meaning}</dt>
                        <dd data-meaning-gloss="">
                          {t.quote(w.literal_gloss)}
                          {lang === "pl" && w.translation !== null ? (
                            <>
                              <br />
                              <span className="bn-translation">
                                {t.translatedBy}: {t.quote(w.translation.text)}
                              </span>
                            </>
                          ) : null}
                        </dd>
                      </div>
                    )}
                  </dl>
                  <p className="bn-evidence">
                    <cite className="atlas-citation">
                      {t.workLine(w.work.author_or_publisher, w.work.title, w.work.year, w.locator)}
                    </cite>
                    {w.citation.url === null || w.citation.url === "" ? null : (
                      <>
                        {" "}
                        <a href={w.citation.url}>{t.sourceLine}</a>
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="bn-assessment">
            <span className="bn-assessment-word">{t.assessment}</span>{" "}
            {level === null ? (
              <span>{meaning.confidence.status}</span>
            ) : (
              <ConfidenceBadge level={level} />
            )}
          </p>
          {translated ? <p className="note bn-muted">{t.translationNote}</p> : null}
        </>
      )}
    </section>
  );
}

// --- the paid view ---------------------------------------------------------

/** A year with a count claim, as the chart and callouts take it. */
interface CountedYear {
  readonly year: BirthYearFigures;
  readonly count: BirthCountFigure;
}

function counted(history: readonly BirthYearFigures[]): CountedYear[] {
  return history.flatMap((year) => (year.count === null ? [] : [{ year, count: year.count }]));
}

/** The year with the greatest count; the earliest of equals. Exported for tests. */
export function peakOf(history: readonly BirthYearFigures[]): BirthYearFigures | null {
  let best: CountedYear | null = null;
  for (const c of counted(history)) {
    if (best === null || c.count.count > best.count.count) best = c;
  }
  return best?.year ?? null;
}

const CHART = { width: 640, height: 220, bottom: 26, top: 8 } as const;

/**
 * One bar a year from the history, heights from the counts: the peak amber
 * (historical emphasis, ADR-0046), the first and the latest in a lighter ink,
 * the rest neutral; a year with no count claim is a cut-off tick, never a zero
 * bar; a year with no stored list is a gap. Inline SVG from data, no library.
 */
function YearChart({
  history,
  sex,
  lang,
}: {
  history: readonly BirthYearFigures[];
  sex: BirthSex;
  lang: Lang;
}) {
  const t = BABY_NAMES_TEXT[lang];
  const first = history[0];
  const last = history[history.length - 1];
  if (first === undefined || last === undefined) return null;
  const peak = peakOf(history);
  const max = Math.max(1, ...counted(history).map((c) => c.count.count));
  const slot = CHART.width / history.length;
  const barWidth = Math.max(2, slot * 0.62);
  const plotHeight = CHART.height - CHART.bottom - CHART.top;
  const baseline = CHART.top + plotHeight;
  const x = (i: number) => i * slot + (slot - barWidth) / 2;
  const labelled = new Set([first.birth_year, peak?.birth_year, last.birth_year]);
  return (
    <svg
      className="bn-chart"
      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
      role="img"
      aria-label={t.chartLabel(sex, first.birth_year, last.birth_year)}
      data-bars={counted(history).length}
    >
      <line className="bn-chart-axis" x1={0} x2={CHART.width} y1={baseline} y2={baseline} />
      {history.map((year, i) => {
        if (year.list === null) return null;
        if (year.count === null) {
          return (
            <line
              key={year.birth_year}
              className="bn-chart-cutoff"
              data-year={year.birth_year}
              data-bar="cutoff"
              x1={x(i)}
              x2={x(i) + barWidth}
              y1={baseline + 5}
              y2={baseline + 5}
            >
              <title>{`${year.birth_year}: ${t.cutoffTick}`}</title>
            </line>
          );
        }
        const height = Math.max(1, (year.count.count / max) * plotHeight);
        const role =
          year.birth_year === peak?.birth_year
            ? "peak"
            : year.birth_year === first.birth_year || year.birth_year === last.birth_year
              ? "edge"
              : "year";
        return (
          <rect
            key={year.birth_year}
            className={`bn-chart-bar bn-chart-bar-${role}`}
            data-year={year.birth_year}
            data-bar={role}
            x={x(i)}
            y={baseline - height}
            width={barWidth}
            height={height}
          >
            <title>{`${year.birth_year}: ${formatInteger(year.count.count, lang)}`}</title>
          </rect>
        );
      })}
      {history.map((year, i) => {
        if (!labelled.has(year.birth_year)) return null;
        // A peak within two years of either end would collide with that end's label: its label goes above its bar.
        const isPeak = year.birth_year === peak?.birth_year;
        const nearEnd = i < 3 || i > history.length - 4;
        const isEnd = i === 0 || i === history.length - 1;
        const above = isPeak && !isEnd && nearEnd;
        const peakHeight =
          above && year.count !== null ? Math.max(1, (year.count.count / max) * plotHeight) : 0;
        return (
          <text
            key={`label-${year.birth_year}`}
            className="bn-chart-label"
            x={x(i) + barWidth / 2}
            y={above ? baseline - peakHeight - 5 : CHART.height - 6}
            textAnchor={i === 0 ? "start" : i === history.length - 1 ? "end" : "middle"}
          >
            {year.birth_year}
          </text>
        );
      })}
    </svg>
  );
}

/** "×4,8 · tyle razy częściej niż w 2000 r.": latest ÷ first year's count, only when both exist. */
function TimesHeadline({ history, lang }: { history: readonly BirthYearFigures[]; lang: Lang }) {
  const t = BABY_NAMES_TEXT[lang];
  const firstYear = history.find((y) => y.birth_year === BIRTH_HISTORY_FIRST_YEAR);
  const last = history[history.length - 1];
  if (firstYear?.count == null || last?.count == null || last === firstYear) return null;
  const more = last.count.count >= firstYear.count.count;
  const factor = more
    ? last.count.count / firstYear.count.count
    : firstYear.count.count / last.count.count;
  return (
    <p className="bn-times" data-figure="times" data-more={more ? "true" : "false"}>
      <strong>{t.times(formatDecimal(factor, 1, lang))}</strong>{" "}
      <span>{t.timesWording(more, firstYear.birth_year)}</span>
    </p>
  );
}

function Callout({
  label,
  year,
  word,
  lang,
}: {
  label: string;
  year: BirthYearFigures & { count: BirthCountFigure };
  word?: string;
  lang: Lang;
}) {
  const t = BABY_NAMES_TEXT[lang];
  return (
    <div className="atlas-data-stat bn-callout" data-callout={label} data-year={year.birth_year}>
      <span className="atlas-eyebrow bn-eyebrow">
        {label} · {year.birth_year}
      </span>
      <strong>{formatInteger(year.count.count, lang)}</strong>
      <small>
        {[
          t.childrenWord,
          word,
          year.rank === null ? "—" : t.place(formatInteger(year.rank.rank, lang)),
        ]
          .filter((x) => x !== undefined)
          .join(" · ")}
      </small>
    </div>
  );
}

/** Three callouts: the first year with a count, the peak ("najwięcej"), the latest. */
function Callouts({ history, lang }: { history: readonly BirthYearFigures[]; lang: Lang }) {
  const t = BABY_NAMES_TEXT[lang];
  const years = counted(history);
  const first = years[0];
  const last = years[years.length - 1];
  const peak = peakOf(history);
  if (first === undefined || last === undefined || peak?.count == null) return null;
  return (
    <div className="bn-callouts">
      <Callout label={t.calloutFirst} year={{ ...first.year, count: first.count }} lang={lang} />
      <Callout
        label={t.calloutPeak}
        year={{ ...peak, count: peak.count }}
        word={t.peakWord}
        lang={lang}
      />
      <Callout label={t.calloutLatest} year={{ ...last.year, count: last.count }} lang={lang} />
    </div>
  );
}

/** The ladder's years: every fifth from 2000, and the latest. */
export function ladderYears(history: readonly BirthYearFigures[]): number[] {
  const last = history[history.length - 1];
  if (last === undefined) return [];
  const years: number[] = [];
  for (let y = BIRTH_HISTORY_FIRST_YEAR; y < last.birth_year; y += 5) years.push(y);
  years.push(last.birth_year);
  return years;
}

/** The rank in 2000, 2005, …, and the latest year; "—" without a rank claim; the years at no. 1. */
function Ladder({ history, lang }: { history: readonly BirthYearFigures[]; lang: Lang }) {
  const t = BABY_NAMES_TEXT[lang];
  const last = history[history.length - 1];
  if (last === undefined) return null;
  const byYear = new Map(history.map((y) => [y.birth_year, y]));
  const top = history.filter((y) => y.rank?.rank === 1).map((y) => y.birth_year);
  return (
    <div className="bn-ladder-wrap">
      <h4 className="bn-tile-heading">{t.ladderHeading}</h4>
      <ol className="bn-ladder">
        {ladderYears(history).map((year) => {
          const figures = byYear.get(year);
          const rank = figures?.rank ?? null;
          return (
            <li
              key={year}
              className="bn-rung"
              data-year={year}
              data-rank={rank?.rank ?? "none"}
              aria-current={year === last.birth_year ? "true" : undefined}
            >
              <span className="bn-rung-year">{year}</span>
              <span className="bn-rung-rank">
                {rank === null ? "—" : formatInteger(rank.rank, lang)}
              </span>
            </li>
          );
        })}
      </ol>
      {top.length === 0 ? null : (
        <p className="bn-top-years" data-figure="top-years">
          {t.topYears(top.join(", "))}
        </p>
      )}
    </div>
  );
}

/** The last six years are open; "Wszystkie 26 lat" unfolds the rest without JavaScript. */
export const YEARS_SHOWN = 6;

/** The rows, built now (not as a component) so the sources are numbered before the list of them is drawn. */
function yearRows(
  rows: readonly BirthYearFigures[],
  indexOf: (c: CitationDto) => number,
  lang: Lang,
): ReactNode[] {
  const t = BABY_NAMES_TEXT[lang];
  return rows.map((year) => {
    const n = year.count === null ? null : indexOf(year.count.citation);
    return (
      <tr key={year.birth_year} data-year={year.birth_year}>
        <th scope="row">{year.birth_year}</th>
        {year.list === null ? (
          <td colSpan={3}>{t.noYearList}</td>
        ) : year.count === null ? (
          <>
            <td colSpan={2} className="baby-below">
              {`< ${threshold(year, lang)}`}
            </td>
            <td />
          </>
        ) : (
          <>
            <td>{formatInteger(year.count.count, lang)}</td>
            <td>{year.rank === null ? "—" : rankOf(year.rank, lang)}</td>
            <td className="baby-ref">[{n}]</td>
          </>
        )}
      </tr>
    );
  });
}

function YearTable({ figures, lang }: { figures: BirthSexFigures; lang: Lang }) {
  const t = BABY_NAMES_TEXT[lang];
  const newestFirst = [...(figures.history ?? [])].reverse();
  // Each source once, numbered; each row names its own.
  const sources: CitationDto[] = [];
  const indexOf = (c: CitationDto): number => {
    const found = sources.findIndex((s) => s.locator === c.locator && s.title === c.title);
    if (found !== -1) return found + 1;
    sources.push(c);
    return sources.length;
  };
  const caption = `${t.historyHeading}: ${t.sex[figures.sex]}`;
  const head = (
    <thead>
      <tr>
        <th scope="col">{t.yearColumn}</th>
        <th scope="col">{t.countColumn}</th>
        <th scope="col">{t.rankColumn}</th>
        <th scope="col">{t.sourceLine}</th>
      </tr>
    </thead>
  );
  const shown = newestFirst.slice(0, YEARS_SHOWN);
  const rest = newestFirst.slice(YEARS_SHOWN);
  // The rows are numbered in order, so the folded rows are indexed after the open ones.
  const openRows = yearRows(shown, indexOf, lang);
  const foldedRows = yearRows(rest, indexOf, lang);
  return (
    <div className="baby-history bn-history">
      <div className="table-scroll" tabIndex={0} role="region" aria-label={caption}>
        <table className="bn-table">
          <caption>{caption}</caption>
          {head}
          <tbody>{openRows}</tbody>
        </table>
      </div>
      {rest.length === 0 ? null : (
        <details className="atlas-accordion bn-details">
          <summary>{t.allYears(formatInteger(newestFirst.length, lang))}</summary>
          <div className="table-scroll" tabIndex={0} role="region" aria-label={caption}>
            <table className="bn-table">
              {head}
              <tbody>{foldedRows}</tbody>
            </table>
          </div>
        </details>
      )}
      <ul className="baby-sources note bn-sources">
        {sources.map((c, i) => (
          <li key={`${c.locator ?? ""}-${i}`}>
            [{i + 1}] <Source citations={[c]} lang={lang} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * "Porównaj z innym imieniem" (TASK-158): the way to the comparison from a
 * sex's paid view, with this name as the first; the second is typed there.
 */
function CompareEntry({ name, sex, lang }: { name: string; sex: BirthSex; lang: Lang }) {
  const t = BABY_NAMES_TEXT[lang];
  const href = `${BABY_NAMES_COMPARE_PATHS[lang]}?${new URLSearchParams({
    a: name,
    [BABY_NAMES_SEX_FIELD]: SEX_PARAM[sex],
  }).toString()}`;
  return (
    <p className="bn-compare-entry">
      <a className="bn-compare-link" href={href} data-compare={sex}>
        {t.compareEntry}
      </a>
    </p>
  );
}

/** One sex's paid view: the chart, the "×" headline, the callouts, the ladder, the table, the way to the comparison. */
function History({ figures, name, lang }: { figures: BirthSexFigures; name: string; lang: Lang }) {
  const t = BABY_NAMES_TEXT[lang];
  const history = figures.history ?? [];
  const first = history[0];
  if (first === undefined) return null;
  if (counted(history).length === 0) {
    // The other sex's line, as before: on no list of this sex in any year.
    return (
      <section className="bn-tile bn-paid bn-paid-none" data-paid={figures.sex}>
        <h3 className="bn-sex-heading">{t.sex[figures.sex]}</h3>
        <p className="note">{t.noneSince(figures.sex, first.birth_year)}</p>
      </section>
    );
  }
  return (
    <section
      className="bn-tile bn-paid"
      data-paid={figures.sex}
      aria-label={`${t.historyHeading}: ${t.sex[figures.sex]}`}
    >
      <h3 className="bn-sex-heading">{t.sex[figures.sex]}</h3>
      <YearChart history={history} sex={figures.sex} lang={lang} />
      <TimesHeadline history={history} lang={lang} />
      <Callouts history={history} lang={lang} />
      <Ladder history={history} lang={lang} />
      <YearTable figures={figures} lang={lang} />
      <CompareEntry name={name} sex={figures.sex} lang={lang} />
    </section>
  );
}

/** The locked card: the 8,99 zł view named and priced, "Wkrótce", nothing to buy. The comparison (TASK-158) shows the same one. */
export function BabyLocked({ lang }: { lang: Lang }) {
  const t = BABY_NAMES_TEXT[lang];
  // ADR-0023 §2.5: no buy button until the tier can lawfully be sold.
  return (
    <section className="baby-locked bn-tile bn-locked" aria-labelledby="baby-locked-heading">
      <h2 id="baby-locked-heading">{t.lockedHeading}</h2>
      <p>{t.lockedBody}</p>
      <p>{t.lockedListNote}</p>
      <p className="baby-tier">
        <span>{t.lockedTier}</span> <span>{t.lockedPrice}</span>{" "}
        <span className="baby-soon">{t.soon}</span>
      </p>
    </section>
  );
}

/** The register's list of this sex, apart from the birth-year figures; never a sum, never 0. */
function Register({ stock, sex, lang }: { stock: GivenNameFacts; sex: BirthSex; lang: Lang }) {
  const t = BABY_NAMES_TEXT[lang];
  const list = stock.state === "READY" ? stockListOfSex(stock.lists, sex) : null;
  return (
    <section
      className="baby-register bn-tile bn-register"
      data-register={sex}
      aria-label={t.registerHeading}
    >
      <h4 className="bn-tile-heading">{t.registerHeading}</h4>
      {stock.state === "RIGHTS_BLOCKED" ? (
        <p className="note">{t.rightsBlocked}</p>
      ) : list === null ? (
        <p className="note">{t.registerNone}</p>
      ) : (
        <>
          <dl className="baby-figures bn-figures">
            <div>
              <dt>{t.registerCount}</dt>
              <dd data-figure="register-count">{formatInteger(list.count.count, lang)}</dd>
            </div>
            {list.rank === null ? null : (
              <div>
                <dt>{t.registerRank}</dt>
                <dd data-figure="register-rank">{rankOf(list.rank, lang)}</dd>
              </div>
            )}
          </dl>
          <p className="note baby-basis">{t.registerAsOf(formatDate(list.snapshot_date, lang))}</p>
          <Source
            citations={distinct(
              list.rank === null
                ? [list.count.citation]
                : [list.count.citation, list.rank.citation],
            )}
            lang={lang}
          />
        </>
      )}
    </section>
  );
}

/** The focused sex first, so it heads a phone and the left column of a wide screen. */
function ordered<T extends { readonly sex: BirthSex }>(items: readonly T[], focus: BirthSex): T[] {
  return [...items].sort((a, b) => (a.sex === focus ? -1 : b.sex === focus ? 1 : 0));
}

/**
 * The sexes the page shows (TASK-157): those with a count on their latest list;
 * when neither has one, those whose lists hold the name in some year. A girls'
 * name gets no boys' section, tab or "below the cut-off" line, even where an
 * earlier boys' list holds it a few times.
 */
function shownSexes(facts: BirthNameFacts): BirthSexFigures[] {
  const current = facts.sexes.filter((s) => s.latest !== null && s.latest.count !== null);
  return current.length > 0 ? current : facts.sexes.filter((s) => s.on_any_list);
}

/** A name on no birth list: the sexes the register lists it for; both when it lists neither. */
function stockSexes(stock: GivenNameFacts): BirthSex[] {
  const found =
    stock.state === "READY"
      ? BIRTH_SEXES.filter((sex) => stockListOfSex(stock.lists, sex) !== null)
      : [];
  return found.length === 0 ? [...BIRTH_SEXES] : found;
}

/** A rare name: on no birth list, held by the register. */
function StockOnly({
  name,
  stock,
  cutoffs,
  meaning,
  focus,
  typed,
  lang,
}: {
  name: { readonly display_name: string };
  stock: GivenNameFacts;
  cutoffs: readonly BirthCutoff[];
  meaning: GivenNameMeaningFacts;
  focus: BirthSex;
  typed: string;
  lang: Lang;
}) {
  const t = BABY_NAMES_TEXT[lang];
  const sexes = stockSexes(stock);
  return (
    <>
      <h2 className="baby-name bn-name">{name.display_name}</h2>
      {sexes.length > 1 ? <p className="note">{t.apart}</p> : null}
      <p className="note baby-differs">{t.registerDiffers}</p>
      {sexes.length > 1 ? <SexTabs lang={lang} typed={typed} focus={focus} /> : null}
      <div className="baby-sexes bn-sexes">
        {ordered(
          sexes.map((sex) => ({ sex })),
          focus,
        ).map(({ sex }) => {
          const cutoff = cutoffs.find((c) => c.sex === sex);
          return (
            <section
              key={sex}
              id={`sex-${SEX_PARAM[sex]}`}
              className="baby-sex bn-sex"
              data-sex={sex}
              data-current={sex === focus ? "true" : undefined}
              aria-labelledby={`sex-heading-${SEX_PARAM[sex]}`}
            >
              <h3 id={`sex-heading-${SEX_PARAM[sex]}`} className="bn-sex-heading">
                {t.sex[sex]}
              </h3>
              {cutoff === undefined ? (
                <p className="note bn-tile">{t.noList}</p>
              ) : (
                <p className="baby-absent bn-tile bn-absent">
                  {t.belowCutoff(cutoff.birth_year, formatInteger(cutoff.threshold, lang))}
                </p>
              )}
              <Register stock={stock} sex={sex} lang={lang} />
            </section>
          );
        })}
      </div>
      <Meaning meaning={meaning} lang={lang} />
    </>
  );
}

function Facts({
  facts,
  stock,
  meaning,
  full,
  freeUntil,
  focus,
  typed,
  lang,
}: {
  facts: BirthNameFacts;
  stock: GivenNameFacts;
  meaning: GivenNameMeaningFacts;
  full: boolean;
  freeUntil: string | null;
  focus: BirthSex;
  typed: string;
  lang: Lang;
}) {
  const t = BABY_NAMES_TEXT[lang];
  if (facts.state === "RIGHTS_BLOCKED") return <p className="note">{t.rightsBlocked}</p>;
  const sexes = ordered(shownSexes(facts), focus);
  return (
    <>
      <h2 className="baby-name bn-name">{facts.given_name.display_name}</h2>
      {sexes.length > 1 ? <p className="note">{t.apart}</p> : null}
      <p className="note baby-differs">{t.registerDiffers}</p>
      {sexes.length > 1 ? <SexTabs lang={lang} typed={typed} focus={focus} /> : null}
      <div className="baby-sexes bn-sexes">
        {sexes.map((figures) => (
          <SexSection
            key={figures.sex}
            figures={figures}
            stock={stock}
            name={facts.given_name.display_name}
            current={figures.sex === focus}
            lang={lang}
          />
        ))}
      </div>
      <Meaning meaning={meaning} lang={lang} />
      {full ? (
        freeUntil === null ? (
          <FullView sexes={sexes} name={facts.given_name.display_name} lang={lang} />
        ) : (
          <BabyFreeWindow lang={lang}>
            <FullView sexes={sexes} name={facts.given_name.display_name} lang={lang} />
          </BabyFreeWindow>
        )
      ) : (
        <BabyLocked lang={lang} />
      )}
    </>
  );
}

/** The 8,99 zł view: every year since 2000 per sex (TASK-151). */
function FullView({
  sexes,
  name,
  lang,
}: {
  sexes: readonly BirthSexFigures[];
  name: string;
  lang: Lang;
}) {
  const t = BABY_NAMES_TEXT[lang];
  return (
    <section className="baby-full bn-full" aria-labelledby="baby-full-heading">
      <h2 id="baby-full-heading">{t.historyHeading}</h2>
      <p className="note">{t.historyNote}</p>
      <div className="bn-sexes">
        {sexes.map((figures) =>
          figures.history === null || figures.history.length === 0 ? null : (
            <History key={figures.sex} figures={figures} name={name} lang={lang} />
          ),
        )}
      </div>
    </section>
  );
}

/**
 * The locked card while the free window is open (TASK-160, D-051): the same
 * words and price, the price struck, and a button that opens the view. A
 * `<details>`, so it works without script. No end date is shown (TASK-162):
 * the owner may keep the window open past any date the card could name.
 */
function BabyFreeWindow({ lang, children }: { lang: Lang; children: ReactNode }) {
  const t = BABY_NAMES_TEXT[lang];
  return (
    <section
      className="baby-locked bn-tile bn-locked bn-free"
      aria-labelledby="baby-locked-heading"
    >
      <h2 id="baby-locked-heading">{t.lockedHeading}</h2>
      <p>{t.lockedBody}</p>
      <p>{t.lockedListNote}</p>
      <p className="baby-tier">
        <span>{t.lockedTier}</span> <s>{t.lockedPrice}</s>{" "}
        <span className="bn-free-pill">{t.freeToday}</span>
      </p>
      <details className="bn-free-open">
        <summary className="bn-free-cta">{t.freeCta}</summary>
        {children}
      </details>
    </section>
  );
}

export function BabyNamesView({ data }: { data: BabyNamesData }) {
  const { lang } = data;
  const t = BABY_NAMES_TEXT[lang];
  const other: Lang = lang === "pl" ? "en" : "pl";
  return (
    <SiteShell
      lang={lang}
      otherPath={BABY_NAMES_PATHS[other]}
      world={{ mode: "quiet" }}
      current="babyNames"
      mainClassName="baby-names atlas-v1"
    >
      <h1 className="page-title">{t.title}</h1>
      <p className="page-lede">{t.lede}</p>
      <p className="note">{t.source}</p>
      {data.kind === "signed-out" ? (
        <>
          <p>{t.signedOut}</p>
          <p>
            <a className="baby-sign-in" href={data.signInHref}>
              {t.signIn}
            </a>
          </p>
        </>
      ) : (
        <>
          <form className="compare-form baby-form" action={BABY_NAMES_PATHS[lang]} method="get">
            <label htmlFor="baby-name">{t.label}</label>
            <input
              id="baby-name"
              name={BABY_NAMES_FIELD[lang]}
              type="text"
              defaultValue={data.typed.slice(0, 80)}
              placeholder={t.placeholder}
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="words"
            />
            <button type="submit">{t.submit}</button>
          </form>
          <p className="baby-list-link">
            <a href={BABY_NAMES_LIST_PATHS[lang]}>{t.listLink}</a>
            {coupleNamesEnabled() ? (
              <>
                {" · "}
                <a className="baby-couple-link" href={COUPLE_NAMES_PATHS[lang]}>
                  {t.coupleLink}
                </a>
              </>
            ) : null}
          </p>
          <div className="baby-result" aria-live="polite">
            {data.result.kind === "INVALID" ? <p role="alert">{t.invalid}</p> : null}
            {data.result.kind === "NOT_FOUND" ? <p>{t.notFound(data.typed)}</p> : null}
            {data.result.kind === "HELD" ? <p>{t.held}</p> : null}
            {data.result.kind === "FACTS" ? (
              <Facts
                facts={data.result.facts}
                stock={data.result.stock}
                meaning={data.result.meaning}
                full={data.full}
                freeUntil={data.freeUntil}
                focus={data.focus}
                typed={data.typed}
                lang={lang}
              />
            ) : null}
            {data.result.kind === "STOCK_ONLY" ? (
              <StockOnly
                name={data.result.name}
                stock={data.result.stock}
                cutoffs={data.result.cutoffs}
                meaning={data.result.meaning}
                focus={data.focus}
                typed={data.typed}
                lang={lang}
              />
            ) : null}
          </div>
        </>
      )}
    </SiteShell>
  );
}

// ---------------------------------------------------------------------------
// The route
// ---------------------------------------------------------------------------

let purchases: Purchases | undefined;

/** The deps the running site uses: claims on the read pool, purchases on the accounts pool. */
export function runningBabyNamesDeps(pool: Parameters<typeof createAccountsDb>[0]): BabyNamesDeps {
  purchases ??= createPurchases({ db: createAccountsDb(pool) });
  const store = purchases;
  return {
    findName: (typed) => findBirthGivenName(db(), typed),
    readFacts: (givenName, history, paid = history) =>
      readBirthNameFacts(db(), givenName, { surface: history && paid ? "PAID" : "FREE", history }),
    readStock: (givenName) => readGivenNameFacts(db(), givenName, "FREE"),
    readLists: () => readActiveBirthLists(db()),
    hasFullView: (userId) => store.hasPurchaseOf(userId, BABY_NAMES_FULL_TIERS),
    freeUntil: () => babyNamesFreeUntil(),
    readMeaning: (givenName, paid) =>
      readGivenNameMeaning(db(), givenName.id, paid ? "PAID" : "FREE"),
  };
}

export function babyNamesMetadata(lang: Lang): Metadata {
  return babyNamesEnabled() ? BABY_NAMES_METADATA[lang] : {};
}

/** The signed-in account behind the session cookie, or null: no cookie, an expired one, a failed read. */
export async function readBabyNamesSession(
  accounts: NonNullable<ReturnType<typeof accountsRuntime>>,
): Promise<{ userId: string } | null> {
  const token = (await cookies()).get(sessionCookieName(accounts.secure))?.value;
  try {
    const found = token === undefined ? null : await accounts.accounts.sessionFromToken(token);
    return found === null ? null : { userId: found.userId };
  } catch {
    return null;
  }
}

/** The route's page: a 404 when off; reads the session cookie, loads, renders. */
export async function BabyNamesRoute({
  lang,
  searchParams,
}: {
  readonly lang: Lang;
  readonly searchParams: Promise<Query>;
}) {
  if (!babyNamesEnabled()) notFound();
  const accounts = accountsRuntime();
  if (accounts === null) notFound();
  const query = await searchParams;
  const session = await readBabyNamesSession(accounts);
  const data = await loadBabyNames({
    lang,
    query,
    session,
    deps: runningBabyNamesDeps(accounts.pool),
  });
  return <BabyNamesView data={data} />;
}
