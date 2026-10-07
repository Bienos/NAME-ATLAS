import type { Metadata } from "next";
import type { ReactNode } from "react";
import { assessmentWord } from "./messages.js";
import type { Lang } from "./messages.js";
import { SiteShell } from "./site-shell.js";
import { homePath, howPath } from "./site-links.js";
import { ASSESSMENTS, howDocument } from "./how-text.js";
import type { HowDocument, HowSection, HowVisual } from "./how-text.js";

/**
 * `/pl/jak-to-dziala` and `/en/how-it-works` (TASK-052, redrawn in TASK-159).
 * Static: no database. The illustrations are decorative and carry no figure:
 * every bar, pip and placeholder is drawn, never measured.
 */

export function howMetadata(lang: Lang): Metadata {
  return {
    title: `${howDocument(lang).title} | Name Atlas`,
    alternates: {
      canonical: howPath(lang),
      languages: { pl: howPath("pl"), en: howPath("en") },
    },
  };
}

const ICONS: Record<HowVisual, ReactNode> = {
  count: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 9h8M8 12h8M8 15h5" />
    </>
  ),
  rarity: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </>
  ),
  where: (
    <>
      <path d="M12 21s6-6.2 6-11a6 6 0 0 0-12 0c0 4.8 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </>
  ),
  meaning: (
    <>
      <path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5Z" />
      <path d="M12 6v13.5" />
    </>
  ),
  scale: (
    <>
      <path d="M5 19V14M10 19V10M15 19V7M20 19V4" />
    </>
  ),
  absent: (
    <>
      <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />
      <path d="M9 12h6" />
    </>
  ),
  never: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M6.5 17.5l11-11" />
    </>
  ),
  sources: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </>
  ),
};

function Icon({ visual }: { readonly visual: HowVisual }) {
  return (
    <svg
      className="how-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[visual]}
    </svg>
  );
}

function Anatomy({ doc, lang }: { readonly doc: HowDocument; readonly lang: Lang }) {
  const { labels } = doc;
  return (
    <figure className="how-anatomy">
      <figcaption className="how-anatomy-title">{labels.anatomyTitle}</figcaption>
      <div className="how-anatomy-grid">
        <div className="how-sample" aria-hidden="true">
          <p className="how-sample-question">{labels.anatomyQuestion}</p>
          <div className="how-sample-row">
            <span className="how-pin">1</span>
            <span className="how-skeleton how-skeleton-figure" />
          </div>
          <div className="how-sample-row">
            <span className="how-pin">2</span>
            <span className="how-sample-source">{labels.anatomySource}</span>
          </div>
          <div className="how-sample-row">
            <span className="how-pin">3</span>
            <span className="how-skeleton how-skeleton-date" />
          </div>
          <div className="how-sample-row">
            <span className="how-pin">4</span>
            <span className="how-chip">
              <span className="how-chip-dot" />
              {assessmentWord("VERIFIED", lang)}
            </span>
          </div>
        </div>
        <ol className="how-anatomy-parts">
          {labels.anatomyParts.map((part, i) => {
            const [name, rest] = part.split(" — ");
            return (
              <li key={part}>
                <span className="how-pin">{i + 1}</span>
                <span>
                  <strong>{name}</strong>
                  {rest === undefined ? null : <span> — {rest}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </figure>
  );
}

/** The drawing beside a section's text. Decorative: the text says it all. */
function Illustration({
  visual,
  doc,
  lang,
}: {
  readonly visual: HowVisual;
  readonly doc: HowDocument;
  readonly lang: Lang;
}) {
  const { labels } = doc;
  switch (visual) {
    case "count":
      return (
        <div className="how-visual how-visual-count" aria-hidden="true">
          <span className="how-list-pill">{labels.male}</span>
          <span className="how-not-plus">+</span>
          <span className="how-list-pill">{labels.female}</span>
          <span className="how-visual-note">{labels.notSummed}</span>
        </div>
      );
    case "rarity":
      return (
        <div className="how-visual how-visual-rarity" aria-hidden="true">
          <span className="how-big">{lang === "pl" ? "1 na X" : "1 in X"}</span>
          <span className="how-ramp" />
          <span className="how-ramp-ends">
            <span>{labels.common}</span>
            <span>{labels.rare}</span>
          </span>
        </div>
      );
    case "where":
      return (
        <div className="how-visual how-visual-where" aria-hidden="true">
          {[92, 64, 48, 30].map((w) => (
            <span key={w} className="how-bar" style={{ inlineSize: `${w}%` }} />
          ))}
          <span className="how-bar how-bar-none">{labels.noData}</span>
        </div>
      );
    case "absent":
      return (
        <div className="how-visual how-visual-absent" aria-hidden="true">
          <span className="how-empty-ring" />
          <span className="how-neq">≠</span>
          <span className="how-zero">0</span>
          <span className="how-visual-note">{labels.notZero}</span>
        </div>
      );
    default:
      return null;
  }
}

function Scale({ doc, items }: { readonly doc: HowDocument; readonly items: readonly string[] }) {
  return (
    <div className="how-scale-wrap">
      <ol className="how-scale">
        {items.map((word, i) => {
          const status = ASSESSMENTS[i] ?? "INSUFFICIENT_DATA";
          return (
            <li key={word} className={`how-scale-step how-scale-${status.toLowerCase()}`}>
              <span className="how-meter" aria-hidden="true">
                {[0, 1, 2, 3].map((pip) => (
                  <span key={pip} className={pip < 4 - i ? "how-pip how-pip-on" : "how-pip"} />
                ))}
              </span>
              <strong className="how-scale-word">{word}</strong>
              <span className="how-scale-gloss">{doc.labels.glosses[i]}</span>
            </li>
          );
        })}
      </ol>
      <p className="how-scale-axis" aria-hidden="true">
        <span>↑ {doc.labels.scaleMore}</span>
        <span>{doc.labels.scaleLess} ↓</span>
      </p>
    </div>
  );
}

function Step({
  section,
  index,
  doc,
  lang,
}: {
  readonly section: HowSection;
  readonly index: number;
  readonly doc: HowDocument;
  readonly lang: Lang;
}) {
  const number = String(index + 1).padStart(2, "0");
  return (
    <section id={section.id} className={`how-step how-step-${section.visual}`}>
      <div className="how-step-mark" aria-hidden="true">
        <span className="how-step-number">{number}</span>
        <Icon visual={section.visual} />
      </div>
      <div className="how-step-body">
        <h3>{section.heading}</h3>
        {section.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
        {section.items === undefined ? null : section.visual === "scale" ? (
          <Scale doc={doc} items={section.items} />
        ) : (
          <ul className={section.visual === "never" ? "how-never" : undefined}>
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
      <Illustration visual={section.visual} doc={doc} lang={lang} />
    </section>
  );
}

export function HowView({ lang }: { readonly lang: Lang }) {
  const doc = howDocument(lang);
  const other: Lang = lang === "pl" ? "en" : "pl";
  return (
    <SiteShell
      lang={lang}
      otherPath={howPath(other)}
      world={{ mode: "quiet" }}
      current="how"
      mainClassName="reading how"
    >
      <header className="how-hero">
        <h1 className="page-title">{doc.title}</h1>
        <p className="page-lede">{doc.lede}</p>
        <ul className="how-promises">
          {doc.labels.promises.map((promise, i) => (
            <li key={promise}>
              <span className="how-pin">{i + 2}</span>
              {promise}
            </li>
          ))}
        </ul>
      </header>
      <Anatomy doc={doc} lang={lang} />
      <nav className="how-jump" aria-label={doc.labels.jump}>
        <ol>
          {doc.sections.map((section, i) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>
                <span className="how-jump-number">{String(i + 1).padStart(2, "0")}</span>
                {section.short}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="how-steps">
        {doc.sections.map((section, i) => (
          <Step key={section.id} section={section} index={i} doc={doc} lang={lang} />
        ))}
      </div>
      <p className="how-cta">
        <a className="how-cta-link" href={homePath(lang)}>
          {doc.labels.cta} →
        </a>
      </p>
    </SiteShell>
  );
}
