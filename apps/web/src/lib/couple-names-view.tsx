import { Source } from "./baby-names-page.js";
import { BABY_NAMES_FIELD, BABY_NAMES_PATHS } from "./baby-names-config.js";
import {
  COUPLE_NAMES_API_PATH,
  COUPLE_NAMES_FIELDS,
  COUPLE_NAMES_PATHS,
} from "./couple-names-config.js";
import type {
  CoupleNamesData,
  CoupleNamesSide,
  LookupResult,
  ReadingState,
} from "./couple-names-page.js";
import { readingParagraphs } from "./couple-names-reading.js";
import { COUPLE_NAMES_TEXT } from "./couple-names-text.js";
import {
  GIVEN_NAME_MEANING_TEXT,
  GivenNameMeaningBlock,
  meaningCitations,
} from "./given-name-meaning-view.js";
import { formatDate } from "./messages.js";
import type { Lang } from "./messages.js";
import { SiteShell } from "./site-shell.js";

/**
 * The couple first-names page's view (TASK-156, ADR-0047). Two names' meaning
 * blocks side by side, exactly as the report and the baby-names page render
 * them, then the reading block. The page's own words judge nothing; the
 * stored reading was checked before it was stored (`checkReading`).
 */

function Lookup({ result, lang }: { result: LookupResult; lang: Lang }) {
  const t = COUPLE_NAMES_TEXT[lang];
  switch (result.kind) {
    case "EMPTY":
      return <p role="alert">{t.empty}</p>;
    case "INVALID":
      return <p role="alert">{t.invalid}</p>;
    case "NOT_FOUND":
      return <p>{t.notFound("")}</p>;
    case "HELD":
      return <p>{t.held}</p>;
    case "FOUND":
      return null;
  }
}

function Side({ side, lang }: { side: CoupleNamesSide; lang: Lang }) {
  const t = COUPLE_NAMES_TEXT[lang];
  const citations = meaningCitations(side.meaning);
  const babyHref = `${BABY_NAMES_PATHS[lang]}?${new URLSearchParams({
    [BABY_NAMES_FIELD[lang]]: side.name.display_name,
  }).toString()}`;
  return (
    <section className="couple-names-side" data-name={side.name.display_name}>
      <h2 className="couple-names-name">{side.name.display_name}</h2>
      <h3>{GIVEN_NAME_MEANING_TEXT[lang].heading}</h3>
      <GivenNameMeaningBlock meaning={side.meaning} lang={lang} />
      {citations.length > 0 ? <Source citations={citations} lang={lang} /> : null}
      <p className="couple-names-links">
        <a href={babyHref}>{t.nameLink(side.name.display_name)}</a>
      </p>
    </section>
  );
}

function Reading({ state, a, b, lang }: { state: ReadingState; a: string; b: string; lang: Lang }) {
  const t = COUPLE_NAMES_TEXT[lang];
  return (
    <section className="couple-reading" data-reading={state.kind} aria-label={t.readingHeading}>
      <h2>{t.readingHeading}</h2>
      {state.kind === "STORED" ? (
        <>
          <p className="note">{t.readingNote(state.reading.model)}</p>
          <div className="couple-reading-text">
            {readingParagraphs(lang === "pl" ? state.reading.text_pl : state.reading.text_en).map(
              (paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ),
            )}
          </div>
          <p className="note">
            {t.readingDate(formatDate(state.reading.created_at.slice(0, 10), lang))}
          </p>
        </>
      ) : null}
      {state.kind === "OFFER" ? (
        <>
          <p className="note">{t.readingWhy}</p>
          <form className="couple-reading-form" action={COUPLE_NAMES_API_PATH} method="post">
            <input type="hidden" name={COUPLE_NAMES_FIELDS.a} value={a} />
            <input type="hidden" name={COUPLE_NAMES_FIELDS.b} value={b} />
            <input type="hidden" name="lang" value={lang} />
            <button type="submit">{t.readingButton}</button>
          </form>
        </>
      ) : null}
      {state.kind === "NEEDS"
        ? state.missing.map((m) => (
            <p key={m.name} className="note">
              {t.readingMissing(m.name, m.why)}
            </p>
          ))
        : null}
      {state.kind === "UNAVAILABLE" ? <p className="note">{t.readingUnavailable}</p> : null}
    </section>
  );
}

export function CoupleNamesView({ data }: { data: CoupleNamesData }) {
  const { lang } = data;
  const t = COUPLE_NAMES_TEXT[lang];
  const other: Lang = lang === "pl" ? "en" : "pl";
  return (
    <SiteShell
      lang={lang}
      otherPath={COUPLE_NAMES_PATHS[other]}
      world={{ mode: "quiet" }}
      mainClassName="couple-names"
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
          <form
            className="compare-form couple-names-form"
            action={COUPLE_NAMES_PATHS[lang]}
            method="get"
          >
            <div>
              <label htmlFor="couple-name-a">{t.labelA}</label>
              <input
                id="couple-name-a"
                name={COUPLE_NAMES_FIELDS.a}
                type="text"
                defaultValue={data.typed.a}
                placeholder={t.placeholderA}
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="words"
              />
            </div>
            <div>
              <label htmlFor="couple-name-b">{t.labelB}</label>
              <input
                id="couple-name-b"
                name={COUPLE_NAMES_FIELDS.b}
                type="text"
                defaultValue={data.typed.b}
                placeholder={t.placeholderB}
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="words"
              />
            </div>
            <button type="submit">{t.submit}</button>
          </form>
          {data.status === "failed" ? <p role="alert">{t.statusFailed}</p> : null}
          {data.status === "limit" ? <p role="alert">{t.statusLimit}</p> : null}
          {data.status === "unavailable" ? <p role="alert">{t.statusUnavailable}</p> : null}
          <div className="couple-names-result" aria-live="polite">
            {data.result.kind === "LOOKUP" ? (
              <>
                {data.result.a.kind === "NOT_FOUND" ? (
                  <p>{t.notFound(data.typed.a)}</p>
                ) : (
                  <Lookup result={data.result.a} lang={lang} />
                )}
                {data.result.b.kind === "NOT_FOUND" ? (
                  <p>{t.notFound(data.typed.b)}</p>
                ) : (
                  <Lookup result={data.result.b} lang={lang} />
                )}
              </>
            ) : null}
            {data.result.kind === "PAIR" ? (
              <>
                <h2 className="baby-name couple-names-title">
                  {t.pairTitle(data.result.a.name.display_name, data.result.b.name.display_name)}
                </h2>
                {data.result.same ? <p className="note">{t.sameName}</p> : null}
                <div className="couple-names-sides">
                  <Side side={data.result.a} lang={lang} />
                  {data.result.same ? null : <Side side={data.result.b} lang={lang} />}
                </div>
                <Reading
                  state={data.result.reading}
                  a={data.result.a.name.display_name}
                  b={data.result.b.name.display_name}
                  lang={lang}
                />
              </>
            ) : null}
          </div>
        </>
      )}
    </SiteShell>
  );
}
