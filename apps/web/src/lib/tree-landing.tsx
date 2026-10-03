import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { accountPath } from "./account-paths.js";
import type { Lang } from "./messages.js";
import { offerPath } from "./site-links.js";
import { SiteShell } from "./site-shell.js";
import { treeLandingPath, treePath } from "./tree-paths.js";
import { TREE_TEXT } from "./tree-text.js";
import type { TreeLandingText } from "./tree-text.js";

/**
 * The tree's landing page (TASK-073; the owner, 2026-10-03): `/pl/drzewo-rodzinne`
 * and `/en/family-tree`, where the header's "Drzewa" leads. Public, static,
 * no session, no form. It shows before it explains: the hero is a sample
 * pedigree drawn as the tree pages draw one (ADR-0021's dusk; the owner chose
 * "Horyzont" of three directions), rows of generations receding to the
 * horizon, the sun behind the oldest, each person appearing in turn and the
 * next question lit at an empty place. Then why, what the reader can do (a
 * phone frame with the question form, static), who sees it (the same person
 * sealed for everyone and sharp for you), what is planned, and the two
 * actions.
 *
 * Every person here is invented and the figure says so. The motion is the
 * stylesheet's alone (timed for the hero, scroll-driven below where the
 * browser supports it), off under `prefers-reduced-motion`, and the page
 * reads in full with script off. It exists only while the tree is on
 * (`family-config.ts`); the route answers 404 otherwise.
 */

export function treeLandingMetadata(lang: Lang): Metadata {
  const t = TREE_TEXT[lang].landing;
  return {
    title: `${t.title} — Name Atlas`,
    description: t.lede,
    alternates: {
      canonical: treeLandingPath(lang),
      languages: { pl: treeLandingPath("pl"), en: treeLandingPath("en") },
    },
  };
}

/** A sample person of the hero. Invented; `status` draws the chip. */
interface Sample {
  readonly given: string;
  readonly surname: string;
  readonly birth: number;
  readonly approx?: boolean;
  readonly death?: number;
  readonly status: "you" | "living" | "deceased";
  /** When the person appears, in steps of the sequence; the root is 0. */
  readonly step: number;
}

type Row = readonly (Sample | "empty" | "ask")[];

/** The four rows, oldest first, as the figure lays them out. Every name is invented. */
export const SAMPLE_ROWS: readonly Row[] = [
  [
    {
      given: "Franciszek",
      surname: "Zieliński",
      birth: 1903,
      death: 1971,
      status: "deceased",
      step: 7,
    },
    {
      given: "Marianna",
      surname: "Zielińska",
      birth: 1906,
      approx: true,
      death: 1980,
      status: "deceased",
      step: 8,
    },
    {
      given: "Antoni",
      surname: "Kaczmarek",
      birth: 1899,
      death: 1968,
      status: "deceased",
      step: 9,
    },
    "ask",
    "empty",
    { given: "Helena", surname: "Wróbel", birth: 1905, death: 1990, status: "deceased", step: 10 },
    "empty",
    "empty",
  ],
  [
    { given: "Józef", surname: "Zieliński", birth: 1934, death: 2009, status: "deceased", step: 3 },
    {
      given: "Halina",
      surname: "Zielińska",
      birth: 1937,
      death: 2015,
      status: "deceased",
      step: 4,
    },
    {
      given: "Stanisław",
      surname: "Wróbel",
      birth: 1929,
      death: 1998,
      status: "deceased",
      step: 5,
    },
    { given: "Janina", surname: "Wróbel", birth: 1932, death: 2020, status: "deceased", step: 6 },
  ],
  [
    { given: "Andrzej", surname: "Zieliński", birth: 1962, status: "living", step: 1 },
    { given: "Ewa", surname: "Zielińska", birth: 1964, status: "living", step: 2 },
  ],
  [{ given: "Marta", surname: "Zielińska", birth: 1991, status: "you", step: 0 }],
];

/** The question's step: after the last person. */
const ASK_STEP = 11;

function years(p: Sample, t: TreeLandingText["sample"]): string {
  const birth = `${p.approx === true ? `${t.about} ` : ""}${String(p.birth)}`;
  return p.death === undefined ? `${birth} · ${t.alive}` : `${birth} – ${String(p.death)}`;
}

function Lock() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="tree-lock">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function SampleCard({
  item,
  t,
}: {
  readonly item: Sample | "empty" | "ask";
  readonly t: TreeLandingText["sample"];
}) {
  if (item === "empty") {
    return <li className="tree-card tree-card-empty tree-sample-card">{t.empty}</li>;
  }
  if (item === "ask") {
    return (
      <li className="tree-card tree-card-empty tree-sample-card tree-sample-ask">
        {t.empty}
        <span className="tree-ask-chip tree-step" style={{ "--i": ASK_STEP } as CSSProperties}>
          {t.question}
        </span>
      </li>
    );
  }
  const living = item.status !== "deceased";
  return (
    <li
      className={`tree-card tree-sample-card tree-step${item.status === "you" ? " tree-card-you" : living ? "" : " tree-card-lit"}`}
      style={{ "--i": item.step } as CSSProperties}
    >
      <span className="tree-card-name">
        {item.given} {item.surname}
      </span>
      <span className="tree-card-years">{years(item, t)}</span>
      {living ? (
        <span className="tree-chip tree-chip-living">
          <Lock />
          {t.living}
        </span>
      ) : (
        <span className="tree-chip tree-chip-deceased">{t.deceased}</span>
      )}
    </li>
  );
}

/** The hero's figure: four rows, the oldest smallest and dimmest, the sun behind it. */
function Horizon({ t }: { readonly t: TreeLandingText["sample"] }) {
  const labels = [t.generations[3], t.generations[2], t.generations[1], t.generations[0]];
  return (
    <figure className="tree-horizon" aria-label={t.figure}>
      {SAMPLE_ROWS.map((row, i) => (
        <div key={labels[i]} className={`tree-horizon-row tree-horizon-row-${String(i)}`}>
          <p className="tree-eyebrow">{labels[i]}</p>
          <ul className="tree-horizon-cards">
            {row.map((item, j) => (
              <SampleCard
                key={typeof item === "string" ? `${item}-${String(j)}` : item.given}
                item={item}
                t={t}
              />
            ))}
          </ul>
        </div>
      ))}
      <figcaption className="tree-sample">{t.caption}</figcaption>
    </figure>
  );
}

function Actions({ lang, t }: { readonly lang: Lang; readonly t: TreeLandingText }) {
  return (
    <>
      <p className="tree-actions">
        <a className="offer-send" href={treePath(lang, { page: "trees" })}>
          {t.yourTrees}
        </a>
        <a className="offer-send tree-ghost" href={accountPath(lang, "sign-up")}>
          {t.signUp}
        </a>
      </p>
      <p className="tree-note">
        {t.needsAccount} <a href={accountPath(lang, "sign-in")}>{t.signIn}</a>
      </p>
    </>
  );
}

/** The phone frame with the question form as a picture: inputs read only, buttons inert, no form. */
function Demo({ t }: { readonly t: TreeLandingText["what"]["demo"] }) {
  return (
    <figure className="tree-demo" aria-label={t.figure}>
      <div className="tree-frame">
        <p className="tree-frame-top">
          <span className="tree-card-years">{t.tree}</span>
          <span className="tree-chip tree-chip-living">
            <Lock />
            {t.privateChip}
          </span>
        </p>
        <p className="tree-progress" role="img" aria-label={t.progress}>
          <i className="on" />
          <i className="on" />
          <i />
          <i />
        </p>
        <p className="tree-eyebrow">{t.step}</p>
        <p className="tree-frame-h">{t.heading}</p>
        <label>
          <span>{t.given}</span>
          <input type="text" defaultValue={t.givenValue} readOnly tabIndex={-1} />
        </label>
        <div className="tree-year">
          <label>
            <span>{t.year}</span>
            <input
              type="text"
              defaultValue={t.yearValue}
              readOnly
              tabIndex={-1}
              className="tree-mono"
            />
          </label>
          <label className="account-check">
            <input type="checkbox" readOnly tabIndex={-1} />
            <span>{t.about}</span>
          </label>
        </div>
        <label>
          <span>{t.place}</span>
          <input type="text" defaultValue={t.placeValue} readOnly tabIndex={-1} />
        </label>
        <ul className="tree-frame-matches">
          {t.matches.map(([name, where], i) => (
            <li key={name} className={i === 0 ? "on" : undefined}>
              <span>{name}</span>
              <small>{where}</small>
            </li>
          ))}
        </ul>
        <p className="tree-eyebrow">{t.livingQuestion}</p>
        <p className="tree-frame-seg" role="img" aria-label={`${t.livingQuestion} ${t.living[1]}`}>
          <span>{t.living[0]}</span>
          <span className="on">{t.living[1]}</span>
          <span>{t.living[2]}</span>
        </p>
        <span className="offer-send tree-frame-send" aria-hidden="true">
          {t.submit}
        </span>
      </div>
      <figcaption className="tree-sample">{t.caption}</figcaption>
    </figure>
  );
}

function Section({
  className,
  children,
  id,
}: {
  readonly className: string;
  readonly children: ReactNode;
  readonly id: string;
}) {
  return (
    <section className={`${className} tree-reveal`} aria-labelledby={id}>
      {children}
    </section>
  );
}

export function TreeLandingView({ lang }: { readonly lang: Lang }) {
  const t = TREE_TEXT[lang].landing;
  const other: Lang = lang === "pl" ? "en" : "pl";
  return (
    <SiteShell
      lang={lang}
      otherPath={treeLandingPath(other)}
      world={{ mode: "quiet" }}
      mainClassName="reading tree tree-landing"
      current="trees"
    >
      <section className="tree-hero" aria-labelledby="tree-hero-h">
        <div className="tree-hero-sun" aria-hidden="true" />
        <div className="tree-hero-ground" aria-hidden="true" />
        <div className="tree-hero-head">
          <div>
            <p className="tree-eyebrow tree-eyebrow-amber">{t.eyebrow}</p>
            <h2 id="tree-hero-h">{t.heading}</h2>
          </div>
          <div>
            <p className="page-lede">{t.lede}</p>
            <Actions lang={lang} t={t} />
          </div>
        </div>
        <Horizon t={t.sample} />
      </section>

      <Section className="tree-why" id="tree-why-h">
        <div>
          <p className="tree-eyebrow">{t.why.eyebrow}</p>
          <h3 id="tree-why-h">{t.why.heading}</h3>
          <p className="tree-sub">{t.why.sub}</p>
        </div>
        <div>
          {t.why.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <p className="tree-pull">{t.why.pull}</p>
        </div>
      </Section>

      <Section className="tree-what" id="tree-what-h">
        <Demo t={t.what.demo} />
        <div>
          <p className="tree-eyebrow">{t.what.eyebrow}</p>
          <h3 id="tree-what-h">{t.what.heading}</h3>
          <ul className="tree-marks">
            {t.what.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </Section>

      <Section className="tree-who" id="tree-who-h">
        <div>
          <p className="tree-eyebrow">{t.who.eyebrow}</p>
          <h3 id="tree-who-h">{t.who.heading}</h3>
          <ul className="tree-marks tree-marks-lit">
            {t.who.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <figure className="tree-seen" aria-label={`${t.who.othersSee} · ${t.who.youSee}`}>
          <div>
            <p className="tree-seen-label">{t.who.othersSee}</p>
            <div className="tree-card tree-card-hidden tree-seen-card">
              <span className="tree-sealed" aria-hidden="true">
                <span className="tree-card-name">Andrzej Zieliński</span>
                <span className="tree-card-years">1962 · Zamość</span>
              </span>
              <span className="tree-chip tree-chip-living">
                <Lock />
                {t.who.hiddenChip}
              </span>
            </div>
          </div>
          <div>
            <p className="tree-seen-label tree-seen-label-you">{t.who.youSee}</p>
            <div className="tree-card tree-card-lit tree-seen-card">
              <span className="tree-card-name">Andrzej Zieliński</span>
              <span className="tree-card-years">1962 · Zamość</span>
              <span className="tree-chip tree-chip-living">
                <Lock />
                {t.who.livingChip}
              </span>
            </div>
          </div>
          <figcaption className="tree-sample">{t.who.caption}</figcaption>
        </figure>
      </Section>

      <Section className="tree-plans" id="tree-plans-h">
        <div className="tree-plans-head">
          <div>
            <p className="tree-eyebrow">{t.plans.eyebrow}</p>
            <h3 id="tree-plans-h">{t.plans.heading}</h3>
          </div>
          <p>{t.plans.note}</p>
        </div>
        <ul className="tree-plan-cards">
          {t.plans.items.map(([name, sub]) => (
            <li key={name} className="tree-card tree-card-empty">
              <span className="tree-card-name">{name}</span>
              <span className="tree-card-years">{sub}</span>
            </li>
          ))}
        </ul>
      </Section>

      <section className="tree-hero tree-cta" aria-labelledby="tree-cta-h">
        <div className="tree-hero-sun" aria-hidden="true" />
        <div className="tree-hero-ground" aria-hidden="true" />
        <div className="tree-cta-body">
          <p className="tree-eyebrow">{t.cta.eyebrow}</p>
          <h2 id="tree-cta-h">{t.cta.heading}</h2>
          <Actions lang={lang} t={t} />
          <p className="tree-note">
            {t.offer.before}
            <a href={offerPath(lang)}>{t.offer.link}</a>
            {t.offer.after}
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
