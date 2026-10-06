import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { createLogger } from "@name-atlas/logging";
import type { OgFacts } from "./og-facts.js";
import type { SummaryFacts } from "./share-facts.js";
import { TOKENS, TYPE_FAMILIES } from "./design-tokens.js";
import { VOIVODESHIP_VIEWBOX, VOIVODESHIPS } from "./voivodeship-geometry.js";

/**
 * The share card itself (TASK-024; restyled to the dusk direction by TASK-052,
 * ADR-0021).
 *
 * One renderer for both canonical routes, so the Polish and English cards can
 * never drift apart. It draws only what `ogFacts` hands it — the surname, a
 * count per partition, `1 in X` where commensurable, the dataset date — and
 * adds nothing but the brand: the dusk ground, cream type, Fraunces for the
 * surname, Instrument Sans for the wordmark and the figures, IBM Plex Mono for
 * the dataset line, and the thread (point → tick → point → ring) in the one
 * light, amber.
 *
 * Deterministic for a given projection: the fonts are files in this app
 * (`assets/fonts/`, see its README), read once per process. If they are
 * missing the card still renders, in the Geist that `next/og` bundles, and a
 * warning is logged — a share card must never 500 because of typography.
 */

/** The dusk tokens, as values: `next/og` cannot read CSS (TASK-034). */
const C = {
  ground: TOKENS["dusk-surface"],
  ink: TOKENS["dusk-ink"],
  secondary: TOKENS["dusk-ink-muted"],
  light: TOKENS["dusk-amber"],
  rule: TOKENS["dusk-line-control"],
  tile: TOKENS["dusk-tile"],
  tileLine: TOKENS["dusk-tile-line"],
  soft: TOKENS["dusk-ink-soft"],
  noData: TOKENS["dusk-map-no-data"],
  map: [
    TOKENS["dusk-map-0"],
    TOKENS["dusk-map-1"],
    TOKENS["dusk-map-2"],
    TOKENS["dusk-map-3"],
    TOKENS["dusk-map-4"],
  ],
} as const;

export const OG_SIZE = { width: 1200, height: 630 } as const;
const PAD_X = 72;
const PAD_Y = 64;
const MEASURE = OG_SIZE.width - PAD_X * 2;

const log = createLogger({ service: "web", base: { component: "og-card" } });

interface BrandFont {
  name: string;
  data: Buffer;
  weight: 400 | 500 | 600;
  style: "normal";
}

/** The files `assets/fonts/README.md` asks for. */
export const FONT_FILES = [
  { name: TYPE_FAMILIES.display, file: "Fraunces-Medium.ttf", weight: 500 },
  { name: TYPE_FAMILIES.ui, file: "InstrumentSans-Regular.ttf", weight: 400 },
  { name: TYPE_FAMILIES.ui, file: "InstrumentSans-SemiBold.ttf", weight: 600 },
  { name: TYPE_FAMILIES.data, file: "IBMPlexMono-Medium.ttf", weight: 500 },
] as const;

let fonts: Promise<BrandFont[]> | null = null;
let warned = false;

/** The brand fonts, read once per process; empty when the files are missing. Shared by the share cards (TASK-056). */
export function loadFonts(): Promise<BrandFont[]> {
  fonts ??= Promise.all(
    FONT_FILES.map(async (f) => ({
      name: f.name,
      data: await readFile(join(process.cwd(), "assets", "fonts", f.file)),
      weight: f.weight,
      style: "normal" as const,
    })),
  ).catch((error: unknown) => {
    // Not cached: a file added later is picked up on the next render.
    fonts = null;
    if (!warned) {
      warned = true;
      log.warn("og_fonts_missing", {
        detail: error instanceof Error ? error.message : String(error),
        fallback: "Geist",
      });
    }
    return [];
  });
  return fonts;
}

/** Grapheme clusters, so `Ł` or a combining sequence counts once. */
export function graphemeCount(text: string): number {
  let n = 0;
  for (const _ of new Intl.Segmenter("pl", { granularity: "grapheme" }).segment(text)) n++;
  return n;
}

/**
 * The surname's size in px (Visual System §6.3, scaled to a 1200px card).
 *
 * Full size up to 10 grapheme clusters, about 13% smaller at 11–16 and 25%
 * smaller at 17–22 — then never wider than the card: PESEL display names are
 * upper case, which runs about a quarter wider than mixed case, so the size is
 * also capped by an estimate of the rendered width. Never below 56px, never
 * truncated; a name that still does not fit wraps at a space or hyphen, and
 * only then inside a word.
 */
export function surnameSize(surname: string, measure: number = MEASURE): number {
  const n = Math.max(1, graphemeCount(surname));
  const tier = n <= 10 ? 144 : n <= 16 ? 125 : n <= 22 ? 108 : 96;
  const upper =
    surname === surname.toLocaleUpperCase("pl") && surname !== surname.toLocaleLowerCase("pl");
  const perGlyph = upper ? 0.7 : 0.56; // em per glyph, Fraunces Medium, measured loosely
  const fit = Math.floor(measure / (n * perGlyph));
  return Math.max(56, Math.min(tier, fit));
}

/** The Atlas Thread, then a data line: the card's foot, the same on both layouts. */
function Foot({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", position: "relative", height: 24, width: "100%" }}>
        <div
          style={{
            position: "absolute",
            left: 8,
            right: 8,
            top: 11,
            height: 2,
            background: C.rule,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 4,
            width: 16,
            height: 16,
            borderRadius: 999,
            background: C.ink,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: Math.round(MEASURE / 3),
            top: 0,
            width: 3,
            height: 24,
            background: C.ink,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: Math.round((MEASURE * 2) / 3) - 8,
            top: 4,
            width: 16,
            height: 16,
            borderRadius: 999,
            background: C.light,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 3,
            width: 18,
            height: 18,
            borderRadius: 999,
            border: `3px solid ${C.ink}`,
            background: C.ground,
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: TYPE_FAMILIES.data,
          fontWeight: 500,
          fontSize: 22,
          letterSpacing: 0.6,
          color: C.secondary,
          minHeight: 28,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function Head({ eyebrow }: { eyebrow: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: C.secondary,
        }}
      >
        {eyebrow}
      </div>
      {/* The wordmark, in plain type, as the pages set it. */}
      <div
        style={{
          fontFamily: TYPE_FAMILIES.ui,
          fontWeight: 600,
          fontSize: 32,
          letterSpacing: -0.4,
          color: C.ink,
        }}
      >
        Name Atlas
      </div>
    </div>
  );
}

/** The width left to the surname when the map takes the right of the card. */
const WITH_MAP = 620;

/**
 * The summary (TASK-060): the page's key figures in one landscape card. The
 * surname, both counts and the rarity on the left, with the change and the
 * old-print figure as small pills; the map and its lit region on the right.
 * A slot with no facts is left out.
 */
function SummaryBody({ summary }: { summary: SummaryFacts }) {
  const { counts, rarity, where, change, print } = summary;
  const measure = where === null ? MEASURE : WITH_MAP;
  const size = Math.min(120, surnameSize(summary.surname, measure));
  const pills = [
    change === null ? null : `${change.figure} · ${change.span}`,
    print === null ? null : `${print.pages} ${print.unit}`,
  ].filter((x) => x !== null);
  return (
    <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 40 }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, maxWidth: measure }}>
        <div
          style={{
            fontFamily: TYPE_FAMILIES.display,
            fontWeight: 500,
            fontSize: size,
            lineHeight: 0.95,
            letterSpacing: -Math.round(size * 0.03),
            wordBreak: "break-word",
          }}
        >
          {summary.surname}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 18 }}>
          {counts.map((c) => (
            <div key={c.list} style={{ fontSize: 30, lineHeight: 1.25, color: C.ink }}>
              {`${c.value} ${summary.countUnit} · ${c.list}`}
            </div>
          ))}
        </div>
        {rarity === null ? null : (
          <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 14 }}>
            <div
              style={{
                fontFamily: TYPE_FAMILIES.display,
                fontSize: 58,
                lineHeight: 1.05,
                color: C.light,
              }}
            >
              {rarity.figure}
            </div>
            <div style={{ fontSize: 26, color: C.soft }}>
              {[rarity.rank, rarity.list].filter((x) => x !== null && x !== "").join(" · ")}
            </div>
          </div>
        )}
        {pills.length === 0 ? null : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 18 }}>
            {pills.map((text) => (
              <div
                key={text}
                style={{
                  fontFamily: TYPE_FAMILIES.data,
                  fontSize: 22,
                  padding: "8px 18px",
                  borderRadius: 999,
                  background: C.tile,
                  border: `2px solid ${C.tileLine}`,
                  color: C.ink,
                }}
              >
                {text}
              </div>
            ))}
          </div>
        )}
      </div>
      {where === null ? null : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 360 }}>
          <svg viewBox={VOIVODESHIP_VIEWBOX} width={320} height={Math.round(320 * (531 / 560))}>
            {Object.entries(VOIVODESHIPS).map(([terc, shape]) => {
              const band = where.bands[terc];
              return (
                <path
                  key={terc}
                  d={shape.d}
                  fill={band === undefined ? C.noData : (C.map[band] ?? C.noData)}
                  stroke={C.ground}
                  strokeWidth={1.4}
                />
              );
            })}
          </svg>
          <div style={{ fontSize: 24, color: C.soft, marginTop: 10, textAlign: "center" }}>
            {`${where.caption}: ${where.region} · ${where.share}`}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The page's share image. With a summary (and no caveat to state) it carries
 * the key figures in one composition; otherwise the plain card, which is also
 * what every refusal state renders.
 */
export async function renderOgCard(
  facts: OgFacts,
  summary: SummaryFacts | null = null,
): Promise<ImageResponse> {
  const brandFonts = await loadFonts();
  if (summary !== null && facts.caveat === null) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: `${PAD_Y}px ${PAD_X}px`,
          background: C.ground,
          color: C.ink,
          fontFamily: TYPE_FAMILIES.ui,
        }}
      >
        <Head eyebrow={facts.eyebrow} />
        <SummaryBody summary={summary} />
        <Foot text={summary.sources.join(" · ")} />
      </div>,
      { ...OG_SIZE, ...(brandFonts.length > 0 ? { fonts: brandFonts } : {}) },
    );
  }
  const size = surnameSize(facts.surname);
  const lineSize = facts.lines.length > 2 ? 34 : 40;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: `${PAD_Y}px ${PAD_X}px`,
        background: C.ground,
        color: C.ink,
        fontFamily: TYPE_FAMILIES.ui,
      }}
    >
      <Head eyebrow={facts.eyebrow} />

      {/* The surname is the hero; the figures follow it, never lead it. */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontFamily: TYPE_FAMILIES.display,
            fontWeight: 500,
            fontSize: size,
            lineHeight: 0.95,
            letterSpacing: -Math.round(size * 0.03),
            wordBreak: "break-word",
            maxWidth: MEASURE,
          }}
        >
          {facts.surname}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 28 }}>
          {facts.lines.map((line) => (
            <div key={line} style={{ fontSize: lineSize, lineHeight: 1.25, color: C.ink }}>
              {line}
            </div>
          ))}
          {facts.caveat === null ? null : (
            <div style={{ fontSize: 30, lineHeight: 1.3, color: C.secondary }}>{facts.caveat}</div>
          )}
        </div>
      </div>

      <Foot text={facts.footer} />
    </div>,
    { ...OG_SIZE, ...(brandFonts.length > 0 ? { fonts: brandFonts } : {}) },
  );
}
