"use client";

import { useState } from "react";
import type { Lang } from "./messages.js";
import { MAP_TERCS, MAP_VIEWBOX, treeMap } from "./tree-map.js";
import type { RailItem, RegionGroup } from "./tree-map.js";
import { treePath } from "./tree-paths.js";
import { fullName } from "./tree-pedigree.js";
import type { Slot } from "./tree-pedigree.js";
import type { PlaceRegion } from "./tree-places.js";
import { statusChip, TREE_TEXT, yearsLine } from "./tree-text.js";
import { VOIVODESHIPS } from "./voivodeship-geometry.js";

/**
 * The Mapa (TASK-092): the people of the pedigree in their voivodeships on
 * the map of Poland, a rail of them by generation, and the picked one's
 * card. The island is as small as the Konstelacja's: every rail item is a
 * link `?sel=n`, so the page reads and works without script; with script a
 * click picks in place. The layout is `tree-map.ts`'s.
 */

export interface TreeMapProps {
  readonly lang: Lang;
  readonly treeId: string;
  readonly canEdit: boolean;
  readonly slots: readonly Slot[];
  readonly places: readonly PlaceRegion[];
  readonly picked: number;
}

function band(count: number): string {
  return count >= 3 ? "b4" : count === 2 ? "b3" : "b2";
}

function placeLine(item: RailItem, lang: Lang): string {
  const t = TREE_TEXT[lang].map;
  if (item.place !== null) {
    const parts = [item.place.name, item.place.district, item.place.region?.name ?? null];
    return parts.filter((part): part is string => part !== null).join(" · ");
  }
  return item.person.birth.place_text ?? t.noPlace;
}

function Marker({ group, lang }: { group: RegionGroup; lang: Lang }) {
  const t = TREE_TEXT[lang].map;
  return (
    <g
      className={`tree-map-mark tree-map-mark-${group.kind}${group.picked ? " tree-map-mark-picked" : ""}`}
      role="img"
      aria-label={t.regionLabel(group.name, group.count)}
    >
      <circle cx={group.x} cy={group.y} r={6} />
      <text className="tree-map-label" x={group.x + 10} y={group.y + 4}>
        {group.name}
        {group.count > 1 ? ` ×${group.count}` : ""}
      </text>
    </g>
  );
}

export function TreeMapView(props: TreeMapProps) {
  const { lang, treeId, canEdit, slots, places } = props;
  const t = TREE_TEXT[lang];
  const [picked, setPicked] = useState(props.picked);
  const map = treeMap(slots, places, picked);
  const byTerc = new Map(map.groups.map((group) => [group.terc, group]));
  const pickedItem = map.rail.flatMap((row) => row.items).find((item) => item.slot.n === picked);
  const pickedChip = pickedItem === undefined ? null : statusChip(pickedItem.person, lang);
  return (
    <div className="tree-map-view">
      <section className="tree-map-sky" aria-label={t.map.mapLabel}>
        <div className="tree-map-canvas">
          <svg viewBox={MAP_VIEWBOX} role="group" aria-label={t.map.mapLabel}>
            {MAP_TERCS.map((terc) => {
              const shape = VOIVODESHIPS[terc];
              const group = byTerc.get(terc);
              if (shape === undefined) return null;
              const classes = [
                "tree-map-region",
                group === undefined
                  ? "tree-map-region-none"
                  : `tree-map-region-${band(group.count)}`,
                group?.picked ? "tree-map-region-picked" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return <path key={terc} d={shape.d} className={classes} />;
            })}
            {map.arcs.map((arc) => (
              <path key={`${arc.from}-${arc.to}`} className="tree-map-arc" d={arc.d} />
            ))}
            {map.groups.map((group) => (
              <Marker key={group.terc} group={group} lang={lang} />
            ))}
          </svg>
        </div>
        <ul className="tree-legend">
          {(["source", "entered", "living"] as const).map((kind) => (
            <li key={kind}>
              <i className={`tree-swatch tree-swatch-${kind}`} aria-hidden="true" />
              {t.constellation.legend[kind]}
            </li>
          ))}
        </ul>
        <p className="tree-sky-note">{t.map.note}</p>
        {map.offMap > 0 ? <p className="tree-sky-note">{t.map.offMap(map.offMap)}</p> : null}
      </section>
      <aside className="tree-rail" aria-label={t.map.railLabel}>
        <p className="tree-eyebrow">{t.map.railLabel}</p>
        {map.rail.map((row) => (
          <div key={row.generation}>
            <p className="tree-eyebrow">
              {t.pedigree.generation[row.generation] ?? `${row.generation + 1}`}
            </p>
            <ul>
              {row.items.map((item) => (
                <li key={item.slot.n}>
                  <a
                    href={`?sel=${item.slot.n}`}
                    className={`tree-rail-item${item.onMap ? "" : " tree-rail-off"}`}
                    aria-current={item.slot.n === picked ? "true" : undefined}
                    onClick={(event: { preventDefault(): void }) => {
                      event.preventDefault();
                      setPicked(item.slot.n);
                    }}
                  >
                    <i
                      className={`tree-swatch tree-swatch-${item.person.treated_as_living ? "living" : item.person.source_note === null ? "entered" : "source"}`}
                      aria-hidden="true"
                    />
                    <span>
                      <b>{fullName(item.person)}</b>
                      <span>
                        {yearsLine(item.person, lang)} · {placeLine(item, lang)}
                        {item.onMap ? "" : ` · ${t.map.offMapItem}`}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {pickedItem === undefined || pickedChip === null ? null : (
          <div className="tree-panel tree-map-card">
            <p className="tree-eyebrow">{t.map.card.heading}</p>
            <h3>{fullName(pickedItem.person)}</h3>
            <p className="tree-card-years">{yearsLine(pickedItem.person, lang)}</p>
            <p>
              {t.map.card.birth}: {placeLine(pickedItem, lang)}
            </p>
            <p className="tree-panel-chips">
              <span className={`tree-chip tree-chip-${pickedChip.kind}`}>{pickedChip.text}</span>
            </p>
            {canEdit ? (
              <p className="account-links">
                <a
                  href={treePath(lang, {
                    page: "person",
                    treeId,
                    personId: pickedItem.person.id,
                  })}
                >
                  {t.constellation.panel.edit}
                </a>
              </p>
            ) : null}
          </div>
        )}
      </aside>
    </div>
  );
}
