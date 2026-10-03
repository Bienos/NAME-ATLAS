import type { SurnameResultResponse } from "@name-atlas/contracts";
import type { UI } from "./messages.js";

/**
 * The surname page's sections, declared once (TASK-034).
 *
 * Each chapter goes by four names:
 *
 *   - the contract field that carries it;
 *   - the view's key, which the page orders by;
 *   - the anchor, which is its element id and its URL fragment;
 *   - the presentation intent that moves it first (TASK-023 §2.5).
 *
 * Before this file each list was written out separately in `result-view.tsx`,
 * `compare-view.tsx` and `messages.ts`. `globals.css` also selects three anchors
 * by id. Renaming one in one place silently broke the chapter links or the
 * compare layout. `sections.test.ts` now holds the rest of the web app to this
 * list.
 *
 * Anchors are public. They are URL fragments (`docs/canonical/21` §34's stable
 * ids) that shared links can carry, so they are recorded here, not redesigned.
 */

type MessageKey = keyof (typeof UI)["pl"] & keyof (typeof UI)["en"];

interface SectionEntry {
  /** The view's key: how the page orders and renders its chapters. */
  readonly key: string;
  /** The field of the result contract that carries this section. */
  readonly field: keyof SurnameResultResponse;
  /** Further fields this chapter shows, beside its own (TASK-055: rarity's neighbours). */
  readonly also?: readonly (keyof SurnameResultResponse)[];
  /** The element id, and so the URL fragment. */
  readonly anchor: string;
  /** The `?intent=` value that moves this section first, if one does. */
  readonly intent: string | null;
  /** Message keys: the chapter link, the chapter's question and its reading note. */
  readonly nav: MessageKey;
  readonly title: MessageKey;
  readonly lede: MessageKey;
}

/** The chapters, in their default order (directive §17). */
export const SECTIONS = [
  {
    key: "count",
    field: "population",
    anchor: "today-count",
    intent: null,
    nav: "navCount",
    title: "chapterCountTitle",
    lede: "chapterCountLede",
  },
  {
    key: "rarity",
    field: "rarity",
    // Read from the same rank claims, on rarity's rights (ADR-0025 §2.4–2.5).
    also: ["neighbours", "other_form"],
    anchor: "rarity",
    intent: "rarity",
    nav: "navRarity",
    title: "chapterRarityTitle",
    lede: "chapterRarityLede",
  },
  {
    key: "map",
    field: "distribution",
    anchor: "where",
    intent: "map",
    nav: "navWhere",
    title: "chapterWhereTitle",
    lede: "chapterWhereLede",
  },
  {
    key: "change",
    field: "change",
    anchor: "change",
    intent: "change",
    nav: "navChange",
    title: "chapterChangeTitle",
    lede: "chapterChangeLede",
  },
  {
    key: "meaning",
    field: "meaning",
    anchor: "meaning",
    intent: "meaning",
    nav: "navMeaning",
    title: "chapterMeaningTitle",
    lede: "chapterMeaningLede",
  },
  // TASK-054: what Polona's search returns for the surname (ADR-0024).
  {
    key: "archive",
    field: "archive",
    anchor: "archive",
    intent: "archive",
    nav: "navArchive",
    title: "chapterArchiveTitle",
    lede: "chapterArchiveLede",
  },
  // TASK-077: TERYT's localities with the surname's name (ADR-0025 §2.7),
  // shown only when one matches.
  {
    key: "places",
    field: "localities",
    anchor: "places",
    intent: "places",
    nav: "navPlaces",
    title: "chapterPlacesTitle",
    lede: "chapterPlacesLede",
  },
  // TASK-073: the known people Wikidata names with the surname (ADR-0030).
  {
    key: "bearers",
    field: "bearers",
    anchor: "bearers",
    intent: "bearers",
    nav: "navBearers",
    title: "chapterBearersTitle",
    lede: "chapterBearersLede",
  },
] as const satisfies readonly SectionEntry[];

export type Section = (typeof SECTIONS)[number];
export type SectionKey = Section["key"];

/**
 * Presentation intent (TASK-023 §2.5; directive §17). It changes only the order
 * of sections. The payload and the canonical URL are unaffected
 * (`docs/canonical/21` §35).
 */
export type Intent = "default" | NonNullable<Section["intent"]>;

/** The evidence at the foot of the page (ADR-0012). Always last; no intent moves it. */
export const SOURCES_ANCHOR = "sources";

/** The page's first screen, the snapshot, before the chapters. */
export const SNAPSHOT_ANCHOR = "today";

/**
 * The surname page's last screen, after the sources (TASK-053): the share card,
 * to share or save, then where to go next.
 */
export const SUMMARY_ANCHOR = "summary";

export function sectionOf(key: SectionKey): Section {
  const section = SECTIONS.find((entry) => entry.key === key);
  if (section === undefined) {
    throw new Error(`unknown section ${key}`);
  }
  return section;
}

export function anchorOf(key: SectionKey): string {
  return sectionOf(key).anchor;
}

export function parseIntent(value: string | null | undefined): Intent {
  const section = SECTIONS.find((entry) => entry.intent !== null && entry.intent === value);
  return section?.intent ?? "default";
}

/** The default order, or the intent's section first and the rest as they were. Presentation only. */
export function sectionOrder(intent: Intent): readonly SectionKey[] {
  const base = SECTIONS.map((entry) => entry.key);
  const first = SECTIONS.find((entry) => entry.intent === intent)?.key;
  return first === undefined ? base : [first, ...base.filter((key) => key !== first)];
}
