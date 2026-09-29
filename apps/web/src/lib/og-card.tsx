import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { createLogger } from "@name-atlas/logging";
import type { OgFacts } from "./og-facts.js";
import { NAME_PRINT_DOT, NAME_PRINT_RINGS_SMALL, NAME_PRINT_VIEWBOX } from "./name-print.js";
import { TOKENS, TYPE_FAMILIES } from "./design-tokens.js";

/**
 * The share card itself (TASK-024, restyled to the Name Atlas Visual System v1).
 *
 * One renderer for both canonical routes, so the Polish and English cards can
 * never drift apart. It draws only what `ogFacts` hands it — the surname, a
 * count per partition, `1 in X` where commensurable, the dataset date — and
 * adds nothing but the brand: Paper ground, Ink type, Newsreader for the
 * surname and the wordmark, the Name Print mark, Inter for the figures, IBM Plex Mono for the
 * dataset line, and the Atlas Thread (point → tick → point → ring) that runs
 * through every Name Atlas share template (Visual System §8, §29).
 *
 * Deterministic for a given projection: the fonts are files in this app
 * (`assets/fonts/`, see its README), read once per process. If they are
 * missing the card still renders, in the Geist that `next/og` bundles, and a
 * warning is logged — a share card must never 500 because of typography.
 */

/** Visual System v1 tokens, as values: `next/og` cannot read CSS (TASK-034). */
const C = {
  paper: TOKENS["surface-primary"],
  ink: TOKENS["text-primary"],
  secondary: TOKENS["text-secondary"],
  atlas: TOKENS.accent,
  rule: TOKENS["border-strong"],
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
  { name: TYPE_FAMILIES.display, file: "Newsreader-Medium.ttf", weight: 500 },
  { name: TYPE_FAMILIES.ui, file: "Inter-Regular.ttf", weight: 400 },
  { name: TYPE_FAMILIES.ui, file: "Inter-SemiBold.ttf", weight: 600 },
  { name: TYPE_FAMILIES.data, file: "IBMPlexMono-Medium.ttf", weight: 500 },
] as const;

let fonts: Promise<BrandFont[]> | null = null;
let warned = false;

function loadFonts(): Promise<BrandFont[]> {
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
export function surnameSize(surname: string): number {
  const n = Math.max(1, graphemeCount(surname));
  const tier = n <= 10 ? 144 : n <= 16 ? 125 : n <= 22 ? 108 : 96;
  const upper =
    surname === surname.toLocaleUpperCase("pl") && surname !== surname.toLocaleLowerCase("pl");
  const perGlyph = upper ? 0.7 : 0.56; // em per glyph, Newsreader Medium, measured loosely
  const fit = Math.floor(MEASURE / (n * perGlyph));
  return Math.max(56, Math.min(tier, fit));
}

export async function renderOgCard(facts: OgFacts): Promise<ImageResponse> {
  const brandFonts = await loadFonts();
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
        background: C.paper,
        color: C.ink,
        fontFamily: TYPE_FAMILIES.ui,
      }}
    >
      {/* Eyebrow, then the mark and the wordmark. */}
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
          {facts.eyebrow}
        </div>
        {/* The Name Print mark and the wordmark (apps/web/assets/brand). */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <svg width={46} height={46} viewBox={NAME_PRINT_VIEWBOX}>
            {NAME_PRINT_RINGS_SMALL.map((d) => (
              <path
                key={d.slice(0, 16)}
                d={d}
                fill="none"
                stroke={C.ink}
                strokeWidth={7}
                strokeLinecap="round"
              />
            ))}
            <circle cx={NAME_PRINT_DOT.cx} cy={NAME_PRINT_DOT.cy} r={8.5} fill={C.atlas} />
          </svg>
          <div
            style={{
              fontFamily: TYPE_FAMILIES.display,
              fontWeight: 500,
              fontSize: 34,
              letterSpacing: -0.7,
              color: C.ink,
            }}
          >
            Name Atlas
          </div>
        </div>
      </div>

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

      {/* The Atlas Thread, then the dataset line in the data face. */}
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
              background: C.atlas,
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
              background: C.paper,
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
          {facts.footer}
        </div>
      </div>
    </div>,
    { ...OG_SIZE, ...(brandFonts.length > 0 ? { fonts: brandFonts } : {}) },
  );
}
