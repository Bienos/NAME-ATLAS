import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAccountsDb, createPurchases, FULL_NAME_COMPARE_TIERS } from "@name-atlas/accounts";
import type { Purchases } from "@name-atlas/accounts";
import type { CitationDto } from "@name-atlas/contracts";
import { slugFor } from "@name-atlas/seo";
import {
  BIRTH_SEXES,
  findBirthGivenName,
  readBirthNameFacts,
  readGivenNameFacts,
  readGivenNameMeaning,
  stockListOfSex,
} from "@name-atlas/truth";
import type {
  BirthNameFacts,
  BirthNameLookup,
  BirthSex,
  GivenNameFacts,
  GivenNameMeaningFacts,
} from "@name-atlas/truth";
import { accountPath } from "./account-paths.js";
import { accountsEnabled } from "./accounts-config.js";
import { accountsRuntime } from "./accounts-runtime.js";
import { readBabyNamesSession, Source } from "./baby-names-page.js";
import {
  compareDistributionMany,
  comparePopulationMany,
  compareRarityMany,
  gateMany,
  rarestOf,
} from "./compare.js";
import type { ManyPairing } from "./compare.js";
import {
  Chapter,
  DistributionMaps,
  FigureBars,
  NamePlates,
  OddsFigures,
} from "./compare-figures.js";
import type { BarRow } from "./compare-figures.js";
import { loadSide } from "./compare-page.js";
import { comparisonPath } from "./compare-request.js";
import { displayFor, groupWords, reasonWords } from "./compare-view.js";
import type { ComparisonSide } from "./compare-view.js";
import { db } from "./db.js";
import {
  FULL_NAME_COMPARE_MAX_PEOPLE,
  FULL_NAME_COMPARE_PATHS,
  fullNameCompareEnabled,
} from "./full-name-compare-config.js";
import { fullNameQuery, fullNameRequest } from "./full-name-compare-request.js";
import type { FullNameRequest, TypedPerson } from "./full-name-compare-request.js";
import { FULL_NAME_COMPARE_TEXT } from "./full-name-compare-text.js";
import { formatDate, formatInteger, UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { ORIGINS } from "./given-name-meaning-view.js";
import { SiteShell } from "./site-shell.js";

/**
 * The full-name comparison (TASK-155, D-049): `/pl/porownaj/imie-i-nazwisko`
 * and `/en/compare/full-name`. Two to four people, each a first name and a
 * surname, side by side.
 *
 * Signed out, it explains and links to sign-in. Signed in without the 15,99 zł
 * product or a tier that holds it (`FULL_NAME_COMPARE_TIERS`), the form, what
 * the comparison holds and the locked card ("Wkrótce", no button, ADR-0023
 * §2.5), and nothing is read. With it, per person: the first name's register
 * count and rank per list, the children given it in the latest year, its
 * origin and meaning as each work states them, and the surname's count,
 * rarity and map; across the people, a figure is drawn on one scale only
 * where `compare.ts`'s gates allow.
 *
 * Every figure is a claim (`readGivenNameFacts`, `readBirthNameFacts`,
 * `readGivenNameMeaning`, `querySurnameResult`). The men's and women's lists
 * are never summed or set against each other, and there is no count of people
 * with both names together (ADR-0032 §7, D-033): the page says so.
 *
 * A 404 unless `FULL_NAME_COMPARE_ENABLED` is `1` and accounts are on;
 * `noindex`; `private, no-store` from the middleware.
 */

export const FULL_NAME_COMPARE_METADATA: Readonly<Record<Lang, Metadata>> = {
  pl: {
    title: "Porównanie imion i nazwisk · Name Atlas",
    robots: { index: false, follow: false },
  },
  en: { title: "Full-name comparison · Name Atlas", robots: { index: false, follow: false } },
};

type Query = Readonly<Record<string, string | string[] | undefined>>;

/** A first name's facts, all as the paid surface may show them. */
export interface GivenNameAll {
  readonly stock: GivenNameFacts;
  readonly births: BirthNameFacts;
  readonly meaning: GivenNameMeaningFacts;
}

export interface FullNameCompareDeps {
  /** Whether the account holds a tier that includes the comparison. */
  readonly hasFullView: (userId: string) => Promise<boolean>;
  readonly findGivenName: (typed: string) => Promise<BirthNameLookup>;
  readonly readGivenName: (givenName: {
    readonly id: string;
    readonly display_name: string;
  }) => Promise<GivenNameAll>;
  /** A typed surname to its side: resolved, or with no response. */
  readonly loadSurname: (typed: string) => Promise<ComparisonSide>;
}

export type GivenSide =
  | {
      readonly kind: "FOUND";
      readonly name: { readonly id: string; readonly display_name: string };
      readonly facts: GivenNameAll;
    }
  | { readonly kind: "NOT_FOUND" | "HELD" | "INVALID" };

export interface PersonResult {
  readonly typed: TypedPerson;
  readonly given: GivenSide;
  readonly surname: ComparisonSide;
}

export type FullNameCompareData =
  | { readonly kind: "signed-out"; readonly lang: Lang; readonly signInHref: string }
  | {
      readonly kind: "signed-in";
      readonly lang: Lang;
      readonly full: boolean;
      readonly request: FullNameRequest;
      /** The people compared; null before a comparison, or without the product. */
      readonly people: readonly PersonResult[] | null;
    };

/** What the page shows, from the session and the query; no rendering, no cookie. */
export async function loadFullNameCompare(input: {
  readonly lang: Lang;
  readonly query: Query;
  readonly session: { readonly userId: string } | null;
  readonly deps: FullNameCompareDeps;
}): Promise<FullNameCompareData> {
  const { lang, session, deps } = input;
  if (session === null) {
    return {
      kind: "signed-out",
      lang,
      signInHref: accountPath(lang, "sign-in", { next: FULL_NAME_COMPARE_PATHS[lang] }),
    };
  }
  const request = fullNameRequest(input.query);
  const full = await deps.hasFullView(session.userId);
  if (!full || request.error !== null || request.people.length < 2) {
    return { kind: "signed-in", lang, full, request, people: null };
  }
  // One person at a time, so four people never hold four pool connections at once.
  const people: PersonResult[] = [];
  for (const typed of request.people.slice(0, FULL_NAME_COMPARE_MAX_PEOPLE)) {
    const lookup = await deps.findGivenName(typed.given);
    const given: GivenSide =
      lookup.kind === "FOUND"
        ? {
            kind: "FOUND",
            name: lookup.given_name,
            facts: await deps.readGivenName(lookup.given_name),
          }
        : { kind: lookup.kind };
    people.push({ typed, given, surname: await deps.loadSurname(typed.surname) });
  }
  return { kind: "signed-in", lang, full, request, people };
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

/** What a typed value may show for itself: bounded, as `displayFor` bounds a slug. */
function bounded(typed: string): string {
  const chars = [...typed];
  return chars.length > 40 ? `${chars.slice(0, 40).join("")}…` : typed;
}

function givenDisplay(person: PersonResult): string {
  return person.given.kind === "FOUND"
    ? person.given.name.display_name
    : bounded(person.typed.given);
}

function surnameDisplay(person: PersonResult): string {
  return person.surname.display ?? bounded(person.typed.surname);
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

function present<T>(pairing: ManyPairing<T>): number {
  return pairing.entries.filter((e) => e !== null).length;
}

const CHECK = (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
    <path
      d="M20 6 9 17l-5-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LOCK = (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
    <rect
      x="4"
      y="11"
      width="16"
      height="10"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

/**
 * Where the reader is: typing the people, unlocking, the result. Step 2 is
 * done once the account holds the comparison; the current step is named in
 * words as well as marked.
 */
function Steps({ lang, at, unlocked }: { lang: Lang; at: 1 | 3; unlocked: boolean }) {
  const t = FULL_NAME_COMPARE_TEXT[lang];
  const labels = [
    t.steps[0],
    unlocked ? t.steps[1] : `${t.steps[1]} · ${t.lockedPrice}`,
    t.steps[2],
  ];
  return (
    <ol className="fnc-steps" aria-label={t.stepsLabel}>
      {labels.map((label, i) => {
        const state =
          i === at - 1 ? "current" : i < at - 1 || (i === 1 && unlocked) ? "done" : "todo";
        return (
          <li key={i} data-state={state} aria-current={state === "current" ? "step" : undefined}>
            <span className="fnc-step-dot" aria-hidden="true">
              {state === "done" ? CHECK : i + 1}
            </span>
            <span>
              {label}
              {state === "done" ? <span className="visually-hidden"> ({t.stepDone})</span> : null}
              {state === "current" ? <span className="fnc-step-now"> · {t.stepNow}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** One person's row: the letter, then the first name and the surname, each labelled. */
function PersonRow({ lang, row, i }: { lang: Lang; row: TypedPerson; i: number }) {
  const t = FULL_NAME_COMPARE_TEXT[lang];
  return (
    <div className="fnc-row" data-side={i}>
      <span className="cmp-plate-letter" aria-hidden="true">
        {String.fromCharCode(65 + i)}
      </span>
      <label className="visually-hidden" htmlFor={`f${i + 1}`}>
        {`${t.person(i + 1)}: ${t.givenLabel}`}
      </label>
      <input
        id={`f${i + 1}`}
        name={`f${i + 1}`}
        type="text"
        defaultValue={row.given}
        placeholder={i === 0 ? t.givenPlaceholder : t.givenLabel}
        autoComplete="off"
        spellCheck={false}
        autoCapitalize="words"
      />
      <label className="visually-hidden" htmlFor={`s${i + 1}`}>
        {`${t.person(i + 1)}: ${t.surnameLabel}`}
      </label>
      <input
        id={`s${i + 1}`}
        name={`s${i + 1}`}
        type="text"
        defaultValue={row.surname}
        placeholder={i === 0 ? t.surnamePlaceholder : t.surnameLabel}
        autoComplete="off"
        spellCheck={false}
        autoCapitalize="words"
      />
    </div>
  );
}

/**
 * The form: a row per person. The first two always show; the third and fourth
 * sit behind a native `<details>`, open when the query already carries them,
 * so the page needs no script.
 */
function PeopleForm({
  lang,
  rows,
  error,
  locked,
}: {
  lang: Lang;
  rows: readonly TypedPerson[];
  error: FullNameRequest["error"];
  locked: boolean;
}) {
  const t = FULL_NAME_COMPARE_TEXT[lang];
  const more = rows.slice(2);
  const moreTyped = more.some((r) => r.given.trim() !== "" || r.surname.trim() !== "");
  return (
    <form className="fnc-form" action={FULL_NAME_COMPARE_PATHS[lang]} method="get">
      <div className="fnc-form-head">
        <h2>{t.peopleHeading}</h2>
        <span className="fnc-form-hint">{t.peopleHint}</span>
      </div>
      <div className="fnc-cols" aria-hidden="true">
        <span />
        <span>{t.givenLabel}</span>
        <span>{t.surnameLabel}</span>
      </div>
      {rows.slice(0, 2).map((row, i) => (
        <PersonRow key={i} lang={lang} row={row} i={i} />
      ))}
      {more.length === 0 ? null : (
        <details className="fnc-more" open={moreTyped}>
          <summary>{t.addPeople}</summary>
          {more.map((row, i) => (
            <PersonRow key={i + 2} lang={lang} row={row} i={i + 2} />
          ))}
        </details>
      )}
      {error === null ? null : (
        <p className="compare-error" role="alert">
          {error === "HALF" ? t.errorHalf : t.errorTwo}
        </p>
      )}
      <p className="fnc-disclaimer">{t.disclaimer}</p>
      <div className="fnc-submit">
        <button type="submit">{t.submit}</button>
        {locked ? <span className="fnc-submit-hint">{t.lockedHint}</span> : null}
      </div>
    </form>
  );
}

/** A small drawing per chapter: decoration only, never a figure. */
const CHAPTER_DRAWINGS = [
  <svg key="register" viewBox="0 0 120 48" aria-hidden="true" focusable="false">
    <rect x="0" y="6" width="104" height="8" rx="4" data-side="0" />
    <rect x="0" y="20" width="70" height="8" rx="4" data-side="1" />
    <rect x="0" y="34" width="44" height="8" rx="4" data-side="2" />
  </svg>,
  <svg key="births" viewBox="0 0 120 48" aria-hidden="true" focusable="false">
    <rect x="8" y="30" width="14" height="18" rx="3" className="fnc-draw-muted" />
    <rect x="30" y="22" width="14" height="26" rx="3" className="fnc-draw-muted" />
    <rect x="52" y="14" width="14" height="34" rx="3" className="fnc-draw-muted" />
    <rect x="74" y="4" width="14" height="44" rx="3" data-side="0" />
  </svg>,
  <svg key="meaning" viewBox="0 0 120 48" aria-hidden="true" focusable="false">
    <text x="0" y="22" className="fnc-draw-quote">
      „…”
    </text>
    <rect x="0" y="30" width="90" height="6" rx="3" className="fnc-draw-muted" />
    <rect x="0" y="40" width="56" height="6" rx="3" className="fnc-draw-muted" />
  </svg>,
  <svg key="surnames" viewBox="0 0 120 48" aria-hidden="true" focusable="false">
    <circle cx="20" cy="24" r="14" data-side="0" />
    <circle cx="58" cy="24" r="10" data-side="1" />
    <circle cx="90" cy="24" r="6" data-side="2" />
  </svg>,
];

/** What the comparison holds: four numbered tiles. */
function Contains({ lang, locked }: { lang: Lang; locked: boolean }) {
  const t = FULL_NAME_COMPARE_TEXT[lang];
  return (
    <section className="fnc-gives" aria-labelledby="cmp-contains-title">
      <h2 id="cmp-contains-title">{locked ? t.containsLocked : t.containsHeading}</h2>
      <ol>
        {t.contains.map((item, i) => (
          <li key={item.title}>
            <span className="fnc-gives-drawing">{CHAPTER_DRAWINGS[i]}</span>
            <span className="cmp-chapter-no" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Locked({ lang, freePath }: { lang: Lang; freePath: string }) {
  const t = FULL_NAME_COMPARE_TEXT[lang];
  // ADR-0023 §2.5: no buy button until the product can lawfully be sold.
  return (
    <aside className="fnc-locked" aria-labelledby="cmp-locked-heading">
      <p className="fnc-chip" data-state="locked">
        {LOCK}
        {t.lockedChip}
      </p>
      <h2 id="cmp-locked-heading">{t.lockedHeading}</h2>
      <p className="cmp-upsell-price">
        <span className="cmp-price">{t.lockedPrice}</span>{" "}
        <span className="cmp-soon">{t.soon}</span>
      </p>
      <p>{t.lockedBody}</p>
      <ul className="fnc-benefits">
        {t.benefits.map((line) => (
          <li key={line}>
            {CHECK}
            {line}
          </li>
        ))}
      </ul>
      <p className="fnc-locked-free">
        <a href={freePath}>{t.freeLink} →</a>
      </p>
    </aside>
  );
}

/** No source counts people with both names: said as a heading and its answer. */
function Together({ lang }: { lang: Lang }) {
  const t = FULL_NAME_COMPARE_TEXT[lang];
  return (
    <aside className="fnc-together" aria-labelledby="cmp-together-title">
      <h2 id="cmp-together-title">{t.togetherHeading}</h2>
      <p>{t.togetherBody}</p>
    </aside>
  );
}

/** Signed out: the page's shape, with no figure in it. Decoration only. */
function SignedOutPreview({ lang }: { lang: Lang }) {
  const t = FULL_NAME_COMPARE_TEXT[lang];
  return (
    <div className="fnc-preview" aria-hidden="true">
      <p className="fnc-preview-label">{t.previewLabel}</p>
      {[82, 54, 30].map((width, i) => (
        <p key={i} className="fnc-preview-row" data-side={i}>
          <span className="cmp-plate-letter">{String.fromCharCode(65 + i)}</span>
          <span className="fnc-preview-bar" style={{ width: `${width}%` }} />
        </p>
      ))}
      <p className="fnc-preview-note">{t.lede}</p>
    </div>
  );
}

/** The first name in the register: each sex's list on its own, never summed. */
function RegisterChapter({ people, lang }: { people: readonly PersonResult[]; lang: Lang }) {
  const t = FULL_NAME_COMPARE_TEXT[lang];
  const blocks = BIRTH_SEXES.map((sex) => {
    const pairing = gateMany(
      sex,
      people.map((p) =>
        p.given.kind === "FOUND" && p.given.facts.stock.state === "READY"
          ? stockListOfSex(p.given.facts.stock.lists, sex)
          : null,
      ),
      [
        [(x) => x.snapshot_date, "DIFFERENT_SNAPSHOT_DATE"],
        [(x) => x.comparability_group, "DIFFERENT_PARTITION"],
      ],
    );
    return { sex, pairing };
  }).filter((b) => present(b.pairing) > 0);
  return (
    <Chapter id="fnc-ch-1" n={1} title={t.chapterRegister} lang={lang}>
      <p className="note">{t.registerApart}</p>
      {blocks.length === 0 ? (
        <p className="absent">{t.surnameNone}</p>
      ) : (
        <div className="cmp-panels">
          {blocks.map(({ sex, pairing }) => {
            const lists = pairing.entries.filter((e) => e !== null);
            const drawn = pairing.comparable || lists.length === 1;
            // A name the register lists, but not on this sex's list: one line, not a row.
            const offList = people.map(
              (person, i) =>
                person.given.kind === "FOUND" &&
                person.given.facts.stock.state === "READY" &&
                (pairing.entries[i] ?? null) === null,
            );
            const offNames = people.filter((_, i) => offList[i]).map(givenDisplay);
            return (
              <div key={sex} className="cmp-panel" data-list={sex}>
                <p className="compare-group">{t.registerList[sex]}</p>
                <FigureBars
                  label={`${t.chapterRegister}: ${t.registerList[sex]}`}
                  drawn={drawn}
                  rows={people.flatMap((person, i): BarRow[] => {
                    if (offList[i]) return [];
                    const list = pairing.entries[i] ?? null;
                    const blocked =
                      person.given.kind === "FOUND" &&
                      person.given.facts.stock.state === "RIGHTS_BLOCKED";
                    return [
                      {
                        key: String(i),
                        side: i,
                        name: givenDisplay(person),
                        value: list?.count.count ?? null,
                        text: list === null ? "" : formatInteger(list.count.count, lang),
                        detail:
                          list?.rank == null
                            ? null
                            : t.rankOf(
                                formatInteger(list.rank.rank, lang),
                                formatInteger(list.rank.universe_size, lang),
                              ),
                        absent:
                          person.given.kind !== "FOUND"
                            ? "—"
                            : blocked
                              ? t.rightsBlocked
                              : t.registerNone,
                      },
                    ];
                  })}
                />
                {offNames.length === 0 ? null : (
                  <p className="absent fnc-off-list">{t.notOnList(offNames.join(", "))}</p>
                )}
                {drawn ? null : (
                  <p className="absent">
                    {reasonWords(pairing.reason ?? "DIFFERENT_PARTITION", lang)}
                  </p>
                )}
                {lists[0] === undefined ? null : (
                  <p className="note">{t.registerAsOf(formatDate(lists[0].snapshot_date, lang))}</p>
                )}
                <Source
                  citations={distinct(
                    lists.flatMap((l) =>
                      l.rank === null ? [l.count.citation] : [l.count.citation, l.rank.citation],
                    ),
                  )}
                  lang={lang}
                />
              </div>
            );
          })}
        </div>
      )}
    </Chapter>
  );
}

/** The children given the name in the latest year, boys and girls apart. */
function BirthsChapter({ people, lang }: { people: readonly PersonResult[]; lang: Lang }) {
  const t = FULL_NAME_COMPARE_TEXT[lang];
  const figuresOf = (person: PersonResult, sex: BirthSex) =>
    person.given.kind === "FOUND" && person.given.facts.births.state === "READY"
      ? (person.given.facts.births.sexes.find((s) => s.sex === sex) ?? null)
      : null;
  const blocks = BIRTH_SEXES.map((sex) => {
    const pairing = gateMany(
      sex,
      people.map((p) => {
        const latest = figuresOf(p, sex)?.latest ?? null;
        return latest === null || latest.count === null ? null : latest;
      }),
      [[(x) => x.list?.list_id ?? null, "DIFFERENT_SNAPSHOT_DATE"]],
    );
    return { sex, pairing };
  }).filter((b) => present(b.pairing) > 0);
  return (
    <Chapter id="fnc-ch-2" n={2} title={t.chapterBirths} lang={lang}>
      <p className="note">{t.birthsDiffer}</p>
      {blocks.length === 0 ? (
        <p className="absent">{t.surnameNone}</p>
      ) : (
        <div className="cmp-panels">
          {blocks.map(({ sex, pairing }) => {
            const years = pairing.entries.filter((e) => e !== null);
            const drawn = pairing.comparable || years.length === 1;
            const year = years[0]?.birth_year;
            return (
              <div key={sex} className="cmp-panel" data-births={sex}>
                <p className="compare-group">
                  {t.birthsSex[sex]}
                  {year === undefined ? null : <small> · {t.birthsYear(year)}</small>}
                </p>
                <FigureBars
                  label={`${t.chapterBirths}: ${t.birthsSex[sex]}`}
                  drawn={drawn}
                  rows={people.map((person, i): BarRow => {
                    const figures = figuresOf(person, sex);
                    const latest = pairing.entries[i] ?? null;
                    const trend = figures?.trend ?? null;
                    const below = figures?.latest ?? null;
                    const detail = [
                      latest?.rank == null
                        ? null
                        : t.rankOf(
                            formatInteger(latest.rank.rank, lang),
                            formatInteger(latest.rank.universe_size, lang),
                          ),
                      trend === null ? null : t.direction[trend.direction],
                    ]
                      .filter((x) => x !== null)
                      .join(" · ");
                    return {
                      key: String(i),
                      side: i,
                      name: givenDisplay(person),
                      value: latest?.count?.count ?? null,
                      text: latest?.count ? formatInteger(latest.count.count, lang) : "",
                      detail: detail === "" ? null : detail,
                      absent:
                        person.given.kind !== "FOUND"
                          ? "—"
                          : person.given.facts.births.state === "RIGHTS_BLOCKED"
                            ? t.rightsBlocked
                            : below !== null && below.list !== null
                              ? t.birthsBelow(formatInteger(below.list.publication_threshold, lang))
                              : t.birthsNone,
                    };
                  })}
                />
                {drawn ? null : (
                  <p className="absent">
                    {reasonWords(pairing.reason ?? "DIFFERENT_SNAPSHOT_DATE", lang)}
                  </p>
                )}
                <Source
                  citations={distinct(
                    years.flatMap((y) =>
                      y.count === null
                        ? []
                        : y.rank === null
                          ? [y.count.citation]
                          : [y.count.citation, y.rank.citation],
                    ),
                  )}
                  lang={lang}
                />
              </div>
            );
          })}
        </div>
      )}
    </Chapter>
  );
}

/** Each person's first name as the works explain it, in their own words (D-046). */
function MeaningChapter({ people, lang }: { people: readonly PersonResult[]; lang: Lang }) {
  const t = FULL_NAME_COMPARE_TEXT[lang];
  const translated = people.some(
    (p) =>
      lang === "pl" &&
      p.given.kind === "FOUND" &&
      p.given.facts.meaning.state === "READY" &&
      p.given.facts.meaning.works.some((w) => w.translation !== null),
  );
  return (
    <Chapter id="fnc-ch-3" n={3} title={t.chapterMeaning} lang={lang}>
      <div className="cmp-meanings" data-count={people.length}>
        {people.map((person, i) => {
          const meaning = person.given.kind === "FOUND" ? person.given.facts.meaning : null;
          return (
            <article key={i} className="cmp-meaning" data-side={i}>
              <h3>{givenDisplay(person)}</h3>
              {meaning === null ? (
                <p className="absent">—</p>
              ) : meaning.state === "RIGHTS_BLOCKED" ? (
                <p className="absent">{t.rightsBlocked}</p>
              ) : meaning.state !== "READY" ? (
                <p className="absent">{t.meaningNone}</p>
              ) : (
                <ul>
                  {meaning.works.map((w) => (
                    <li key={w.citation.id}>
                      {w.origin === null ? null : (
                        <p>
                          <span className="cmp-meaning-label">{t.origin}</span>{" "}
                          {ORIGINS[w.origin.code]?.[lang] ?? w.origin.code} (
                          {t.quote(w.origin.as_printed)})
                        </p>
                      )}
                      {w.literal_gloss === null ? null : (
                        <p>
                          <span className="cmp-meaning-label">{t.meaning}</span>{" "}
                          {t.quote(w.literal_gloss)}
                          {lang === "pl" && w.translation !== null ? (
                            <>
                              <br />
                              {t.translatedBy}: {t.quote(w.translation.text)}
                            </>
                          ) : null}
                        </p>
                      )}
                      <p className="note">
                        {`${w.work.author_or_publisher}, ${w.work.title} (${w.work.year}), ${w.locator}`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
      {translated ? <p className="note">{t.translationNote}</p> : null}
    </Chapter>
  );
}

/** The surnames: count, rarity and map, through the N-way gates. */
function SurnameChapters({ people, lang }: { people: readonly PersonResult[]; lang: Lang }) {
  const t = FULL_NAME_COMPARE_TEXT[lang];
  const u = UI[lang];
  const responses = people.map((p) => p.surname.response);
  const population = comparePopulationMany(responses);
  const rarity = compareRarityMany(responses);
  const distribution = compareDistributionMany(responses);
  const names = people.map(surnameDisplay);
  return (
    <>
      <Chapter id="fnc-ch-4" n={4} title={t.chapterSurnameCount} lang={lang}>
        {population.length === 0 ? (
          <p className="absent">{t.surnameNone}</p>
        ) : (
          <div className="cmp-panels">
            {population.map((pairing, index) => {
              const drawn = pairing.comparable || present(pairing) === 1;
              const first = pairing.entries.find((e) => e !== null);
              return (
                <div className="compare-row cmp-panel" key={`${String(pairing.group)}-${index}`}>
                  <p className="compare-group">{groupWords(pairing.group, lang)}</p>
                  <FigureBars
                    label={`${t.chapterSurnameCount}: ${groupWords(pairing.group, lang)}`}
                    drawn={drawn}
                    rows={pairing.entries.map((obs, i) => ({
                      key: String(i),
                      side: i,
                      name: names[i] ?? "",
                      value: obs?.value.value ?? null,
                      text: obs?.value.value == null ? "" : formatInteger(obs.value.value, lang),
                      absent: t.notInDataset,
                    }))}
                  />
                  {drawn ? null : (
                    <p className="absent">
                      {reasonWords(pairing.reason ?? "DIFFERENT_PARTITION", lang)}
                    </p>
                  )}
                  {first === undefined || first === null || !drawn ? null : (
                    <p className="note">
                      {u.snapshotLabel}: {formatDate(first.snapshot_date, lang)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Chapter>

      <Chapter n={5} title={t.chapterSurnameRarity} lang={lang}>
        {rarity.length === 0 ? (
          <p className="absent">{t.surnameNone}</p>
        ) : (
          <div className="cmp-panels">
            {rarity.map((pairing, index) => {
              const rarest = rarestOf(pairing);
              return (
                <div className="compare-row cmp-panel" key={`${String(pairing.group)}-${index}`}>
                  <p className="compare-group">{groupWords(pairing.group, lang)}</p>
                  <OddsFigures
                    lang={lang}
                    rows={pairing.entries.map((entry, i) => ({
                      key: String(i),
                      side: i,
                      name: names[i] ?? "",
                      value: entry === null ? null : formatInteger(entry.primary.value, lang),
                    }))}
                  />
                  {pairing.comparable ? (
                    <p className="cmp-verdict">
                      {rarest === null
                        ? t.tie
                        : rarest === "TOO_CLOSE"
                          ? t.tooClose
                          : t.rarest(names[rarest] ?? "")}
                    </p>
                  ) : present(pairing) > 1 ? (
                    <p className="absent">
                      {reasonWords(pairing.reason ?? "DIFFERENT_DENOMINATOR", lang)}
                    </p>
                  ) : null}
                  <p className="note">{u.limitationRounded}</p>
                </div>
              );
            })}
          </div>
        )}
      </Chapter>

      <Chapter n={6} title={t.chapterSurnameMap} lang={lang}>
        {distribution.length === 0 ? (
          <p className="absent">{t.surnameNone}</p>
        ) : (
          distribution.map((pairing, index) => {
            const sides = pairing.entries.flatMap((entry, i) =>
              entry === null ? [] : [{ name: names[i] ?? "", side: i, entry }],
            );
            const missing = names.filter((_, i) => pairing.entries[i] === null);
            return (
              <div className="compare-row" key={`${String(pairing.group)}-${index}`}>
                <p className="compare-group">{groupWords(pairing.group, lang)}</p>
                {pairing.comparable || sides.length === 1 ? (
                  <DistributionMaps sides={sides} lang={lang} />
                ) : (
                  <p className="absent">
                    {reasonWords(pairing.reason ?? "DIFFERENT_SNAPSHOT_DATE", lang)}
                  </p>
                )}
                {missing.length === 0 ? null : (
                  <p className="note">{t.mapsMissing(missing.join(", "))}</p>
                )}
              </div>
            );
          })
        )}
      </Chapter>
    </>
  );
}

/** One line of a cell in the overview: a figure and what it is. */
interface GlanceLine {
  readonly key: string;
  readonly figure: string;
  readonly note: string | null;
  readonly mark?: boolean;
}

function GlanceCell({ lines, none }: { lines: readonly GlanceLine[]; none: string }) {
  if (lines.length === 0) return <td className="fnc-glance-none">{none}</td>;
  return (
    <td>
      {lines.map((line) => (
        <span key={line.key} className="fnc-glance-line" data-mark={line.mark ? "" : undefined}>
          <span className="fnc-glance-figure">{line.figure}</span>
          {line.note === null ? null : <small>{line.note}</small>}
        </span>
      ))}
    </td>
  );
}

/**
 * At a glance: a row per person. Each cell repeats a figure a chapter below
 * shows, from the same claims; nothing is summed, an absent figure is words,
 * and "the rarest" is marked only where the rarity gate names one.
 */
function Glance({ people, lang }: { people: readonly PersonResult[]; lang: Lang }) {
  const t = FULL_NAME_COMPARE_TEXT[lang];
  const u = UI[lang];
  const responses = people.map((p) => p.surname.response);
  const population = comparePopulationMany(responses);
  const rarity = compareRarityMany(responses);
  const rarest = rarity.map((pairing) => (pairing.comparable ? rarestOf(pairing) : null));
  const cols = t.glanceCols;
  return (
    <section id="fnc-glance" className="fnc-glance" aria-labelledby="fnc-glance-title">
      <div className="fnc-section-head">
        <h2 id="fnc-glance-title">{t.glanceHeading}</h2>
        <p>{t.glanceNote}</p>
      </div>
      <div className="fnc-glance-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">{cols.person}</th>
              <th scope="col">{cols.register}</th>
              <th scope="col">{cols.births}</th>
              <th scope="col">{cols.origin}</th>
              <th scope="col">{cols.count}</th>
              <th scope="col">{cols.rarity}</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person, i) => {
              const found = person.given.kind === "FOUND" ? person.given.facts : null;
              const register: GlanceLine[] =
                found?.stock.state === "READY"
                  ? BIRTH_SEXES.flatMap((sex) => {
                      const list = stockListOfSex(found.stock.lists, sex);
                      return list === null
                        ? []
                        : [
                            {
                              key: sex,
                              figure: formatInteger(list.count.count, lang),
                              note:
                                list.rank === null
                                  ? t.registerList[sex]
                                  : `${t.registerList[sex]} · ${t.rankOf(
                                      formatInteger(list.rank.rank, lang),
                                      formatInteger(list.rank.universe_size, lang),
                                    )}`,
                            },
                          ];
                    })
                  : [];
              const sexes = found?.births.state === "READY" ? found.births.sexes : [];
              const births: GlanceLine[] = sexes.flatMap((s) =>
                s.latest === null || s.latest.count === null
                  ? []
                  : [
                      {
                        key: s.sex,
                        figure: formatInteger(s.latest.count.count, lang),
                        note: [
                          t.birthsSex[s.sex],
                          String(s.latest.birth_year),
                          s.trend === null ? null : t.direction[s.trend.direction],
                        ]
                          .filter((x) => x !== null)
                          .join(" · "),
                      },
                    ],
              );
              const below = sexes.some((s) => s.latest !== null && s.latest.list !== null);
              const origins =
                found?.meaning.state === "READY"
                  ? [
                      ...new Set(
                        found.meaning.works.flatMap((w) =>
                          w.origin === null
                            ? []
                            : [ORIGINS[w.origin.code]?.[lang] ?? w.origin.code],
                        ),
                      ),
                    ]
                  : [];
              const count: GlanceLine[] = population.flatMap((pairing, g) => {
                const obs = pairing.entries[i] ?? null;
                return obs === null || obs.value.value == null
                  ? []
                  : [
                      {
                        key: `${String(pairing.group)}-${g}`,
                        figure: formatInteger(obs.value.value, lang),
                        note: groupWords(pairing.group, lang),
                      },
                    ];
              });
              const odds: GlanceLine[] = rarity.flatMap((pairing, g) => {
                const entry = pairing.entries[i] ?? null;
                if (entry === null) return [];
                const mark = rarest[g] === i;
                return [
                  {
                    key: `${String(pairing.group)}-${g}`,
                    figure: `${u.compareOneIn} ${formatInteger(entry.primary.value, lang)}`,
                    note: mark
                      ? `${groupWords(pairing.group, lang)} · ${t.glanceRarest}`
                      : groupWords(pairing.group, lang),
                    mark,
                  },
                ];
              });
              return (
                <tr key={i} data-side={i}>
                  <th scope="row">
                    <span className="cmp-plate-letter" aria-hidden="true">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>
                      {givenDisplay(person)} {surnameDisplay(person)}
                    </span>
                  </th>
                  <GlanceCell lines={register} none={t.glanceNone} />
                  <GlanceCell
                    lines={births}
                    none={births.length === 0 && below ? t.glanceBelow : t.glanceNone}
                  />
                  <GlanceCell
                    lines={origins.map((o) => ({ key: o, figure: o, note: null }))}
                    none={t.glanceNone}
                  />
                  <GlanceCell lines={count} none={t.notInDataset} />
                  <GlanceCell lines={odds} none={t.notInDataset} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Result({
  people,
  request,
  lang,
}: {
  people: readonly PersonResult[];
  request: FullNameRequest;
  lang: Lang;
}) {
  const t = FULL_NAME_COMPARE_TEXT[lang];
  const unresolved = people.flatMap((person) => [
    ...(person.given.kind === "NOT_FOUND"
      ? [t.givenNotFound(bounded(person.typed.given))]
      : person.given.kind === "HELD"
        ? [t.givenHeld]
        : person.given.kind === "INVALID"
          ? [t.givenInvalid]
          : []),
    ...(person.surname.response === null ? [t.surnameUnknown(displayFor(person.surname))] : []),
  ]);
  const resolved = people.filter((p) => p.surname.path !== null && p.surname.display !== null);
  // Two resolved surnames: the free comparison of the two, by the same slugs.
  const pair =
    people.length === 2 && people.every((p) => p.surname.response !== null)
      ? comparisonPath(people[0]!.surname.slug, people[1]!.surname.slug, lang)
      : null;
  const chapters: readonly (readonly [string, string])[] = [
    ["#fnc-glance", t.glanceHeading],
    ["#fnc-ch-1", t.chapterRegister],
    ["#fnc-ch-2", t.chapterBirths],
    ["#fnc-ch-3", t.chapterMeaning],
    ["#fnc-ch-4", t.navSurnames],
    ...(unresolved.length === 0 ? [] : [["#fnc-missing", t.navMissing] as const]),
  ];
  return (
    <>
      <header className="cmp-head fnc-top">
        <div className="fnc-top-main">
          <p className="fnc-chip" data-state="unlocked">
            {CHECK}
            {t.unlockedChip}
          </p>
          <p className="cmp-eyebrow">{t.eyebrow}</p>
          <NamePlates
            names={people.map((p, i) => ({
              key: String(i),
              lines: [givenDisplay(p), surnameDisplay(p)],
            }))}
            lang={lang}
          />
          <p className="fnc-change-link">
            <a href="#fnc-change">{t.again}</a>
          </p>
        </div>
        <Steps lang={lang} at={3} unlocked />
      </header>
      <div className="fnc-notice">
        <p className="warning cmp-disclaimer">{t.disclaimer}</p>
        <Together lang={lang} />
      </div>
      <nav className="fnc-chapters" aria-label={t.chaptersLabel}>
        {chapters.map(([href, label]) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
      </nav>
      <Glance people={people} lang={lang} />
      <RegisterChapter people={people} lang={lang} />
      <BirthsChapter people={people} lang={lang} />
      <MeaningChapter people={people} lang={lang} />
      <SurnameChapters people={people} lang={lang} />
      {unresolved.length === 0 ? null : (
        <section id="fnc-missing" className="cmp-chapter cmp-unresolved fnc-missing">
          <h2>{t.unresolvedHeading}</h2>
          <ul>
            {unresolved.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>
      )}
      <p className="again cmp-pages">
        <span className="cmp-pages-label">{t.pages}</span>
        {resolved.map((p, i) => (
          <a key={`${p.surname.slug}-${i}`} href={p.surname.path!}>
            {p.surname.display}
          </a>
        ))}
        {pair === null ? null : (
          <a className="cmp-pages-pair" href={pair}>
            {t.surnamesOnly} →
          </a>
        )}
      </p>
      <details id="fnc-change" className="cmp-change">
        <summary>{t.again}</summary>
        <PeopleForm lang={lang} rows={request.rows} error={null} locked={false} />
      </details>
    </>
  );
}

export function FullNameCompareView({ data }: { data: FullNameCompareData }) {
  const { lang } = data;
  const t = FULL_NAME_COMPARE_TEXT[lang];
  const other: Lang = lang === "pl" ? "en" : "pl";
  const query = data.kind === "signed-in" ? fullNameQuery(data.request.rows) : "";
  const freePath = lang === "pl" ? "/pl/porownaj" : "/en/compare";
  const intro = (
    <div className="cmp-intro fnc-top-main">
      <p className="cmp-eyebrow">{t.eyebrow}</p>
      <h1 className="page-title">{t.title}</h1>
      <p className="page-lede">{t.lede}</p>
    </div>
  );
  return (
    <SiteShell
      lang={lang}
      otherPath={`${FULL_NAME_COMPARE_PATHS[other]}${query}`}
      world={{ mode: "quiet" }}
      current="compare"
      mainClassName="compare cmp cmp-full atlas-v1"
    >
      {data.kind === "signed-in" && data.people !== null ? (
        <Result people={data.people} request={data.request} lang={lang} />
      ) : data.kind === "signed-out" ? (
        <>
          <div className="fnc-split">
            <div className="fnc-split-main">
              {intro}
              <p>{t.signedOut}</p>
              <p className="fnc-actions">
                <a className="cmp-sign-in" href={data.signInHref}>
                  {t.signIn}
                </a>
                <a className="fnc-free" href={freePath}>
                  {t.freeLink} →
                </a>
              </p>
              <p className="warning cmp-disclaimer">{t.disclaimer}</p>
            </div>
            <SignedOutPreview lang={lang} />
          </div>
          <Contains lang={lang} locked={false} />
          <Together lang={lang} />
        </>
      ) : (
        <>
          <header className="fnc-top">
            {intro}
            <Steps lang={lang} at={1} unlocked={data.full} />
          </header>
          <div className="fnc-split">
            <PeopleForm
              lang={lang}
              rows={data.request.rows}
              error={data.request.error}
              locked={!data.full}
            />
            {data.full ? null : <Locked lang={lang} freePath={freePath} />}
          </div>
          <Contains lang={lang} locked={!data.full} />
          <Together lang={lang} />
          {data.full ? (
            <p className="cmp-free-link">
              <a href={freePath}>{t.freeLink} →</a>
            </p>
          ) : null}
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
export function runningFullNameCompareDeps(
  pool: Parameters<typeof createAccountsDb>[0],
  lang: Lang,
): FullNameCompareDeps {
  purchases ??= createPurchases({ db: createAccountsDb(pool) });
  const store = purchases;
  return {
    hasFullView: (userId) => store.hasPurchaseOf(userId, FULL_NAME_COMPARE_TIERS),
    findGivenName: (typed) => findBirthGivenName(db(), typed),
    readGivenName: async (givenName) => {
      const [stock, births, meaning] = await Promise.all([
        readGivenNameFacts(db(), givenName, "PAID"),
        readBirthNameFacts(db(), givenName, { surface: "PAID", history: false }),
        readGivenNameMeaning(db(), givenName.id, "PAID"),
      ]);
      return { stock, births, meaning };
    },
    loadSurname: async (typed) => {
      const slug = slugFor(typed);
      if (slug === null) return { slug: typed, display: null, response: null, path: null };
      return loadSide(db(), slug, lang);
    },
  };
}

/** Whether the page exists: its flag and accounts. */
export function fullNameCompareExists(): boolean {
  return fullNameCompareEnabled() && accountsEnabled();
}

/** The page's address for a link from the free comparison, only while it exists. */
export function fullNameCompareHref(lang: Lang): string | null {
  return fullNameCompareExists() ? FULL_NAME_COMPARE_PATHS[lang] : null;
}

export function fullNameCompareMetadata(lang: Lang): Metadata {
  return fullNameCompareEnabled() ? FULL_NAME_COMPARE_METADATA[lang] : {};
}

/** The route's page: a 404 when off; reads the session cookie, loads, renders. */
export async function FullNameCompareRoute({
  lang,
  searchParams,
}: {
  readonly lang: Lang;
  readonly searchParams: Promise<Query>;
}) {
  if (!fullNameCompareEnabled()) notFound();
  const accounts = accountsRuntime();
  if (accounts === null) notFound();
  const query = await searchParams;
  const session = await readBabyNamesSession(accounts);
  const data = await loadFullNameCompare({
    lang,
    query,
    session,
    deps: runningFullNameCompareDeps(accounts.pool, lang),
  });
  return <FullNameCompareView data={data} />;
}
