import type { Lang } from "./messages.js";
import {
  REPORT_TEASER_TEXT,
  reportInsidePath,
  reportInsideQueryKey,
  reportNotifyHref,
  reportPrice,
} from "./report-teaser-text.js";

/**
 * The full-name report's announcement (TASK-166): a glowing block on the
 * deck's last card, and a larger one in the share studio. Both say what the
 * report holds, link to the page with a sample, give the price and
 * "Wkrótce", and offer the tier's waiting-list email. No buy button: the
 * report cannot be bought yet (ADR-0037 §2 as amended, ADR-0026 §2.2).
 *
 * They state no fact about any name: what the report holds, never what it
 * says. The sample page reads the claims.
 */

function Check() {
  return (
    <svg
      className="rt-check"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** A small printed page, drawn: the PDF the block is about. */
function Sheet() {
  return (
    <div className="rt-sheet" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
      <i />
      <i />
      <span>PDF</span>
    </div>
  );
}

/** "Wkrótce." and the waiting-list email. */
function Soon({ surname, lang }: { surname: string; lang: Lang }) {
  const t = REPORT_TEASER_TEXT[lang];
  return (
    <p className="rt-soon">
      {t.soon}{" "}
      <a className="rt-notify" href={reportNotifyHref(surname, lang)} title={t.notifyHint}>
        {t.notify}
      </a>
    </p>
  );
}

/** The block on the deck's last card. */
export function DeckReportTeaser({
  surname,
  path,
  lang,
}: {
  surname: string;
  /** The surname page's canonical path. */
  path: string;
  lang: Lang;
}) {
  const t = REPORT_TEASER_TEXT[lang];
  return (
    <section className="rt rt-card" aria-labelledby="rt-card-heading" data-report-teaser="card">
      <Sheet />
      <p className="rt-eyebrow">{t.eyebrow}</p>
      <h3 id="rt-card-heading" className="rt-heading">
        {t.cardHeading}
      </h3>
      <ul className="rt-items">
        {t.cardItems(surname).map((item) => (
          <li key={item}>
            <Check />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="rt-row">
        <a className="rt-sample" href={reportInsidePath(path, lang)}>
          {t.sample} <span aria-hidden="true">→</span>
        </a>
        <span className="rt-price">{reportPrice(lang)}</span>
      </div>
      <Soon surname={surname} lang={lang} />
    </section>
  );
}

/** The block in the share studio: the one-page PDF beside the report, and a way to the sample. */
export function StudioReportTeaser({
  surname,
  path,
  lang,
}: {
  surname: string;
  path: string;
  lang: Lang;
}) {
  const t = REPORT_TEASER_TEXT[lang];
  const inside = reportInsidePath(path, lang);
  const yes = (
    <>
      <Check />
      <span className="visually-hidden">{t.yes}</span>
    </>
  );
  const no = (
    <>
      <span aria-hidden="true">—</span>
      <span className="visually-hidden">{t.no}</span>
    </>
  );
  return (
    <section
      className="rt rt-studio"
      aria-labelledby="rt-studio-heading"
      data-report-teaser="studio"
    >
      <p className="rt-eyebrow rt-split">
        <span>{t.eyebrow}</span>
        <span>{reportPrice(lang)}</span>
      </p>
      <h2 id="rt-studio-heading" className="rt-heading">
        {t.studioHeading}
      </h2>
      <form className="rt-try" action={inside} method="get">
        <label htmlFor="rt-try-name">{t.studioTry(surname)}</label>
        <div>
          <input
            id="rt-try-name"
            name={reportInsideQueryKey(lang)}
            type="text"
            autoComplete="given-name"
            maxLength={60}
          />
          <button type="submit">{t.show}</button>
        </div>
      </form>
      <table className="rt-table">
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">{t.tableCaption}</span>
            </th>
            <th scope="col">{t.tableOnePage}</th>
            <th scope="col" className="rt-report-col">
              {t.tableReport}
            </th>
          </tr>
        </thead>
        <tbody>
          {t.tableRows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td className={row.onePage ? undefined : "rt-no"}>{row.onePage ? yes : no}</td>
              <td className="rt-report-col">{yes}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <a className="rt-sample rt-wide" href={inside}>
        {t.studioSample} <span aria-hidden="true">→</span>
      </a>
      <Soon surname={surname} lang={lang} />
    </section>
  );
}
