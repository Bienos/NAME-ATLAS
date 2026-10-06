import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BIRTH_SEXES, readActiveBirthLists, readBirthListPage } from "@name-atlas/truth";
import type { BirthListInfo, BirthListOptions, BirthListPage, BirthSex } from "@name-atlas/truth";
import { accountPath } from "./account-paths.js";
import { accountsRuntime } from "./accounts-runtime.js";
import {
  BABY_NAMES_FIELD,
  BABY_NAMES_LIST_FREE_ROWS,
  BABY_NAMES_LIST_PAGE_SIZE,
  BABY_NAMES_LIST_PATHS,
  BABY_NAMES_PATHS,
  babyNamesEnabled,
} from "./baby-names-config.js";
import { BABY_NAMES_LIST_TEXT } from "./baby-names-list-text.js";
import { Source, readBabyNamesSession, runningBabyNamesDeps } from "./baby-names-page.js";
import { BABY_NAMES_TEXT } from "./baby-names-text.js";
import { db } from "./db.js";
import { formatInteger } from "./messages.js";
import type { Lang } from "./messages.js";
import { SiteShell } from "./site-shell.js";

/**
 * The baby-names list page (TASK-146, D-047): `/pl/imiona-dla-dziecka/lista`
 * and `/en/baby-names/list`. The names of one year's list, ranked, boys and
 * girls apart, each linking to the single-name page.
 *
 * Signed out: the explanation and a sign-in link; no figure. Signed in, free:
 * the top rows of each sex's latest list (`BABY_NAMES_LIST_FREE_ROWS`). For
 * an account holding a tier that includes the full figures
 * (`BABY_NAMES_FULL_TIERS`, the same check as the single-name page): every
 * name of any year's list, paging, and the rising/falling filter. Anyone else
 * asking for more gets the locked card, "8,99 zł · Wkrótce", and **no row
 * beyond the free ones is read, let alone sent**. There is no buy button or
 * checkout link (ADR-0023 §2.5).
 *
 * Figures come from `readBirthListPage` (claims only). A 404 unless
 * `BABY_NAMES_ENABLED` is `1` and accounts are on; `noindex`; `private,
 * no-store` from the middleware; in no sitemap.
 */

export const BABY_NAMES_LIST_METADATA: Readonly<Record<Lang, Metadata>> = {
  pl: { title: "Cała lista imion · Name Atlas", robots: { index: false, follow: false } },
  en: {
    title: "The whole list of baby names · Name Atlas",
    robots: { index: false, follow: false },
  },
};

type Query = Readonly<Record<string, string | string[] | undefined>>;

export interface BabyNamesListDeps {
  /** The stored lists on ACTIVE source records. */
  readonly readLists: () => Promise<readonly BirthListInfo[]>;
  readonly readPage: (list: BirthListInfo, options: BirthListOptions) => Promise<BirthListPage>;
  /** Whether the account holds a tier that includes the full figures. */
  readonly hasFullView: (userId: string) => Promise<boolean>;
}

export type ListTrendFilter = "RISING" | "FALLING";

export interface ListSelection {
  readonly sex: BirthSex;
  readonly year: number;
  readonly latestYear: number;
  /** The years that have a list of this sex, newest first. */
  readonly years: readonly number[];
  readonly page: number;
  readonly trend: ListTrendFilter | null;
}

export type BabyNamesListData =
  | { readonly kind: "signed-out"; readonly lang: Lang; readonly signInHref: string }
  | {
      readonly kind: "signed-in";
      readonly lang: Lang;
      readonly full: boolean;
      /** Null when no list of the chosen sex is stored. */
      readonly selection: ListSelection | null;
      readonly sex: BirthSex;
      readonly body:
        | { readonly kind: "NO_LIST" }
        /** Asked for more than the free view: the locked card, no row. */
        | { readonly kind: "LOCKED" }
        | {
            readonly kind: "ROWS";
            readonly page: BirthListPage;
            readonly pages: number;
            /** The free view: only the first rows, the locked card after them. */
            readonly free: boolean;
            readonly trendIgnored: boolean;
          };
    };

function first(query: Query, key: string): string {
  const value = query[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** `boys` and `girls`, in both languages; anything else is the boys' list. */
export function parseListSex(value: string): BirthSex {
  return value === "girls" ? "FEMALE" : "MALE";
}

function sexParam(sex: BirthSex): "boys" | "girls" {
  return sex === "FEMALE" ? "girls" : "boys";
}

function parseTrend(value: string): ListTrendFilter | null {
  return value === "rising" ? "RISING" : value === "falling" ? "FALLING" : null;
}

function parsePositive(value: string): number | null {
  return /^[0-9]{1,6}$/u.test(value) && Number(value) > 0 ? Number(value) : null;
}

/** What the page shows, from the session and the query; no rendering, no cookie. */
export async function loadBabyNamesList(input: {
  readonly lang: Lang;
  readonly query: Query;
  readonly session: { readonly userId: string } | null;
  readonly deps: BabyNamesListDeps;
}): Promise<BabyNamesListData> {
  const { lang, session, deps, query } = input;
  if (session === null) {
    return {
      kind: "signed-out",
      lang,
      signInHref: accountPath(lang, "sign-in", { next: BABY_NAMES_LIST_PATHS[lang] }),
    };
  }
  const full = await deps.hasFullView(session.userId);
  const sex = parseListSex(first(query, "sex"));
  const lists = (await deps.readLists()).filter((l) => l.sex === sex);
  if (lists.length === 0) {
    return { kind: "signed-in", lang, full, selection: null, sex, body: { kind: "NO_LIST" } };
  }
  const years = lists.map((l) => l.birth_year).sort((a, b) => b - a);
  const latestYear = years[0] ?? 0;
  const yearAsked = parsePositive(first(query, "year"));
  const year = yearAsked ?? latestYear;
  const pageAsked = parsePositive(first(query, "page")) ?? 1;
  const trendAsked = parseTrend(first(query, "trend"));
  // A direction exists only on the latest list (D-044 §6, ADR-0043 §7).
  const trend = year === latestYear ? trendAsked : null;
  const selection: ListSelection = { sex, year, latestYear, years, page: pageAsked, trend };

  if (!full) {
    // The free view is the latest list's first rows. Anything else is the paid view: no read.
    const wantsMore = year !== latestYear || pageAsked > 1 || trendAsked !== null;
    if (wantsMore)
      return { kind: "signed-in", lang, full, selection, sex, body: { kind: "LOCKED" } };
  }
  const list = lists.find((l) => l.birth_year === year);
  if (list === undefined) {
    return { kind: "signed-in", lang, full, selection, sex, body: { kind: "NO_LIST" } };
  }
  const pageSize = full ? BABY_NAMES_LIST_PAGE_SIZE : BABY_NAMES_LIST_FREE_ROWS;
  const page = await deps.readPage(list, {
    surface: full ? "PAID" : "FREE",
    limit: pageSize,
    offset: full ? (pageAsked - 1) * pageSize : 0,
    withTrend: year === latestYear,
    direction: full ? trend : null,
  });
  const pages = Math.max(1, Math.ceil(page.total / pageSize));
  return {
    kind: "signed-in",
    lang,
    full,
    selection,
    sex,
    body: {
      kind: "ROWS",
      page,
      pages,
      free: !full,
      trendIgnored: full && trendAsked !== null && trend === null,
    },
  };
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

function listHref(
  lang: Lang,
  sel: { sex: BirthSex; year: number; latestYear: number; trend: ListTrendFilter | null },
  page: number,
): string {
  const params = new URLSearchParams({ sex: sexParam(sel.sex) });
  if (sel.year !== sel.latestYear) params.set("year", String(sel.year));
  if (sel.trend !== null) params.set("trend", sel.trend === "RISING" ? "rising" : "falling");
  if (page > 1) params.set("page", String(page));
  return `${BABY_NAMES_LIST_PATHS[lang]}?${params.toString()}`;
}

function nameHref(lang: Lang, displayName: string): string {
  return `${BABY_NAMES_PATHS[lang]}?${BABY_NAMES_FIELD[lang]}=${encodeURIComponent(displayName)}`;
}

function Locked({ lang }: { lang: Lang }) {
  const t = BABY_NAMES_LIST_TEXT[lang];
  // ADR-0023 §2.5: no buy button until the tier can lawfully be sold.
  return (
    <section className="baby-locked" aria-labelledby="baby-list-locked-heading">
      <h2 id="baby-list-locked-heading">{t.lockedHeading}</h2>
      <p>{t.lockedBody}</p>
      <p className="baby-tier">
        <span>{t.lockedTier}</span> <span>{t.lockedPrice}</span>{" "}
        <span className="baby-soon">{t.soon}</span>
      </p>
    </section>
  );
}

function Filters({
  lang,
  selection,
  sex,
}: {
  lang: Lang;
  selection: ListSelection | null;
  sex: BirthSex;
}) {
  const t = BABY_NAMES_LIST_TEXT[lang];
  const years = selection?.years ?? [];
  return (
    <form
      className="compare-form baby-form baby-list-form"
      action={BABY_NAMES_LIST_PATHS[lang]}
      method="get"
    >
      <label htmlFor="baby-list-sex">{t.sexLabel}</label>
      <select id="baby-list-sex" name="sex" defaultValue={sexParam(sex)}>
        {BIRTH_SEXES.map((s) => (
          <option key={s} value={sexParam(s)}>
            {t.sexes[s]}
          </option>
        ))}
      </select>
      <label htmlFor="baby-list-year">{t.yearLabel}</label>
      <select id="baby-list-year" name="year" defaultValue={String(selection?.year ?? "")}>
        {years.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
      <label htmlFor="baby-list-trend">{t.trendLabel}</label>
      <select
        id="baby-list-trend"
        name="trend"
        defaultValue={selection?.trend?.toLowerCase() ?? ""}
      >
        <option value="">{t.trendOptions.all}</option>
        <option value="rising">{t.trendOptions.RISING}</option>
        <option value="falling">{t.trendOptions.FALLING}</option>
      </select>
      <button type="submit">{t.submit}</button>
    </form>
  );
}

function Rows({
  lang,
  page,
  withDirection,
  caption,
}: {
  lang: Lang;
  page: BirthListPage;
  withDirection: boolean;
  caption: string;
}) {
  const t = BABY_NAMES_LIST_TEXT[lang];
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label={caption}>
      <table className="baby-list-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t.rankColumn}</th>
            <th scope="col">{t.nameColumn}</th>
            <th scope="col">{t.countColumn}</th>
            {withDirection ? <th scope="col">{t.directionColumn}</th> : null}
          </tr>
        </thead>
        <tbody>
          {page.rows.map((row) => (
            <tr key={row.given_name_id}>
              <td data-figure="rank">
                {row.rank === null ? t.noRank : formatInteger(row.rank, lang)}
              </td>
              <th scope="row">
                <a href={nameHref(lang, row.display_name)}>{row.display_name}</a>
              </th>
              <td data-figure="count">{formatInteger(row.count, lang)}</td>
              {withDirection ? (
                <td data-figure="trend" data-direction={row.direction ?? "NONE"}>
                  {row.direction === null ? t.noDirection : t.directions[row.direction]}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pager({
  lang,
  selection,
  pages,
}: {
  lang: Lang;
  selection: ListSelection;
  pages: number;
}) {
  const t = BABY_NAMES_LIST_TEXT[lang];
  const { page } = selection;
  return (
    <nav className="baby-pager" aria-label={t.pageOf(String(page), String(pages))}>
      {page > 1 ? (
        <a rel="prev" href={listHref(lang, selection, page - 1)}>
          {t.previous}
        </a>
      ) : null}
      <span>{t.pageOf(formatInteger(page, lang), formatInteger(pages, lang))}</span>
      {page < pages ? (
        <a rel="next" href={listHref(lang, selection, page + 1)}>
          {t.next}
        </a>
      ) : null}
    </nav>
  );
}

function Body({ data }: { data: Extract<BabyNamesListData, { kind: "signed-in" }> }) {
  const { lang, selection, body } = data;
  const t = BABY_NAMES_LIST_TEXT[lang];
  const names = BABY_NAMES_TEXT[lang];
  if (body.kind === "NO_LIST") return <p>{t.noList}</p>;
  if (body.kind === "LOCKED") return <Locked lang={lang} />;
  if (selection === null) return <p>{t.noList}</p>;
  const { page, pages, free } = body;
  const heading = t.listHeading(t.sexes[page.list.sex], page.list.birth_year);
  if (page.state === "RIGHTS_BLOCKED") return <p className="note">{names.rightsBlocked}</p>;
  const withDirection = page.list.birth_year === selection.latestYear;
  const pageSize = free ? BABY_NAMES_LIST_FREE_ROWS : BABY_NAMES_LIST_PAGE_SIZE;
  const from = (selection.page - 1) * pageSize + 1;
  return (
    <section className="baby-list" data-sex={page.list.sex} data-year={page.list.birth_year}>
      <h2>{heading}</h2>
      <p className="note baby-cutoff">
        {t.cutoff(formatInteger(page.list.publication_threshold, lang))}
      </p>
      {body.trendIgnored ? <p className="note">{t.trendOnlyLatest(selection.latestYear)}</p> : null}
      {page.rows.length === 0 ? (
        <p>
          {t.noPage} <a href={listHref(lang, selection, 1)}>{t.firstPage}</a>
        </p>
      ) : (
        <>
          <p className="note">
            {free
              ? t.freeShowing(formatInteger(page.rows.length, lang), page.list.birth_year)
              : t.showing(
                  formatInteger(from, lang),
                  formatInteger(from + page.rows.length - 1, lang),
                  formatInteger(page.total, lang),
                )}
          </p>
          <Rows lang={lang} page={page} withDirection={withDirection} caption={heading} />
          <p className="note">{t.rankHelp}</p>
          {withDirection ? <p className="note baby-basis">{t.trendBasis}</p> : null}
          <Source citations={page.citations} lang={lang} />
          {free ? (
            <Locked lang={lang} />
          ) : (
            <Pager lang={lang} selection={selection} pages={pages} />
          )}
        </>
      )}
    </section>
  );
}

export function BabyNamesListView({ data }: { data: BabyNamesListData }) {
  const { lang } = data;
  const t = BABY_NAMES_LIST_TEXT[lang];
  const names = BABY_NAMES_TEXT[lang];
  const other: Lang = lang === "pl" ? "en" : "pl";
  return (
    <SiteShell
      lang={lang}
      otherPath={BABY_NAMES_LIST_PATHS[other]}
      world={{ mode: "quiet" }}
      current="babyNames"
      mainClassName="baby-names"
    >
      <h1 className="page-title">{t.title}</h1>
      <p className="page-lede">{t.lede}</p>
      <p className="note">{names.source}</p>
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
          <p className="note">{t.scope}</p>
          <p className="baby-list-link">
            <a href={BABY_NAMES_PATHS[lang]}>{t.backToSearch}</a>
          </p>
          <Filters lang={lang} selection={data.selection} sex={data.sex} />
          <div className="baby-result" aria-live="polite">
            <Body data={data} />
          </div>
        </>
      )}
    </SiteShell>
  );
}

// ---------------------------------------------------------------------------
// The route
// ---------------------------------------------------------------------------

export function babyNamesListMetadata(lang: Lang): Metadata {
  return babyNamesEnabled() ? BABY_NAMES_LIST_METADATA[lang] : {};
}

/** The route's page: a 404 when off; reads the session cookie, loads, renders. */
export async function BabyNamesListRoute({
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
  // The same entitlement check as the single-name page; no second path (D-047).
  const running = runningBabyNamesDeps(accounts.pool);
  const data = await loadBabyNamesList({
    lang,
    query,
    session,
    deps: {
      readLists: () => readActiveBirthLists(db()),
      readPage: (list, options) => readBirthListPage(db(), list, options),
      hasFullView: running.hasFullView,
    },
  });
  return <BabyNamesListView data={data} />;
}
