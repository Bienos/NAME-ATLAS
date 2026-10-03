"use client";

import { useState } from "react";
import type { TreePersonRead } from "@name-atlas/family";
import type { Lang } from "./messages.js";
import { constellation, linePath, SKY, viewBox } from "./tree-constellation.js";
import type { Star } from "./tree-constellation.js";
import { treePath } from "./tree-paths.js";
import { fullName } from "./tree-pedigree.js";
import type { Slot } from "./tree-pedigree.js";
import { statusChip, TREE_TEXT, yearsLine } from "./tree-text.js";

/**
 * The Konstelacja (TASK-084): the pedigree's slots as stars in a dusk sky,
 * and a panel for the picked one. An island, but a small one: every star is
 * a link to `?sel=n`, so the page reads and works without script (the server
 * draws the picked star from the address); with script a click picks in
 * place and nothing else runs. The geometry is `tree-constellation.ts`'s. A
 * transparent circle under each star is its hit area: 68 units across, over
 * the glyph and the first line of its label, so a finger finds it.
 */

export interface ConstellationProps {
  readonly lang: Lang;
  readonly treeId: string;
  readonly canEdit: boolean;
  readonly slots: readonly Slot[];
  /** The Ahnentafel number of the picked slot, from the address or the root. */
  readonly picked: number;
}

const NAME_DY = 26;
const SUB_DY = 44;

function firstName(person: TreePersonRead): string {
  return person.given_names.trim().split(/\s+/u)[0] ?? person.given_names;
}

function Lock({ x, y }: { x: number; y: number }) {
  return (
    <g
      className="tree-lock"
      transform={`translate(${x - 6} ${y - 6}) scale(0.5)`}
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </g>
  );
}

function Glyph({ star }: { star: Star }) {
  const { x, y, kind } = star;
  switch (kind) {
    case "source":
      return (
        <>
          <circle className="tree-star-halo" cx={x} cy={y} r={16} />
          <circle className="tree-star-core" cx={x} cy={y} r={7} />
        </>
      );
    case "entered":
      return <circle className="tree-star-core" cx={x} cy={y} r={6} />;
    case "living":
      return (
        <>
          <circle className="tree-star-ring" cx={x} cy={y} r={10} />
          <Lock x={x} y={y} />
        </>
      );
    case "hidden":
      return <circle className="tree-star-ring" cx={x} cy={y} r={9} strokeDasharray="1.5 3" />;
    case "empty":
      return <circle className="tree-star-ring" cx={x} cy={y} r={9} strokeDasharray="4 4" />;
  }
}

function Panel({
  star,
  lang,
  treeId,
  canEdit,
}: {
  star: Star;
  lang: Lang;
  treeId: string;
  canEdit: boolean;
}) {
  const t = TREE_TEXT[lang];
  const words = t.constellation.panel;
  const { slot } = star;
  if (slot.hidden) {
    return (
      <>
        <p className="tree-eyebrow">{words.heading}</p>
        <h3>{words.hiddenHeading}</h3>
        <p>{words.hiddenText}</p>
      </>
    );
  }
  if (slot.person === null) {
    return (
      <>
        <p className="tree-eyebrow">{words.heading}</p>
        <h3>{words.emptyHeading}</h3>
        <p>{words.emptyText}</p>
        {canEdit && slot.childId !== null && slot.role !== null ? (
          <p className="account-links">
            <a
              href={treePath(
                lang,
                { page: "add", treeId },
                { child: slot.childId, role: slot.role },
              )}
            >
              {t.pedigree.empty(slot.role)}
            </a>
          </p>
        ) : null}
      </>
    );
  }
  const person = slot.person;
  const chip = statusChip(person, lang);
  const about = lang === "pl" ? "ok. " : "c. ";
  const line = (event: TreePersonRead["birth"]): string | null => {
    const year = event.year === null ? null : `${event.approx ? about : ""}${event.year}`;
    const parts = [year, event.place_text].filter((part): part is string => part !== null);
    return parts.length === 0 ? null : parts.join(" · ");
  };
  const birth = line(person.birth);
  const death = line(person.death);
  return (
    <>
      <p className="tree-eyebrow">{words.heading}</p>
      <h3>{fullName(person)}</h3>
      <p className="tree-card-years">{yearsLine(person, lang)}</p>
      <p className="tree-panel-chips">
        <span className={`tree-chip tree-chip-${chip.kind}`}>{chip.text}</span>
        <span className={person.source_note === null ? "tree-chip" : "tree-chip tree-chip-source"}>
          {person.source_note === null ? t.pedigree.entered : words.sourceChip}
        </span>
      </p>
      <dl>
        {birth === null ? null : (
          <>
            <dt>{words.birth}</dt>
            <dd>{birth}</dd>
          </>
        )}
        {person.birth_surname === null ? null : (
          <>
            <dt>{words.birthSurname}</dt>
            <dd>{person.birth_surname}</dd>
          </>
        )}
        {death === null ? null : (
          <>
            <dt>{words.death}</dt>
            <dd>{death}</dd>
          </>
        )}
        {person.source_note === null ? null : (
          <>
            <dt>{words.source}</dt>
            <dd>{person.source_note}</dd>
          </>
        )}
      </dl>
      {person.treated_as_living ? <p className="tree-panel-note">{words.livingNote}</p> : null}
      {canEdit ? (
        <p className="account-links">
          <a href={treePath(lang, { page: "person", treeId, personId: person.id })}>{words.edit}</a>
        </p>
      ) : null}
    </>
  );
}

export function TreeConstellation(props: ConstellationProps) {
  const { lang, treeId, canEdit, slots } = props;
  const t = TREE_TEXT[lang].constellation;
  const [picked, setPicked] = useState(props.picked);
  const sky = constellation(slots, picked);
  const pickedStar = sky.stars.find((star) => star.slot.n === picked) ?? sky.stars[0];
  const starName = (star: Star): string => {
    if (star.slot.hidden) return t.hiddenName;
    if (star.slot.person === null) return canEdit ? t.emptyName : t.noneName;
    return firstName(star.slot.person);
  };
  const starSub = (star: Star): string => {
    if (star.slot.hidden || star.slot.person === null) return t.emptySub;
    return yearsLine(star.slot.person, lang);
  };
  const starLabel = (star: Star): string => {
    const who = star.slot.person === null ? t.kind[star.kind] : fullName(star.slot.person);
    return star.slot.person === null ? who : `${who}, ${t.kind[star.kind]}`;
  };
  return (
    <div className="tree-stars">
      <section className="tree-sky-section" aria-label={t.skyLabel}>
        <div className="tree-sky">
          <svg viewBox={viewBox(sky)} role="group" aria-label={t.skyLabel}>
            <defs>
              <radialGradient id="tree-sun">
                <stop offset="0" className="tree-sun-core" />
                <stop offset="0.25" className="tree-sun-mid" />
                <stop offset="0.7" className="tree-sun-edge" />
              </radialGradient>
            </defs>
            <circle className="tree-sun" cx={SKY.cx} cy={SKY.cy} r={120} fill="url(#tree-sun)" />
            {sky.arcs.map((arc) => (
              <path key={arc.generation} className="tree-arc" d={arc.d} />
            ))}
            {sky.arcs.map((arc) => (
              <text
                key={arc.generation}
                className="tree-arc-label"
                x={SKY.cx}
                y={SKY.cy - (SKY.radii[arc.generation] ?? 0) - 28}
                textAnchor="middle"
              >
                {t.arcLabel(arc.generation)}
              </text>
            ))}
            <path className="tree-line tree-line-open" d={linePath(sky.lines, "open")} />
            <path className="tree-line tree-line-solid" d={linePath(sky.lines, "solid")} />
            <path className="tree-line tree-line-hot" d={linePath(sky.lines, "hot")} />
            {sky.stars.map((star) => (
              <a
                key={star.slot.n}
                href={`?sel=${star.slot.n}`}
                className={`tree-star tree-star-${star.kind}`}
                aria-label={starLabel(star)}
                aria-current={star.slot.n === picked ? "true" : undefined}
                onClick={(event: { preventDefault(): void }) => {
                  event.preventDefault();
                  setPicked(star.slot.n);
                }}
              >
                <circle className="tree-star-hit" cx={star.x} cy={star.y + 12} r={34} />
                {star.slot.n === picked ? (
                  <circle className="tree-star-picked" cx={star.x} cy={star.y} r={16} />
                ) : null}
                <Glyph star={star} />
                <text
                  className="tree-star-name"
                  x={star.x}
                  y={star.y + NAME_DY}
                  textAnchor="middle"
                >
                  {starName(star)}
                </text>
                <text className="tree-star-sub" x={star.x} y={star.y + SUB_DY} textAnchor="middle">
                  {starSub(star)}
                </text>
              </a>
            ))}
          </svg>
        </div>
        <ul className="tree-legend">
          {(["source", "entered", "living", "empty"] as const).map((kind) => (
            <li key={kind}>
              <i className={`tree-swatch tree-swatch-${kind}`} aria-hidden="true" />
              {t.legend[kind]}
            </li>
          ))}
        </ul>
        <p className="tree-sky-note">{t.note}</p>
      </section>
      <aside className="tree-panel" aria-label={t.panel.heading}>
        {pickedStar === undefined ? null : (
          <Panel star={pickedStar} lang={lang} treeId={treeId} canEdit={canEdit} />
        )}
      </aside>
    </div>
  );
}
