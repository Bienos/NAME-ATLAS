import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { BABY_NAMES_FULL_TIERS, createAccountsDb, createPurchases } from "@name-atlas/accounts";
import type { Purchases } from "@name-atlas/accounts";
import type { CitationDto } from "@name-atlas/contracts";
import {
  BIRTH_SEXES,
  findBirthGivenName,
  readActiveBirthLists,
  readBirthNameFacts,
  readGivenNameFacts,
  stockListOfSex,
} from "@name-atlas/truth";
import type {
  BirthListInfo,
  BirthNameFacts,
  BirthNameLookup,
  BirthSex,
  BirthSexFigures,
  BirthYearFigures,
  GivenNameFacts,
} from "@name-atlas/truth";
import { accountPath } from "./account-paths.js";
import { accountsRuntime } from "./accounts-runtime.js";
import { BABY_NAMES_FIELD, BABY_NAMES_PATHS, babyNamesEnabled } from "./baby-names-config.js";
import { BABY_NAMES_TEXT } from "./baby-names-text.js";
import { db } from "./db.js";
import { formatDate, formatInteger } from "./messages.js";
import type { Lang } from "./messages.js";
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
}

export type BabyNamesData =
  | { readonly kind: "signed-out"; readonly lang: Lang; readonly signInHref: string }
  | {
      readonly kind: "signed-in";
      readonly lang: Lang;
      /** What was typed, as typed (trimmed); "" before a search. */
      readonly typed: string;
      readonly full: boolean;
      readonly result:
        | { readonly kind: "NONE" }
        | { readonly kind: "INVALID" }
        | { readonly kind: "NOT_FOUND" }
        | { readonly kind: "HELD" }
        | {
            readonly kind: "FACTS";
            readonly facts: BirthNameFacts;
            readonly stock: GivenNameFacts;
          }
        /** On no birth list, but the register holds it: the register block and each sex's cut-off. */
        | {
            readonly kind: "STOCK_ONLY";
            readonly name: { readonly id: string; readonly display_name: string };
            readonly stock: GivenNameFacts;
            readonly cutoffs: readonly BirthCutoff[];
          };
    };

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
  const full = await deps.hasFullView(session.userId);
  if (typed === "") return { kind: "signed-in", lang, typed, full, result: { kind: "NONE" } };
  const lookup = await deps.findName(typed);
  if (lookup.kind !== "FOUND") {
    return { kind: "signed-in", lang, typed, full, result: { kind: lookup.kind } };
  }
  const [facts, stock] = await Promise.all([
    deps.readFacts(lookup.given_name, full),
    deps.readStock(lookup.given_name),
  ]);
  if (facts.state === "NOT_ON_ANY_LIST") {
    if (stock.state === "UNAVAILABLE") {
      return { kind: "signed-in", lang, typed, full, result: { kind: "NOT_FOUND" } };
    }
    const cutoffs = cutoffsOf(await deps.readLists());
    const result = { kind: "STOCK_ONLY", name: lookup.given_name, stock, cutoffs } as const;
    return { kind: "signed-in", lang, typed, full, result };
  }
  return { kind: "signed-in", lang, typed, full, result: { kind: "FACTS", facts, stock } };
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

/** "Imiona nadawane dzieciom w Polsce, Ministerstwo Cyfryzacji, resource 1159538". */
function Source({ citations, lang }: { citations: readonly CitationDto[]; lang: Lang }) {
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

function Latest({ figures, lang }: { figures: BirthSexFigures; lang: Lang }) {
  const t = BABY_NAMES_TEXT[lang];
  const latest = figures.latest;
  if (latest === null) return <p className="note">{t.noList}</p>;
  if (latest.count === null) {
    // Absent from the latest list: below its cut-off, never 0; no direction (D-044 §6).
    return (
      <p className="baby-absent">{t.belowCutoff(latest.birth_year, threshold(latest, lang))}</p>
    );
  }
  const citations = distinct(
    latest.rank === null ? [latest.count.citation] : [latest.count.citation, latest.rank.citation],
  );
  return (
    <>
      <dl className="baby-figures">
        <div>
          <dt>{t.childrenIn(latest.birth_year)}</dt>
          <dd data-figure="count">{formatInteger(latest.count.count, lang)}</dd>
        </div>
        {latest.rank === null ? null : (
          <div>
            <dt>{t.rankIn(latest.birth_year)}</dt>
            <dd data-figure="rank">
              {t.rankOf(
                formatInteger(latest.rank.rank, lang),
                formatInteger(latest.rank.universe_size, lang),
              )}
            </dd>
          </div>
        )}
        <div>
          <dt>{t.direction}</dt>
          <dd data-figure="trend" data-direction={figures.trend?.direction ?? "NONE"}>
            {figures.trend === null ? "—" : t.directions[figures.trend.direction]}
          </dd>
        </div>
      </dl>
      <Source citations={citations} lang={lang} />
      {figures.trend === null ? (
        <p className="note">{t.noTrend}</p>
      ) : (
        <>
          <p className="note baby-basis">
            {t.trendBasis(
              figures.trend.latest_year,
              figures.trend.earlier_year,
              figures.trend.change_percent,
            )}
          </p>
          <Source citations={distinct(figures.trend.citations)} lang={lang} />
        </>
      )}
    </>
  );
}

function History({ figures, lang }: { figures: BirthSexFigures; lang: Lang }) {
  const t = BABY_NAMES_TEXT[lang];
  const rows = figures.history ?? [];
  // Each source once, numbered; each row names its own.
  const sources: CitationDto[] = [];
  const indexOf = (c: CitationDto): number => {
    const found = sources.findIndex((s) => s.locator === c.locator && s.title === c.title);
    if (found !== -1) return found + 1;
    sources.push(c);
    return sources.length;
  };
  const caption = `${t.historyHeading}: ${t.sex[figures.sex]}`;
  return (
    <div className="baby-history">
      <div className="table-scroll" tabIndex={0} role="region" aria-label={caption}>
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">{t.yearColumn}</th>
              <th scope="col">{t.countColumn}</th>
              <th scope="col">{t.rankColumn}</th>
              <th scope="col">{t.sourceLine}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((year) => {
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
                      <td>
                        {year.rank === null
                          ? "—"
                          : t.rankOf(
                              formatInteger(year.rank.rank, lang),
                              formatInteger(year.rank.universe_size, lang),
                            )}
                      </td>
                      <td className="baby-ref">[{n}]</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="baby-sources note">
        {sources.map((c, i) => (
          <li key={`${c.locator ?? ""}-${i}`}>
            [{i + 1}] <Source citations={[c]} lang={lang} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Locked({ lang }: { lang: Lang }) {
  const t = BABY_NAMES_TEXT[lang];
  // ADR-0023 §2.5: no buy button until the tier can lawfully be sold.
  return (
    <section className="baby-locked" aria-labelledby="baby-locked-heading">
      <h2 id="baby-locked-heading">{t.lockedHeading}</h2>
      <p>{t.lockedBody}</p>
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
    <div className="baby-register" data-register={sex}>
      <h4>{t.registerHeading}</h4>
      {stock.state === "RIGHTS_BLOCKED" ? (
        <p className="note">{t.rightsBlocked}</p>
      ) : list === null ? (
        <p className="note">{t.registerNone}</p>
      ) : (
        <>
          <dl className="baby-figures">
            <div>
              <dt>{t.registerCount}</dt>
              <dd data-figure="register-count">{formatInteger(list.count.count, lang)}</dd>
            </div>
            {list.rank === null ? null : (
              <div>
                <dt>{t.registerRank}</dt>
                <dd data-figure="register-rank">
                  {t.rankOf(
                    formatInteger(list.rank.rank, lang),
                    formatInteger(list.rank.universe_size, lang),
                  )}
                </dd>
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
    </div>
  );
}

/** A rare name: on no birth list, held by the register. */
function StockOnly({
  name,
  stock,
  cutoffs,
  lang,
}: {
  name: { readonly display_name: string };
  stock: GivenNameFacts;
  cutoffs: readonly BirthCutoff[];
  lang: Lang;
}) {
  const t = BABY_NAMES_TEXT[lang];
  return (
    <>
      <h2 className="baby-name">{name.display_name}</h2>
      <p className="note">{t.apart}</p>
      <p className="note baby-differs">{t.registerDiffers}</p>
      <div className="baby-sexes">
        {BIRTH_SEXES.map((sex) => {
          const cutoff = cutoffs.find((c) => c.sex === sex);
          return (
            <section key={sex} className="baby-sex" data-sex={sex}>
              <h3>{t.sex[sex]}</h3>
              {cutoff === undefined ? (
                <p className="note">{t.noList}</p>
              ) : (
                <p className="baby-absent">
                  {t.belowCutoff(cutoff.birth_year, formatInteger(cutoff.threshold, lang))}
                </p>
              )}
              <Register stock={stock} sex={sex} lang={lang} />
            </section>
          );
        })}
      </div>
    </>
  );
}

function Facts({
  facts,
  stock,
  full,
  lang,
}: {
  facts: BirthNameFacts;
  stock: GivenNameFacts;
  full: boolean;
  lang: Lang;
}) {
  const t = BABY_NAMES_TEXT[lang];
  if (facts.state === "RIGHTS_BLOCKED") return <p className="note">{t.rightsBlocked}</p>;
  return (
    <>
      <h2 className="baby-name">{facts.given_name.display_name}</h2>
      <p className="note">{t.apart}</p>
      <p className="note baby-differs">{t.registerDiffers}</p>
      <div className="baby-sexes">
        {facts.sexes.map((figures) => (
          <section key={figures.sex} className="baby-sex" data-sex={figures.sex}>
            <h3>{t.sex[figures.sex]}</h3>
            <Latest figures={figures} lang={lang} />
            <Register stock={stock} sex={figures.sex} lang={lang} />
          </section>
        ))}
      </div>
      {full ? (
        <section className="baby-full" aria-label={t.historyHeading}>
          <h2>{t.historyHeading}</h2>
          <p className="note">{t.historyNote}</p>
          {facts.sexes.map((figures) =>
            figures.history === null || figures.history.length === 0 ? null : (
              <History key={figures.sex} figures={figures} lang={lang} />
            ),
          )}
        </section>
      ) : (
        <Locked lang={lang} />
      )}
    </>
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
      mainClassName="baby-names"
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
          <div className="baby-result" aria-live="polite">
            {data.result.kind === "INVALID" ? <p role="alert">{t.invalid}</p> : null}
            {data.result.kind === "NOT_FOUND" ? <p>{t.notFound(data.typed)}</p> : null}
            {data.result.kind === "HELD" ? <p>{t.held}</p> : null}
            {data.result.kind === "FACTS" ? (
              <Facts
                facts={data.result.facts}
                stock={data.result.stock}
                full={data.full}
                lang={lang}
              />
            ) : null}
            {data.result.kind === "STOCK_ONLY" ? (
              <StockOnly
                name={data.result.name}
                stock={data.result.stock}
                cutoffs={data.result.cutoffs}
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
function runningDeps(pool: Parameters<typeof createAccountsDb>[0]): BabyNamesDeps {
  purchases ??= createPurchases({ db: createAccountsDb(pool) });
  const store = purchases;
  return {
    findName: (typed) => findBirthGivenName(db(), typed),
    readFacts: (givenName, history) =>
      readBirthNameFacts(db(), givenName, { surface: history ? "PAID" : "FREE", history }),
    readStock: (givenName) => readGivenNameFacts(db(), givenName, "FREE"),
    readLists: () => readActiveBirthLists(db()),
    hasFullView: (userId) => store.hasPurchaseOf(userId, BABY_NAMES_FULL_TIERS),
  };
}

export function babyNamesMetadata(lang: Lang): Metadata {
  return babyNamesEnabled() ? BABY_NAMES_METADATA[lang] : {};
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
  let session: { userId: string } | null = null;
  const token = (await cookies()).get(sessionCookieName(accounts.secure))?.value;
  try {
    const found = token === undefined ? null : await accounts.accounts.sessionFromToken(token);
    if (found !== null) session = { userId: found.userId };
  } catch {
    session = null;
  }
  const data = await loadBabyNames({ lang, query, session, deps: runningDeps(accounts.pool) });
  return <BabyNamesView data={data} />;
}
