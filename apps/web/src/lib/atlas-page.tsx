import type { Metadata } from "next";
import type { ReactNode } from "react";
import { givenNameListFacts, listFacts } from "@name-atlas/truth";
import type { GivenNameListFactsArtefact, ListFactsArtefact } from "@name-atlas/contracts";
import { fillTemplate, formatInteger, UI } from "./messages.js";
import type { Lang } from "./messages.js";
import { SiteShell } from "./site-shell.js";
import { atlasPath, howPath } from "./site-links.js";
import { ListAtlas, keptDate } from "./list-atlas.js";
import { GIVEN_NAME_PLATES, GivenNameAtlas } from "./given-name-atlas.js";
import { loadGivenNameListFacts, loadListFacts } from "./list-atlas-load.js";
import { loadCommonLists } from "./common-surnames-load.js";
import type { CommonList } from "./common-surnames.js";

/**
 * `/pl/atlas` and `/en/atlas` (TASK-178): statistics about each whole
 * published list, in two parts. Part I is the surname atlas (TASK-040, on the
 * landing until now) with four more plates; Part II the first-name lists
 * (ADR-0051). The hero's ledgers set the two lists of each part side by side
 * and never add them: one figure per list, each from its own artefact.
 *
 * Server-rendered. The artefacts are read in process; the rank claims for
 * plate 01 come from the database and fail soft to the artefact's three names.
 */

/** Part I's plates, in order, for the chapter nav: the anchor, the number and the name's key. */
export const SURNAME_PLATES = [
  ["lf-p01", "01", "lfTopName"],
  ["lf-p02", "02", "lfP1Name"],
  ["lf-p03", "03", "lfP2Name"],
  ["lf-p04", "04", "lfP3Name"],
  ["lf-p05", "05", "lfThName"],
  ["lf-p06", "06", "lfP4Name"],
  ["lf-p07", "07", "lfP5Name"],
  ["lf-p08", "08", "lfP6Name"],
  ["lf-p09", "09", "lfColName"],
  ["lf-p10", "10", "lfCrName"],
  ["lf-p11", "11", "lfP7Name"],
] as const;

export function atlasMetadata(lang: Lang): Metadata {
  const t = UI[lang];
  return {
    title: t.atMetaTitle,
    description: t.atMetaDescription,
    alternates: {
      canonical: atlasPath(lang),
      languages: { pl: atlasPath("pl"), en: atlasPath("en") },
    },
  };
}

function Ledger({
  label,
  when,
  rows,
  note,
}: {
  label: string;
  when: string;
  rows: readonly { readonly value: string; readonly label: ReactNode }[];
  note: string;
}) {
  return (
    <div className="at-ledger">
      <p className="at-ledger-lab">
        <span>{label}</span>
        <b>{when}</b>
      </p>
      <div className="at-ledger-rows">
        {rows.map((row, i) => (
          <p key={i} className="at-ledger-row">
            <span className="at-ledger-v">{row.value}</span>
            <span className="at-ledger-l">{row.label}</span>
          </p>
        ))}
      </div>
      <p className="at-never">{note}</p>
    </div>
  );
}

function Hero({
  facts,
  given,
  lang,
}: {
  facts: ListFactsArtefact | null;
  given: GivenNameListFactsArtefact | null;
  lang: Lang;
}) {
  const t = UI[lang];
  const eyebrow =
    facts === null || given === null
      ? t.atTitle
      : fillTemplate(
          t.atEyebrow,
          {
            date: keptDate(facts.snapshot_date, lang),
            from: String(given.first_year),
            to: String(given.last_year),
          },
          {},
          lang,
        );
  const lastBoys = given?.sexes.male.years[given.sexes.male.years.length - 1];
  const lastGirls = given?.sexes.female.years[given.sexes.female.years.length - 1];
  return (
    <section className="at-hero" aria-labelledby="at-title">
      <p className="lf-eyebrow at-eyebrow">{eyebrow}</p>
      <h1 id="at-title" className="at-title">
        {t.atTitle}
      </h1>
      <p className="at-sub">{t.atSub}</p>
      <p className="at-lede">{t.atLede}</p>
      <div className="at-ledgers">
        {facts === null ? null : (
          <Ledger
            label={t.atLedgerSurnames}
            when={fillTemplate(
              t.atLedgerAsOf,
              { date: keptDate(facts.snapshot_date, lang) },
              {},
              lang,
            )}
            rows={(["male", "female"] as const).map((side) => {
              const list = facts.lists[side];
              const surnames = fillTemplate(
                side === "male" ? t.lfP1SurnamesMale : t.lfP1SurnamesFemale,
                {},
                { n: list.summary.surnames },
                lang,
              );
              const people = fillTemplate(
                side === "male" ? t.lfP1PeopleMale : t.lfP1PeopleFemale,
                {},
                { n: list.summary.people },
                lang,
              );
              return {
                value: formatInteger(list.summary.surnames, lang),
                label: `${surnames} · ${formatInteger(list.summary.people, lang)} ${people}`,
              };
            })}
            note={t.atNever}
          />
        )}
        {given === null || lastBoys === undefined || lastGirls === undefined ? null : (
          <Ledger
            label={t.atLedgerGiven}
            when={fillTemplate(t.atLedgerYear, { year: String(given.last_year) }, {}, lang)}
            rows={[
              {
                value: formatInteger(lastBoys.names, lang),
                label: `${fillTemplate(t.gnNamesBoys, {}, { n: lastBoys.names }, lang)} · ${fillTemplate(t.gnChildrenBoys, { k: formatInteger(lastBoys.children, lang) }, { k: lastBoys.children }, lang)}`,
              },
              {
                value: formatInteger(lastGirls.names, lang),
                label: `${fillTemplate(t.gnNamesGirls, {}, { n: lastGirls.names }, lang)} · ${fillTemplate(t.gnChildrenGirls, { k: formatInteger(lastGirls.children, lang) }, { k: lastGirls.children }, lang)}`,
              },
            ]}
            note={t.atNever}
          />
        )}
      </div>
    </section>
  );
}

function Chapters({
  facts,
  given,
  lang,
}: {
  facts: ListFactsArtefact | null;
  given: GivenNameListFactsArtefact | null;
  lang: Lang;
}) {
  const t = UI[lang];
  const years =
    given === null ? null : { y0: String(given.first_year), y1: String(given.last_year) };
  return (
    <nav className="at-chapters" aria-label={t.atChapters}>
      <div className="at-chapters-row">
        {facts === null ? null : (
          <>
            <span className="at-part">{t.atPartI}</span>
            {SURNAME_PLATES.map(([id, number, key]) => (
              <a key={id} href={`#${id}`}>
                <i>{number}</i>
                {t[key]}
              </a>
            ))}
          </>
        )}
        {given === null || years === null ? null : (
          <>
            <span className="at-part at-part-ii">{t.atPartII}</span>
            {GIVEN_NAME_PLATES.map(([id, number, key]) => (
              <a key={id} href={`#${id}`}>
                <i>{number}</i>
                {key === "gnP15Name" ? fillTemplate(t[key], years, {}, lang) : t[key]}
              </a>
            ))}
          </>
        )}
      </div>
    </nav>
  );
}

function Method({ lang }: { lang: Lang }) {
  const t = UI[lang];
  return (
    <section className="at-method" aria-labelledby="at-method-title">
      <p className="lf-eyebrow">{t.atMethodEyebrow}</p>
      <h2 id="at-method-title" className="at-method-title">
        {t.atMethodTitle}
      </h2>
      <ol className="at-method-points">
        {t.atMethodPoints.map(([lead, rest], i) => (
          <li key={lead}>
            <span className="at-method-no">{String(i + 1).padStart(2, "0")}</span>
            <span>
              <b>{lead}</b> {rest}
            </span>
          </li>
        ))}
      </ol>
      <p className="landing-more">
        <a href={howPath(lang)}>{t.landingHowMore}</a>
      </p>
    </section>
  );
}

/** The page's body from what it loaded; exported so a test renders it without a database. */
export function AtlasBody({
  facts,
  given,
  common,
  lang,
}: {
  facts: ListFactsArtefact | null;
  given: GivenNameListFactsArtefact | null;
  common: readonly CommonList[];
  lang: Lang;
}) {
  const t = UI[lang];
  return (
    <>
      <Hero facts={facts} given={given} lang={lang} />
      <Chapters facts={facts} given={given} lang={lang} />
      {facts === null ? (
        <p className="at-unavailable">{t.atUnavailable}</p>
      ) : (
        <ListAtlas facts={facts} common={common} lang={lang} />
      )}
      <GivenNameAtlas facts={given} lang={lang} />
      <Method lang={lang} />
    </>
  );
}

export async function AtlasView({ lang }: { lang: Lang }) {
  const route = atlasPath(lang);
  const facts = loadListFacts(listFacts, route);
  const given = loadGivenNameListFacts(givenNameListFacts, route);
  const common = facts === null ? [] : await loadCommonLists(lang, route);
  const other: Lang = lang === "pl" ? "en" : "pl";
  return (
    <SiteShell
      lang={lang}
      otherPath={atlasPath(other)}
      world={{ mode: "quiet" }}
      current="atlas"
      mainClassName="atlas"
    >
      <AtlasBody facts={facts} given={given} common={common} lang={lang} />
    </SiteShell>
  );
}
