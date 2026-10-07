import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import type { CitationDto } from "@name-atlas/contracts";
import {
  BIRTH_SEXES,
  FULL_NAME_SECTION_TYPES,
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
  GivenNameListFacts,
  GivenNameMeaningFacts,
} from "@name-atlas/truth";
import { accountPath } from "./account-paths.js";
import { accountsRuntime } from "./accounts-runtime.js";
import { db } from "./db.js";
import { downloadGate } from "./download-gate.js";
import type { GateVerdict } from "./download-gate.js";
import { GIVEN_NAME_MEANING_TEXT, originWord } from "./given-name-meaning-view.js";
import { formatInteger } from "./messages.js";
import type { Lang } from "./messages.js";
import { SECTION_TITLES } from "./report-view.js";
import {
  REPORT_TEASER_TEXT,
  reportInsidePath,
  reportInsideQueryKey,
  reportNotifyHref,
  reportPrice,
} from "./report-teaser-text.js";
import { SampleReportLink } from "./report-teaser.js";
import { SiteShell } from "./site-shell.js";
import { pageSlug } from "./slug.js";
import { answerSlugForMetadata, canonicalPathFor } from "./surname-page.js";

/**
 * What the full report holds (TASK-166): `/pl/nazwisko/{slug}/pelny-raport`
 * and `/en/surname/{slug}/full-report`, reached from the deck's last card and
 * the share studio.
 *
 * The reader types a first name and sees the report's first chapter for it:
 * the name's count and rank on each PESEL list of first names, its latest
 * figures as a name given to children, and its origin as each admissible work
 * states it. Every figure is a claim read on the FREE surface
 * (`readGivenNameFacts`, `readBirthNameFacts`, `readGivenNameMeaning`), as the
 * baby-names page reads them; nothing is computed here, and an absence is
 * said, never 0. The surname's nine chapters are named, not shown.
 *
 * First-name figures are for signed-in readers, as on the baby-names page:
 * with accounts on, a reader without a session sees the chapters and a way to
 * sign in that returns here. It reads the session, so it is its own dynamic
 * page; never indexed, never in a sitemap. The report cannot be bought yet:
 * "Wkrótce" and the waiting-list email, no buy button (ADR-0037 §2 as amended).
 */

export const REPORT_INSIDE_METADATA: Metadata = {
  title: "Name Atlas",
  robots: { index: false, follow: false },
};

const TEXT = {
  pl: {
    back: "Wróć do kart",
    eyebrow: (surname: string) => `Pełny raport · PDF · ${surname}`,
    heading: "Co jest w raporcie.",
    lede: "Wpisz imię. Pokażemy pierwszą stronę raportu dla imienia i nazwiska.",
    label: "Twoje imię",
    show: "Pokaż",
    signIn: "Próbkę dla Twojego imienia pokażemy po zalogowaniu.",
    signInLink: "Zaloguj się",
    invalid: "Wpisz imię, najwyżej 60 znaków.",
    notFound: (typed: string) => `Imienia „${typed}” nie ma na listach imion z rejestru PESEL.`,
    held: "Tej formy imienia jeszcze nie pokazujemy: czeka na sprawdzenie.",
    unavailable: "Nie udało się teraz odczytać danych. Spróbuj za chwilę.",
    sampleLabel: "Próbka pierwszej strony raportu",
    chapterOf: "Rozdział 1 z 10",
    sampleMark: "Próbka",
    chapter: "1. Imię",
    stock: (sex: BirthSex) =>
      sex === "MALE" ? "Mężczyźni z tym pierwszym imieniem" : "Kobiety z tym pierwszym imieniem",
    rank: (rank: string, of: string, sex: BirthSex) =>
      `Miejsce ${rank}. z ${of} na liście imion ${sex === "MALE" ? "męskich" : "żeńskich"}.`,
    stockNone: "Tego imienia nie ma na listach pierwszych imion z rejestru PESEL.",
    blocked: "Prawa źródła nie pozwalają tego pokazać.",
    births: "Dzieciom",
    birthsOf: (sex: BirthSex, year: number) =>
      sex === "MALE" ? `chłopców urodzonych w ${year} r.` : `dziewczynek urodzonych w ${year} r.`,
    birthsRank: (rank: string, of: string) => `${rank}. miejsce z ${of}`,
    belowCutoff: (sex: BirthSex, year: number, cutoff: string) =>
      `${sex === "MALE" ? "Chłopcy" : "Dziewczynki"} urodzeni w ${year} r.: poniżej progu listy (mniej niż ${cutoff}).`,
    birthsNone: "Tego imienia nie ma na listach imion nadawanych dzieciom.",
    differ: "Źródła się różnią",
    differNote: "Pokazujemy słowa każdego dzieła.",
    translated: "przekład Name Atlas",
    notes: "Przypisy",
    resource: (id: string) => `zasób ${id}`,
    chapters: "Dziesięć rozdziałów",
    unknown: (pair: string | null, surname: string) =>
      `Gdzie nie ma źródła, rozdział mówi to wprost. Na przykład: ile osób ${
        pair === null ? `ma Twoje imię razem z nazwiskiem ${surname}` : `nazywa się ${pair}`
      }, nie wie nikt, bo żadne źródło nie łączy imienia z nazwiskiem.`,
    once: "jednorazowo · PDF",
    buyNote: "Darmowe karty zostają darmowe. Raport to zamrożona wersja: każdy fakt z przypisem.",
  },
  en: {
    back: "Back to the cards",
    eyebrow: (surname: string) => `Full report · PDF · ${surname}`,
    heading: "What the report holds.",
    lede: "Type a first name. We will show the report's first page for the first name and surname.",
    label: "Your first name",
    show: "Show",
    signIn: "Sign in and we will show the sample for your first name.",
    signInLink: "Sign in",
    invalid: "Type a first name, at most 60 characters.",
    notFound: (typed: string) => `“${typed}” is not on the PESEL register's lists of first names.`,
    held: "We do not show this form of the name yet: it waits for review.",
    unavailable: "The figures could not be read just now. Please try again shortly.",
    sampleLabel: "A sample of the report's first page",
    chapterOf: "Chapter 1 of 10",
    sampleMark: "Sample",
    chapter: "1. First name",
    stock: (sex: BirthSex) =>
      sex === "MALE" ? "Men with this first name" : "Women with this first name",
    rank: (rank: string, of: string, sex: BirthSex) =>
      `Rank ${rank} of ${of} on the list of ${sex === "MALE" ? "men's" : "women's"} first names.`,
    stockNone: "This name is not on the PESEL register's lists of first names.",
    blocked: "The source's rights do not allow this to be shown.",
    births: "Given to children",
    birthsOf: (sex: BirthSex, year: number) =>
      sex === "MALE" ? `boys born in ${year}` : `girls born in ${year}`,
    birthsRank: (rank: string, of: string) => `rank ${rank} of ${of}`,
    belowCutoff: (sex: BirthSex, year: number, cutoff: string) =>
      `${sex === "MALE" ? "Boys" : "Girls"} born in ${year}: below the list's cut-off (fewer than ${cutoff}).`,
    birthsNone: "This name is not on the lists of names given to children.",
    differ: "The sources differ",
    differNote: "We show each work's own words.",
    translated: "",
    notes: "Notes",
    resource: (id: string) => `resource ${id}`,
    chapters: "Ten chapters",
    unknown: (pair: string | null, surname: string) =>
      `Where there is no source, the chapter says so. For example: how many people ${
        pair === null
          ? `have your first name together with the surname ${surname}`
          : `are called ${pair}`
      } nobody knows, because no source links first names to surnames.`,
    once: "one-time · PDF",
    buyNote:
      "The free cards stay free. The report is a frozen version: every fact with a footnote.",
  },
} as const;

// ---------------------------------------------------------------------------
// The sample
// ---------------------------------------------------------------------------

/** The first name's claims the sample shows. */
export interface SampleFacts {
  readonly stock: GivenNameFacts;
  readonly births: BirthNameFacts;
  readonly meaning: GivenNameMeaningFacts;
}

export type SampleState =
  /** Nothing typed. */
  | { readonly kind: "none" }
  /** Accounts on and no session: the way to sign in that returns here. */
  | { readonly kind: "sign-in"; readonly href: string }
  | { readonly kind: "invalid" }
  | { readonly kind: "not-found"; readonly typed: string }
  | { readonly kind: "held" }
  | { readonly kind: "unavailable" }
  | {
      readonly kind: "ready";
      readonly given: { readonly id: string; readonly display_name: string };
      readonly facts: SampleFacts;
    };

export interface SampleDeps {
  readonly findGivenName: (typed: string) => Promise<BirthNameLookup>;
  readonly readGivenName: (givenName: {
    readonly id: string;
    readonly display_name: string;
  }) => Promise<SampleFacts>;
}

/** The claims the running site reads: the FREE surface, the latest list only. */
export const RUNNING_SAMPLE_DEPS: SampleDeps = {
  findGivenName: (typed) => findBirthGivenName(db(), typed),
  readGivenName: async (givenName) => {
    const [stock, births, meaning] = await Promise.all([
      readGivenNameFacts(db(), givenName, "FREE"),
      readBirthNameFacts(db(), givenName, { surface: "FREE", history: false }),
      readGivenNameMeaning(db(), givenName.id, "FREE"),
    ]);
    return { stock, births, meaning };
  },
};

/** What the sample shows for the typed name, after the gate. */
export async function loadSample(
  typed: string | null,
  gate: GateVerdict,
  signInHref: string,
  deps: SampleDeps,
): Promise<SampleState> {
  if (typed === null) return { kind: "none" };
  if (gate === "sign-in") return { kind: "sign-in", href: signInHref };
  if (gate === "unavailable") return { kind: "unavailable" };
  try {
    const found = await deps.findGivenName(typed);
    if (found.kind === "INVALID") return { kind: "invalid" };
    if (found.kind === "NOT_FOUND") return { kind: "not-found", typed: typed.trim() };
    if (found.kind === "HELD") return { kind: "held" };
    return {
      kind: "ready",
      given: found.given_name,
      facts: await deps.readGivenName(found.given_name),
    };
  } catch {
    return { kind: "unavailable" };
  }
}

/** One source record once: each claim has its own citation row (as the baby-names page). */
function distinctCitations(citations: readonly CitationDto[]): CitationDto[] {
  const seen = new Set<string>();
  return citations.filter((c) => {
    const key = `${c.title}|${c.publisher ?? ""}|${c.locator ?? c.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The register's lists of first names the name is on, the larger first; never summed. */
function stockLists(stock: GivenNameFacts): { sex: BirthSex; list: GivenNameListFacts }[] {
  if (stock.state !== "READY") return [];
  return BIRTH_SEXES.flatMap((sex) => {
    const list = stockListOfSex(stock.lists, sex);
    return list === null ? [] : [{ sex, list }];
  }).sort((a, b) => b.list.count.count - a.list.count.count);
}

/** The sexes whose birth lists have ever held the name, the larger latest count first. */
function birthSexes(births: BirthNameFacts) {
  if (births.state !== "READY") return [];
  return births.sexes
    .filter((s) => s.on_any_list && s.latest !== null)
    .sort((a, b) => (b.latest?.count?.count ?? 0) - (a.latest?.count?.count ?? 0));
}

function Note({ n }: { n: number | undefined }) {
  return n === undefined ? null : <sup className="ri-note">{n}</sup>;
}

export function ReportSample({
  lang,
  surname,
  given,
  facts,
}: {
  lang: Lang;
  surname: string;
  given: { readonly display_name: string };
  facts: SampleFacts;
}) {
  const t = TEXT[lang];
  const m = GIVEN_NAME_MEANING_TEXT[lang];
  const lists = stockLists(facts.stock);
  const sexes = birthSexes(facts.births);
  const works = facts.meaning.state === "READY" ? facts.meaning.works : [];

  // Footnotes in reading order: the register's lists, the children's lists, then the works.
  const cited = distinctCitations([
    ...lists.flatMap(({ list }) =>
      list.rank === null ? [list.count.citation] : [list.count.citation, list.rank.citation],
    ),
    ...sexes.flatMap((s) => [
      ...(s.latest?.count === null || s.latest?.count === undefined
        ? []
        : [s.latest.count.citation]),
      ...(s.latest?.rank === null || s.latest?.rank === undefined ? [] : [s.latest.rank.citation]),
    ]),
    ...works.map((w) => w.citation),
  ]);
  const keyOf = (c: CitationDto) => `${c.title}|${c.publisher ?? ""}|${c.locator ?? c.id}`;
  const numbers = new Map(cited.map((c, i) => [keyOf(c), i + 1] as const));
  const noteFor = (c: CitationDto) => numbers.get(keyOf(c));
  const origins = new Set(works.flatMap((w) => (w.origin === null ? [] : [w.origin.code])));

  return (
    <article className="ri-sample" aria-label={t.sampleLabel} data-report-sample="">
      <p className="ri-sample-top">
        <span>{t.chapterOf}</span>
        <span>{t.sampleMark}</span>
      </p>
      <h2 className="ri-pair">
        {given.display_name} {surname}
      </h2>
      <h3 className="ri-chapter">{t.chapter}</h3>
      {facts.stock.state === "RIGHTS_BLOCKED" ? (
        <p>{t.blocked}</p>
      ) : lists.length === 0 ? (
        <p>{t.stockNone}</p>
      ) : (
        <dl className="ri-stock">
          {lists.map(({ sex, list }) => (
            <div key={sex} data-stock={sex}>
              <dt>{t.stock(sex)}</dt>
              <dd>
                <span className="ri-big">{formatInteger(list.count.count, lang)}</span>
                <Note n={noteFor(list.count.citation)} />
                {list.rank === null ? null : (
                  <span className="ri-rank">
                    {t.rank(
                      formatInteger(list.rank.rank, lang),
                      formatInteger(list.rank.universe_size, lang),
                      sex,
                    )}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <div className="ri-births">
        <h4>{t.births}</h4>
        {facts.births.state === "RIGHTS_BLOCKED" ? (
          <p>{t.blocked}</p>
        ) : sexes.length === 0 ? (
          <p>{t.birthsNone}</p>
        ) : (
          <ul>
            {sexes.map((s) => {
              const latest = s.latest;
              if (latest === null) return null;
              if (latest.count === null) {
                return (
                  <li key={s.sex} data-births={s.sex}>
                    {latest.list === null
                      ? null
                      : t.belowCutoff(
                          s.sex,
                          latest.birth_year,
                          formatInteger(latest.list.publication_threshold, lang),
                        )}
                  </li>
                );
              }
              return (
                <li key={s.sex} data-births={s.sex}>
                  <b>{formatInteger(latest.count.count, lang)}</b>{" "}
                  {t.birthsOf(s.sex, latest.birth_year)}
                  {latest.rank === null
                    ? null
                    : ` (${t.birthsRank(
                        formatInteger(latest.rank.rank, lang),
                        formatInteger(latest.rank.universe_size, lang),
                      )})`}
                  <Note n={noteFor(latest.count.citation)} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <h4 className="ri-meaning-heading">{m.heading}</h4>
      {facts.meaning.state === "RIGHTS_BLOCKED" ? (
        <p>{m.blocked}</p>
      ) : works.length === 0 ? (
        <p className="ri-none">{m.none}</p>
      ) : (
        <>
          <ol className="ri-works">
            {works.map((w) => (
              <li key={`${w.citation.id}-${w.locator}`}>
                <span className="ri-work">
                  {`${w.work.author_or_publisher} ${w.work.year}, ${w.locator}`}
                  <Note n={noteFor(w.citation)} />
                </span>
                <span>
                  {w.origin === null
                    ? null
                    : `${originWord(w.origin.code, lang)} (${m.quote(w.origin.as_printed)})`}
                  {w.origin !== null && w.literal_gloss !== null ? " · " : null}
                  {w.literal_gloss === null ? null : m.quote(w.literal_gloss)}
                  {lang === "pl" && w.translation !== null
                    ? `, ${t.translated}: ${m.quote(w.translation.text)}`
                    : null}
                </span>
              </li>
            ))}
          </ol>
          {origins.size > 1 ? (
            <p className="ri-differ">
              <span>{t.differ}</span> {t.differNote}
            </p>
          ) : null}
        </>
      )}
      {cited.length === 0 ? null : (
        <ol className="ri-footnotes" aria-label={t.notes}>
          {cited.map((c) => {
            // Two lists of one register share a title: the resource tells them apart.
            const resource = c.locator?.startsWith("resource:")
              ? t.resource(c.locator.slice("resource:".length))
              : null;
            const label = [c.title, c.publisher, resource]
              .filter((x) => x !== null && x !== "")
              .join(", ");
            return (
              <li key={keyOf(c)}>
                {c.url === null || c.url === "" ? label : <a href={c.url}>{label}</a>}
              </li>
            );
          })}
        </ol>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

export function ReportInside({
  lang,
  surname,
  path,
  otherPath,
  typed,
  sample,
}: {
  lang: Lang;
  surname: string;
  /** The surname page's canonical path. */
  path: string;
  /** This page in the other language. */
  otherPath: string;
  typed: string | null;
  sample: SampleState;
}) {
  const t = TEXT[lang];
  const r = REPORT_TEASER_TEXT[lang];
  const pair = sample.kind === "ready" ? `${sample.given.display_name} ${surname}` : null;
  return (
    <SiteShell
      lang={lang}
      otherPath={otherPath}
      world={{ mode: "quiet" }}
      search={{ query: surname }}
      mainClassName="report-inside"
    >
      <p className="ri-back">
        <a href={`${path}?view=cards`}>
          <span aria-hidden="true">←</span> {t.back}
        </a>
      </p>
      <header className="ri-head">
        <p className="ri-eyebrow">{t.eyebrow(surname)}</p>
        <h1>{t.heading}</h1>
        <p className="ri-lede">{t.lede}</p>
      </header>
      <form className="ri-form" action={reportInsidePath(path, lang)} method="get">
        <div>
          <label htmlFor="ri-given">{t.label}</label>
          <input
            id="ri-given"
            name={reportInsideQueryKey(lang)}
            type="text"
            autoComplete="given-name"
            maxLength={60}
            defaultValue={typed ?? ""}
            required
          />
        </div>
        <button type="submit">{t.show}</button>
      </form>
      {sample.kind === "sign-in" ? (
        <p className="ri-status">
          {t.signIn} <a href={sample.href}>{t.signInLink}</a>
        </p>
      ) : sample.kind === "invalid" ? (
        <p className="ri-status">{t.invalid}</p>
      ) : sample.kind === "not-found" ? (
        <p className="ri-status">{t.notFound(sample.typed)}</p>
      ) : sample.kind === "held" ? (
        <p className="ri-status">{t.held}</p>
      ) : sample.kind === "unavailable" ? (
        <p className="ri-status">{t.unavailable}</p>
      ) : sample.kind === "ready" ? (
        <ReportSample lang={lang} surname={surname} given={sample.given} facts={sample.facts} />
      ) : null}
      <section className="ri-toc" aria-labelledby="ri-toc-heading">
        <h2 id="ri-toc-heading">{t.chapters}</h2>
        <ol>
          {FULL_NAME_SECTION_TYPES.map((type, i) => (
            <li key={type}>
              <span>{String(i + 1).padStart(2, "0")}</span> {SECTION_TITLES[type]?.[lang] ?? type}
            </li>
          ))}
        </ol>
        <p className="ri-unknown">{t.unknown(pair, surname)}</p>
        <SampleReportLink lang={lang} />
      </section>
      <section className="ri-buy" aria-label={r.eyebrow}>
        <p className="ri-price">
          <span>{reportPrice(lang)}</span>
          <span>{t.once}</span>
        </p>
        <p className="ri-soon">{r.soon}</p>
        <a className="ri-notify" href={reportNotifyHref(surname, lang)}>
          {r.notify}
        </a>
        <p className="ri-hint">{r.notifyHint}</p>
        <p className="ri-buy-note">{t.buyNote}</p>
      </section>
    </SiteShell>
  );
}

/** The typed first name from the address, or null for none. */
export function typedName(
  query: Record<string, string | string[] | undefined>,
  lang: Lang,
): string | null {
  const raw = query[reportInsideQueryKey(lang)];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === undefined || value.trim() === "" ? null : value;
}

/** The two route files' shared body. */
export async function reportInsidePage(
  lang: Lang,
  rawSlug: string,
  query: Record<string, string | string[] | undefined>,
  deps: SampleDeps = RUNNING_SAMPLE_DEPS,
) {
  const slug = pageSlug(rawSlug);
  const answer = await answerSlugForMetadata(slug, lang);
  const base = lang === "en" ? "/en/surname" : "/pl/nazwisko";
  if (answer.kind === "MOVED") {
    permanentRedirect(reportInsidePath(`${base}/${encodeURIComponent(answer.current_slug)}`, lang));
  }
  if (answer.kind !== "RESULT") notFound();
  const path = canonicalPathFor(answer, lang, slug);
  const here = reportInsidePath(path, lang);
  const typed = typedName(query, lang);
  const gate =
    typed === null ? "off" : await downloadGate(accountsRuntime(), (await headers()).get("cookie"));
  const sample = await loadSample(typed, gate, accountPath(lang, "sign-in", { next: here }), deps);
  const otherLang: Lang = lang === "pl" ? "en" : "pl";
  return (
    <ReportInside
      lang={lang}
      surname={answer.display}
      path={path}
      otherPath={
        answer.otherLangPath === null
          ? otherLang === "en"
            ? "/?lang=en"
            : "/"
          : reportInsidePath(answer.otherLangPath, otherLang)
      }
      typed={typed}
      sample={sample}
    />
  );
}
