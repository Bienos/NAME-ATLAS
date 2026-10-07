import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import type {
  BabyCardKey,
  BabyFreeCardFacts,
  BabyPaidCardFacts,
} from "./baby-names-share-facts.js";
import { BABY_CARD_SIZES } from "./baby-names-share-facts.js";
import { TOKENS, TYPE_FAMILIES } from "./design-tokens.js";
import { graphemeCount, loadFonts } from "./og-card.js";

/**
 * The baby-names share cards (TASK-152): how they look, never what they say.
 *
 * Three faces drawn by `next/og` from what `baby-names-share-facts.ts` hands
 * them: the free story (1080 × 1920), the free square (1080 × 1080) and the
 * paid "rok po roku" story (1080 × 1920), after the design canvas's boards and
 * in Brand System v1 (ADR-0046). `next/og` cannot read CSS, so the semantic
 * tokens are named here by value: the plum ground, ivory type, Atlas Blue for
 * the lit point and the big figure's accent, amber for the peak year's bar
 * alone, the brand fonts the surname cards load (`loadFonts`). `next/og` lays
 * out with flexbox only, so every box with more than one child says
 * `display: flex`. An element whose fact is absent is not drawn.
 */

/** Brand System v1 roles, as values (`brand-system.css`). */
const C = {
  /** `--color-bg-primary` */
  ground: TOKENS["atlas-plum-850"],
  /** `--color-surface-secondary` */
  tile: TOKENS["atlas-plum-700"],
  /** `--color-text-primary` */
  ink: TOKENS["atlas-ivory-50"],
  /** `--color-text-secondary` */
  soft: TOKENS["atlas-ivory-200"],
  /** `--color-text-tertiary` */
  muted: TOKENS["atlas-ivory-300"],
  /** `--color-border-subtle` */
  line: TOKENS["dusk-line"],
  /** `--color-border-default` */
  control: TOKENS["dusk-line-control"],
  /** `--color-accent-primary` / `--color-signal-atlas`: the lit point. */
  accent: TOKENS["atlas-blue-500"],
  /** `--color-accent-text`: the big figure and the site's address. */
  accentText: TOKENS["atlas-blue-300"],
  /** `--color-signal-amber`: the peak year's bar, nothing else. */
  amber: TOKENS["atlas-amber-500"],
  /** `--chart-context`: the other years' bars. */
  context: TOKENS["atlas-aubergine-500"],
  /** An unlit dot's fill. */
  dot: TOKENS["dusk-tile"],
} as const;

const UI = TYPE_FAMILIES.ui;
const DISPLAY = TYPE_FAMILIES.display;
const MONO = TYPE_FAMILIES.data;

/** The name as large as fits one line, down to `min`, then it wraps. Fraunces Medium, upper case, runs about 0.7 em a glyph. */
export function babyNameSize(name: string, max: number, measure: number, min = 96): number {
  const n = Math.max(1, graphemeCount(name));
  return Math.max(min, Math.min(max, Math.floor(measure / (n * 0.7))));
}

/**
 * The dot grid's dot and gap for N dots in a width: nine, eleven or thirteen
 * to a row on the story card, so sixty dots take five rows and not seven.
 */
export function dotMetrics(
  n: number,
  width: number,
): { readonly size: number; readonly gap: number } {
  if (width < 600) {
    // The square card's column beside the name: five to eight dots a row.
    const [size, gap] = n <= 30 ? [48, 10] : [34, 8];
    return { size, gap };
  }
  const [size, gap] = n <= 30 ? [80, 18] : n <= 45 ? [64, 16] : [52, 14];
  return { size, gap };
}

/** A tile's figure as large as its line allows, down to 40px: "1 na 27" is wider than "Nr 1". */
function tileFigureSize(figure: string, max: number, inner: number): number {
  const n = Math.max(1, graphemeCount(figure));
  return Math.max(40, Math.min(max, Math.floor(inner / (n * 0.5))));
}

/** The Evolved Contour mark (`public/brand/logo/name-atlas-mark.svg`), drawn inline. */
function Mark({ size, color }: { size: number; color: string }): ReactNode {
  const stroke = {
    fill: "none",
    stroke: color,
    strokeWidth: 2.4,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;
  return (
    <svg width={size} height={size} viewBox="0 0 96 96">
      <path
        d="M16 82 C16 58 17 34 23 14 C35 20 40 39 49 54 C57 68 64 80 73 82 C78 63 79 39 82 14"
        {...stroke}
      />
      <path
        d="M22 82 C22 60 23 39 28 21 C38 27 43 43 50 56 C57 68 63 76 70 78 C74 61 75 42 77 21"
        {...stroke}
      />
      <path
        d="M28 78 C28 60 29 43 33 28 C41 33 45 46 51 57 C56 67 61 73 67 74 C70 60 71 45 73 28"
        {...stroke}
      />
      <path
        d="M34 73 C34 59 35 47 38 35 C44 39 47 49 52 58 C56 65 60 69 64 70 C66 59 67 48 68 35"
        {...stroke}
      />
      <path
        d="M40 67 C40 57 41 50 43 43 C47 46 49 52 53 58 C56 63 58 66 61 66 C62 58 63 51 63 43"
        {...stroke}
      />
      <circle cx="69" cy="57" r="4.5" fill={color} />
    </svg>
  );
}

function Head({
  brand,
  eyebrow,
  mark,
  size,
}: {
  brand: string;
  eyebrow: string;
  mark: number;
  size: number;
}): ReactNode {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: Math.round(mark / 3.6) }}>
        <Mark size={mark} color={C.ink} />
        <div
          style={{
            fontFamily: UI,
            fontWeight: 600,
            fontSize: size,
            letterSpacing: -0.4,
            color: C.ink,
          }}
        >
          {brand}
        </div>
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontWeight: 500,
          fontSize: 26,
          letterSpacing: 1,
          color: C.muted,
        }}
      >
        {eyebrow}
      </div>
    </div>
  );
}

function Mono({
  text,
  size,
  color = C.muted,
}: {
  text: string;
  size: number;
  color?: string;
}): ReactNode {
  return (
    <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: size, letterSpacing: 1, color }}>
      {text}
    </div>
  );
}

function Tile({
  figure,
  caption,
  figureSize,
  captionSize,
  pad,
  wrap = false,
}: {
  figure: string;
  caption: string;
  figureSize: number;
  captionSize: number;
  pad: string;
  /** A direction word may wrap; a figure never does. */
  wrap?: boolean;
}): ReactNode {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        gap: 10,
        padding: pad,
        borderRadius: 12,
        background: C.tile,
        border: `1px solid ${C.line}`,
      }}
    >
      <div
        style={{
          fontFamily: DISPLAY,
          fontWeight: 500,
          fontSize: figureSize,
          lineHeight: 1.05,
          color: C.ink,
          ...(wrap ? {} : { whiteSpace: "nowrap" }),
        }}
      >
        {figure}
      </div>
      <div style={{ fontFamily: UI, fontSize: captionSize, lineHeight: 1.3, color: C.soft }}>
        {caption}
      </div>
    </div>
  );
}

/** The three tiles: the rank, "1 na N", the direction; a tile whose fact is absent is left out. */
function Tiles({ facts, square }: { facts: BabyFreeCardFacts; square: boolean }): ReactNode {
  const figureSize = square ? 56 : 72;
  const wordSize = square ? 40 : 48;
  const captionSize = square ? 26 : 30;
  const padX = square ? 24 : 28;
  const pad = square ? `24px ${padX}px` : `32px ${padX}px`;
  const count = [facts.rank, facts.oneIn, facts.direction].filter((x) => x !== null).length;
  const measure = square ? SQUARE_MEASURE : STORY_MEASURE;
  const inner = (measure - (count - 1) * (square ? 20 : 24)) / Math.max(1, count) - padX * 2;
  const tiles = [
    facts.rank === null ? null : (
      <Tile
        key="rank"
        figure={facts.rank.figure}
        caption={square ? facts.rank.ofShort : facts.rank.of}
        figureSize={tileFigureSize(facts.rank.figure, figureSize, inner)}
        captionSize={captionSize}
        pad={pad}
      />
    ),
    facts.oneIn === null ? null : (
      <Tile
        key="one-in"
        figure={facts.oneIn.figure}
        caption={facts.oneIn.noun}
        figureSize={tileFigureSize(facts.oneIn.figure, figureSize, inner)}
        captionSize={captionSize}
        pad={pad}
      />
    ),
    facts.direction === null ? null : (
      <Tile
        key="direction"
        figure={facts.direction.word}
        caption={
          square || facts.direction.shares === null ? facts.direction.years : facts.direction.shares
        }
        figureSize={facts.direction.word.length > 8 ? Math.round(wordSize * 0.8) : wordSize}
        captionSize={captionSize}
        pad={pad}
        wrap={true}
      />
    ),
  ].filter((t) => t !== null);
  if (tiles.length === 0) return null;
  return <div style={{ display: "flex", gap: square ? 20 : 24, width: "100%" }}>{tiles}</div>;
}

/** N dots, the first lit in Atlas Blue (the Atlas Point), the rest hollow. */
function Dots({ n, width }: { n: number; width: number }): ReactNode {
  const { size, gap } = dotMetrics(n, width);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap, width }}>
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          style={
            i === 0
              ? {
                  width: size,
                  height: size,
                  borderRadius: size,
                  background: C.accent,
                  boxShadow: `0 0 ${Math.round(size * 0.6)}px ${C.accent}66`,
                }
              : {
                  width: size,
                  height: size,
                  borderRadius: size,
                  border: `2px solid ${C.control}`,
                  background: C.dot,
                }
          }
        />
      ))}
    </div>
  );
}

function Foot({
  lines,
  host,
  size,
  rule,
}: {
  lines: readonly string[];
  host: string;
  size: number;
  rule: boolean;
}): ReactNode {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 40,
        ...(rule ? { paddingTop: 28, borderTop: `1px solid ${C.line}` } : {}),
      }}
    >
      <div
        style={{
          display: "flex",
          flex: 1,
          minWidth: 0,
          flexDirection: "column",
          fontFamily: MONO,
          fontWeight: 500,
          fontSize: size,
          lineHeight: 1.6,
          letterSpacing: 0.5,
          color: C.muted,
        }}
      >
        {lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
      <div
        style={{
          flexShrink: 0,
          fontFamily: MONO,
          fontWeight: 500,
          fontSize: size + 2,
          letterSpacing: 0.5,
          color: C.accentText,
          whiteSpace: "nowrap",
        }}
      >
        {host}
      </div>
    </div>
  );
}

const STORY_PAD = 96;
const STORY_MEASURE = BABY_CARD_SIZES.story.width - STORY_PAD * 2;
const SQUARE_PAD = 72;
const SQUARE_MEASURE = BABY_CARD_SIZES.square.width - SQUARE_PAD * 2;

/** The card's frame. A component, not a fragment: `next/og` lays out a fragment's children as one row. */
function Frame({ pad, children }: { pad: number; children: ReactNode }): ReactNode {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: pad,
        background: C.ground,
        color: C.ink,
        fontFamily: UI,
      }}
    >
      {children}
    </div>
  );
}

/** The free story card. */
function StoryFace({ facts }: { facts: BabyFreeCardFacts }): ReactNode {
  return (
    <Frame pad={STORY_PAD}>
      <Head brand={facts.brand} eyebrow={facts.sectionEyebrow} mark={72} size={40} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Mono text={facts.eyebrow} size={28} />
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 500,
            fontSize: babyNameSize(facts.name, 230, STORY_MEASURE),
            lineHeight: 0.96,
            letterSpacing: -3,
            wordBreak: "break-word",
            color: C.ink,
          }}
        >
          {facts.name}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 500,
            fontSize: 200,
            lineHeight: 1,
            letterSpacing: -6,
            color: C.accentText,
          }}
        >
          {facts.count}
        </div>
        <div style={{ fontSize: 46, lineHeight: 1.25, color: C.soft }}>{facts.countLine}</div>
      </div>
      <Tiles facts={facts} square={false} />
      {facts.oneIn === null ? null : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {facts.oneIn.dots === null ? null : <Dots n={facts.oneIn.dots} width={STORY_MEASURE} />}
          <div style={{ fontSize: 40, lineHeight: 1.3, color: C.ink }}>{facts.oneIn.caption}</div>
        </div>
      )}
      {facts.register === null ? null : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            paddingTop: 36,
            borderTop: `1px solid ${C.line}`,
          }}
        >
          <div style={{ fontSize: 40, lineHeight: 1.3, color: C.ink }}>{facts.register.line}</div>
          {facts.register.rank === null ? null : (
            <div style={{ fontSize: 32, lineHeight: 1.3, color: C.soft }}>
              {facts.register.rank}
            </div>
          )}
        </div>
      )}
      <Foot lines={[facts.source, facts.privacy]} host={facts.host} size={26} rule={false} />
    </Frame>
  );
}

/** The free square card. */
function SquareFace({ facts }: { facts: BabyFreeCardFacts }): ReactNode {
  const dotsWidth = 340;
  const dots = facts.oneIn?.dots ?? null;
  const nameMeasure = dots === null ? SQUARE_MEASURE : SQUARE_MEASURE - dotsWidth - 40;
  return (
    <Frame pad={SQUARE_PAD}>
      <Head brand={facts.brand} eyebrow={facts.squareEyebrow} mark={60} size={36} />
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 40,
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 500,
            fontSize: babyNameSize(facts.name, 190, nameMeasure, 80),
            lineHeight: 0.96,
            letterSpacing: -3,
            wordBreak: "break-word",
            maxWidth: nameMeasure,
            color: C.ink,
          }}
        >
          {facts.name}
        </div>
        {dots === null ? null : (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              width: dotsWidth,
              paddingBottom: 14,
            }}
          >
            <Dots n={dots} width={dotsWidth} />
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 28 }}>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 500,
            fontSize: 150,
            lineHeight: 1,
            letterSpacing: -4,
            color: C.accentText,
          }}
        >
          {facts.count}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 40,
            lineHeight: 1.25,
            color: C.soft,
          }}
        >
          <div>{facts.squareCountLines[0]}</div>
          <div>{facts.squareCountLines[1]}</div>
        </div>
      </div>
      <Tiles facts={facts} square={true} />
      <Foot lines={[facts.sourceSquare, facts.privacy]} host={facts.host} size={24} rule={true} />
    </Frame>
  );
}

const CHART_HEIGHT = 312;
const BAR_WIDTH = 26;

/** The year chart: one bar a year, the peak amber, a cut-off year a tick, a year with no list a gap. */
function Chart({ facts }: { facts: BabyPaidCardFacts }): ReactNode {
  const plot = CHART_HEIGHT - 12;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        height: CHART_HEIGHT,
        borderBottom: `2px solid ${C.control}`,
      }}
    >
      {facts.bars.map((bar) => {
        if (bar.kind === "gap")
          return <div key={bar.year} style={{ width: BAR_WIDTH, height: 1 }} />;
        if (bar.kind === "cutoff") {
          return (
            <div
              key={bar.year}
              style={{ display: "flex", width: BAR_WIDTH, height: 12, alignItems: "flex-end" }}
            >
              <div
                style={{
                  width: BAR_WIDTH,
                  height: 4,
                  borderRadius: 2,
                  background: C.control,
                  marginBottom: -8,
                }}
              />
            </div>
          );
        }
        const height = Math.max(4, Math.round(bar.height * plot));
        const colour = bar.role === "peak" ? C.amber : bar.role === "year" ? C.context : C.soft;
        return (
          <div
            key={bar.year}
            style={{
              width: BAR_WIDTH,
              height,
              borderRadius: "4px 4px 0 0",
              background: colour,
              ...(bar.role === "peak" ? { boxShadow: `0 0 48px ${C.amber}59` } : {}),
            }}
          />
        );
      })}
    </div>
  );
}

function Callouts({ facts }: { facts: BabyPaidCardFacts }): ReactNode {
  const align = ["flex-start", "center", "flex-end"] as const;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
      {facts.callouts.map((c, i) => (
        <div
          key={c.line}
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            gap: 6,
            alignItems: align[i] ?? "flex-start",
          }}
        >
          <div
            style={{
              fontFamily: DISPLAY,
              fontWeight: 500,
              fontSize: 64,
              lineHeight: 1,
              color: c.peak ? C.amber : C.ink,
            }}
          >
            {c.figure}
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.3,
              color: C.soft,
              textAlign: i === 1 ? "center" : i === 2 ? "right" : "left",
            }}
          >
            {c.line}
          </div>
        </div>
      ))}
    </div>
  );
}

/** The rank ladder: 2000, 2005, …, the latest, which is lit. */
function Ladder({ facts }: { facts: BabyPaidCardFacts }): ReactNode {
  const rungs: ReactNode[] = [];
  facts.ladder.forEach((rung, i) => {
    if (i > 0)
      rungs.push(
        <div
          key={`line-${rung.year}`}
          style={{ flex: 1, height: 2, margin: "0 8px 48px 8px", background: C.line }}
        />,
      );
    rungs.push(
      <div
        key={rung.year}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}
      >
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 500,
            fontSize: rung.latest ? 72 : 56,
            lineHeight: 1,
            color: rung.latest ? C.accentText : C.soft,
          }}
        >
          {rung.rank ?? "—"}
        </div>
        {rung.latest ? (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              background: C.accent,
              boxShadow: `0 0 36px ${C.accent}66`,
              marginBottom: -4,
            }}
          />
        ) : (
          <div
            style={{ width: 20, height: 20, borderRadius: 10, border: `2px solid ${C.control}` }}
          />
        )}
        <Mono text={String(rung.year)} size={24} />
      </div>,
    );
  });
  const sentence = [facts.topYears, facts.register].filter((x) => x !== null).join(" ");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: "40px 44px",
        borderRadius: 12,
        background: C.tile,
        border: `1px solid ${C.line}`,
      }}
    >
      <div
        style={{ fontFamily: UI, fontWeight: 600, fontSize: 26, letterSpacing: 2, color: C.soft }}
      >
        {facts.ladderHeading}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        {rungs}
      </div>
      {sentence === "" ? null : (
        <div style={{ fontSize: 32, lineHeight: 1.4, color: C.ink }}>{sentence}</div>
      )}
    </div>
  );
}

/** The paid "rok po roku" story card. */
function PaidFace({ facts }: { facts: BabyPaidCardFacts }): ReactNode {
  const nameMeasure = facts.times === null ? STORY_MEASURE : STORY_MEASURE - 360;
  return (
    <Frame pad={STORY_PAD}>
      <Head brand={facts.brand} eyebrow={facts.eyebrow} mark={72} size={40} />
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 40,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Mono text={facts.nameEyebrow} size={28} />
          <div
            style={{
              fontFamily: DISPLAY,
              fontWeight: 500,
              fontSize: babyNameSize(facts.name, 200, nameMeasure),
              lineHeight: 0.96,
              letterSpacing: -3,
              wordBreak: "break-word",
              maxWidth: nameMeasure,
              color: C.ink,
            }}
          >
            {facts.name}
          </div>
        </div>
        {facts.times === null ? null : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
              paddingBottom: 12,
            }}
          >
            <div
              style={{
                fontFamily: DISPLAY,
                fontWeight: 500,
                fontSize: 120,
                lineHeight: 1,
                letterSpacing: -4,
                color: C.accentText,
              }}
            >
              {facts.times.figure}
            </div>
            <div style={{ fontSize: 30, lineHeight: 1.3, textAlign: "right", color: C.soft }}>
              {facts.times.wording}
            </div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Chart facts={facts} />
        <Callouts facts={facts} />
      </div>
      <Ladder facts={facts} />
      <Foot lines={[facts.source, facts.privacy]} host={facts.host} size={26} rule={false} />
    </Frame>
  );
}

/** Draws one card as a PNG with the headers given. */
export async function renderBabyCard(
  facts: BabyFreeCardFacts | BabyPaidCardFacts,
  card: BabyCardKey,
  headers: Record<string, string> = {},
): Promise<ImageResponse> {
  const brandFonts = await loadFonts();
  const fonts = brandFonts.length > 0 ? { fonts: brandFonts } : {};
  const face =
    facts.card === "paid" ? (
      <PaidFace facts={facts} />
    ) : card === "square" ? (
      <SquareFace facts={facts} />
    ) : (
      <StoryFace facts={facts} />
    );
  return new ImageResponse(face, {
    ...BABY_CARD_SIZES[facts.card === "paid" ? "paid" : card],
    headers,
    ...fonts,
  });
}
