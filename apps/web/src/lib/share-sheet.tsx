import type { ReactElement, ReactNode } from "react";
import { ImageResponse } from "next/og";
import type { ShareFacts, ShareVisual, SheetFacts } from "./share-facts.js";
import { TOKENS, TYPE_FAMILIES } from "./design-tokens.js";
import { DUSK, Figure, PAPER } from "./share-card.js";
import { graphemeCount, loadFonts } from "./og-card.js";
import { VOIVODESHIP_VIEWBOX, VOIVODESHIPS } from "./voivodeship-geometry.js";

/**
 * The surname's one-page sheet (TASK-118): how it looks, never what it says.
 *
 * One A4 page in the dusk of the cards: the surname and its rarity across the
 * top, the map beside where it is most common, then a panel for each other
 * card, the old prints on their paper, and the way back at the foot. Every
 * panel keeps its card's explanation, source and date. A card the surname
 * does not have leaves its panel out and the rest close up. The sizes are set
 * so that a surname with every card at its longest (five neighbours, six
 * periods of old prints, a 220-character meaning) still fits the page.
 * `next/og` lays out with flexbox only, so every box with more than one child
 * says `display: flex`.
 */

/** A4 at 150 dpi, the units the sheet is laid out in. */
export const SHEET_SIZE = { width: 1240, height: 1754 } as const;
/**
 * Drawn at 4/3 of that, 200 dpi (TASK-121): sharp enough to print, with
 * 4/9 of the pixels of 300 dpi, so the PDF is quicker to make.
 */
export const SHEET_SCALE = 4 / 3;

const PAD_X = 72;
const MEASURE = SHEET_SIZE.width - PAD_X * 2;
const GAP = 18;
const PANEL_PAD_X = 22;

/** The surname as large as fits one line, down to 64px, then it wraps. */
function nameSize(name: string): number {
  const n = Math.max(1, graphemeCount(name));
  return Math.max(64, Math.min(132, Math.floor(MEASURE / (n * 0.68))));
}

function Eyebrow({ text, color }: { text: string; color: string }): ReactNode {
  return (
    <div
      style={{
        fontFamily: TYPE_FAMILIES.data,
        fontSize: 13.5,
        letterSpacing: 3,
        textTransform: "uppercase",
        color,
      }}
    >
      {text}
    </div>
  );
}

/** What the figure means and what it does not, then its source and date. */
function Foot({ facts }: { facts: ShareFacts }): ReactNode {
  const paper = facts.paper;
  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
      <div style={{ fontSize: 15, lineHeight: 1.36, color: paper ? PAPER.soft : DUSK.soft }}>
        {facts.explanation}
      </div>
      <div
        style={{
          marginTop: 9,
          paddingTop: 8,
          borderTop: `1.5px solid ${paper ? PAPER.line : DUSK.line}`,
          fontFamily: TYPE_FAMILIES.data,
          fontSize: 11.5,
          lineHeight: 1.4,
          color: paper ? PAPER.muted : DUSK.muted,
        }}
      >
        {facts.source}
      </div>
    </div>
  );
}

/** A stated caveat comes before any figure (TASK-012 §3). */
function Warning({ text }: { text: string | null }): ReactNode {
  if (text === null) return null;
  return (
    <div style={{ marginTop: 8, fontSize: 15, lineHeight: 1.34, color: DUSK.warning }}>{text}</div>
  );
}

function Panel({ facts, children }: { facts: ShareFacts; children: ReactNode }): ReactNode {
  const paper = facts.paper;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        padding: `20px ${String(PANEL_PAD_X)}px 16px`,
        borderRadius: 20,
        border: `1.5px solid ${paper ? PAPER.line : DUSK.tileLine}`,
        ...(paper
          ? { backgroundImage: `linear-gradient(165deg, ${PAPER.ground} 0%, ${PAPER.deep} 100%)` }
          : { backgroundColor: DUSK.tile }),
      }}
    >
      <Eyebrow text={facts.eyebrow} color={paper ? PAPER.light : DUSK.light} />
      <Warning text={facts.warning} />
      {/* `flexGrow`, not `flex: 1`: a zero basis would collapse the body in a column. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flexGrow: 1,
          marginTop: 10,
        }}
      >
        {children}
      </div>
      <Foot facts={facts} />
    </div>
  );
}

/** The card's figure and the line under it. */
function Lead({ facts, size }: { facts: ShareFacts; size: number }): ReactNode {
  const paper = facts.paper;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {facts.figure === null ? null : (
        <Figure text={facts.figure} size={size} color={paper ? PAPER.ink : DUSK.light} />
      )}
      {facts.figureNote === null ? null : (
        <div style={{ fontSize: 16, lineHeight: 1.3, color: paper ? PAPER.soft : DUSK.soft }}>
          {facts.figureNote}
        </div>
      )}
    </div>
  );
}

function PolandMap({
  bands,
  width,
}: {
  bands: Readonly<Record<string, number>>;
  width: number;
}): ReactNode {
  return (
    <svg viewBox={VOIVODESHIP_VIEWBOX} width={width} height={Math.round(width * (531 / 560))}>
      {Object.entries(VOIVODESHIPS).map(([terc, shape]) => {
        const band = bands[terc];
        return (
          <path
            key={terc}
            d={shape.d}
            fill={band === undefined ? DUSK.noData : (DUSK.map[band] ?? DUSK.noData)}
            stroke={DUSK.ground}
            strokeWidth={1.6}
          />
        );
      })}
    </svg>
  );
}

function Scale({
  visual,
  width,
}: {
  visual: Extract<ShareVisual, { kind: "scale" }>;
  width: number;
}): ReactNode {
  const x = Math.round(visual.at * width);
  return (
    <div style={{ display: "flex", flexDirection: "column", width }}>
      <div style={{ display: "flex", position: "relative", height: 28, width }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 12,
            height: 4,
            borderRadius: 2,
            background: DUSK.track,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 12,
            width: x,
            height: 4,
            borderRadius: 2,
            background: DUSK.light,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: x - 14,
            top: 0,
            width: 28,
            height: 28,
            borderRadius: 999,
            background: DUSK.light,
            boxShadow: `0 0 28px ${DUSK.light}`,
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
          fontFamily: TYPE_FAMILIES.data,
          fontSize: 12.5,
          color: DUSK.muted,
        }}
      >
        {visual.ticks.map((tick) => (
          <div key={tick}>{tick}</div>
        ))}
      </div>
    </div>
  );
}

/** A neighbour's name, smaller the longer it is, so it stays on its row. */
function ladderNameSize(name: string): number {
  return Math.max(11, Math.min(19, Math.floor(168 / (Math.max(1, graphemeCount(name)) * 0.74))));
}

function Ladder({ visual }: { visual: Extract<ShareVisual, { kind: "ladder" }> }): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {visual.rows.map((row) => (
        <div
          key={`${row.rank}-${row.name}`}
          style={{
            display: "flex",
            alignItems: "center",
            height: 34,
            padding: "0 12px",
            borderRadius: 11,
            background: row.self ? DUSK.wash : "rgba(0,0,0,0)",
            border: `1.5px solid ${row.self ? DUSK.light : DUSK.tileLine}`,
          }}
        >
          <div
            style={{ width: 54, fontFamily: TYPE_FAMILIES.data, fontSize: 12.5, color: DUSK.muted }}
          >
            {row.rank}
          </div>
          <div
            style={{
              flex: 1,
              fontFamily: TYPE_FAMILIES.display,
              fontSize: ladderNameSize(row.name),
              color: row.self ? DUSK.light : DUSK.ink,
            }}
          >
            {row.name}
          </div>
          <div style={{ fontFamily: TYPE_FAMILIES.data, fontSize: 12.5, color: DUSK.soft }}>
            {row.count}
          </div>
        </div>
      ))}
    </div>
  );
}

function Line({
  visual,
  width,
}: {
  visual: Extract<ShareVisual, { kind: "line" }>;
  width: number;
}): ReactNode {
  const H = 96;
  const px = (x: number) => 10 + x * (width - 20);
  const py = (y: number) => 12 + (1 - y) * (H - 24);
  const pts = visual.points.map((p) => `${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(" ");
  const first = visual.points[0];
  const last = visual.points.at(-1);
  const area =
    first === undefined || last === undefined
      ? null
      : `${px(first.x).toFixed(1)},${String(H)} ${pts} ${px(last.x).toFixed(1)},${String(H)}`;
  const label = {
    display: "flex",
    justifyContent: "space-between",
    fontFamily: TYPE_FAMILIES.data,
    fontSize: 12.5,
  } as const;
  return (
    <div style={{ display: "flex", flexDirection: "column", width, marginTop: 10 }}>
      <div style={{ ...label, color: DUSK.soft }}>
        <div>{visual.first.count}</div>
        <div>{visual.last.count}</div>
      </div>
      <svg viewBox={`0 0 ${String(width)} ${String(H)}`} width={width} height={H}>
        {area === null ? null : <polygon points={area} fill={DUSK.wash} />}
        <polyline
          points={pts}
          fill="none"
          stroke={DUSK.light}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {visual.points.map((p) => (
          <circle
            key={`${p.x}-${p.y}`}
            cx={px(p.x)}
            cy={py(p.y)}
            r={5}
            fill={DUSK.raised}
            stroke={DUSK.light}
            strokeWidth={3}
          />
        ))}
        {last === undefined ? null : (
          <circle cx={px(last.x)} cy={py(last.y)} r={8} fill={DUSK.light} />
        )}
      </svg>
      <div style={{ ...label, color: DUSK.muted }}>
        <div>{visual.first.year}</div>
        <div>{visual.last.year}</div>
      </div>
    </div>
  );
}

function Pair({ visual }: { visual: Extract<ShareVisual, { kind: "pair" }> }): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {visual.items.map((item) => (
        <div key={item.label} style={{ display: "flex", flexDirection: "column" }}>
          <Eyebrow text={item.label} color={DUSK.muted} />
          <div style={{ fontFamily: TYPE_FAMILIES.display, fontSize: 42, lineHeight: 1.1 }}>
            {item.value}
          </div>
          <div style={{ fontSize: 14.5, color: DUSK.soft }}>{item.sub}</div>
        </div>
      ))}
    </div>
  );
}

function Quote({ visual }: { visual: Extract<ShareVisual, { kind: "quote" }> }): ReactNode {
  const n = [...visual.text].length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex" }}>
        <div
          style={{
            fontFamily: TYPE_FAMILIES.data,
            fontSize: 11.5,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: DUSK.light,
            border: `1.5px solid ${DUSK.light}`,
            borderRadius: 999,
            padding: "3px 11px",
          }}
        >
          {visual.tag}
        </div>
      </div>
      <div
        style={{
          fontFamily: TYPE_FAMILIES.display,
          fontSize: n > 150 ? 19 : n > 80 ? 23 : 28,
          lineHeight: 1.26,
          borderLeft: `4px solid ${DUSK.light}`,
          paddingLeft: 16,
        }}
      >
        {visual.text}
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.3, color: DUSK.muted }}>{visual.ref}</div>
    </div>
  );
}

/** The old prints: the figure beside its periods, then a quoted page. */
function Prints({ facts }: { facts: ShareFacts }): ReactNode {
  const visual = facts.visual?.kind === "periods" ? facts.visual : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ display: "flex", width: 170 }}>
          <Lead facts={facts} size={46} />
        </div>
        {visual === null ? null : (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 5 }}>
            {visual.rows.map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontFamily: TYPE_FAMILIES.data,
                  fontSize: 12,
                  color: PAPER.ink,
                }}
              >
                <div style={{ width: 84 }}>{row.label}</div>
                <div style={{ display: "flex", flex: 1, height: 11, marginRight: 10 }}>
                  <div
                    style={{
                      width: `${Math.max(0.5, row.share * 100).toFixed(1)}%`,
                      height: 11,
                      background: PAPER.light,
                      borderRadius: "0 4px 4px 0",
                    }}
                  />
                </div>
                <div style={{ width: 62, textAlign: "right" }}>{row.count}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {visual?.quote == null ? null : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div
            style={{
              fontFamily: TYPE_FAMILIES.display,
              fontSize: 19,
              lineHeight: 1.26,
              color: PAPER.ink,
              borderLeft: `4px solid ${PAPER.light}`,
              paddingLeft: 14,
            }}
          >
            {visual.quote.text}
          </div>
          <div style={{ fontSize: 12.5, color: PAPER.muted }}>{visual.quote.ref}</div>
        </div>
      )}
    </div>
  );
}

/** A panel's body: its figure and its visual, as its card has them. */
function Body({ facts, width }: { facts: ShareFacts; width: number }): ReactNode {
  const visual = facts.visual;
  switch (visual?.kind) {
    case "ladder":
      // The surname's own place is lit on the ladder; the list it is on leads.
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {facts.figureNote === null ? null : (
            <div style={{ fontSize: 16, color: DUSK.soft }}>{facts.figureNote}</div>
          )}
          <Ladder visual={visual} />
        </div>
      );
    case "periods":
      return <Prints facts={facts} />;
    case "line":
      return (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Lead facts={facts} size={48} />
          <Line visual={visual} width={width} />
        </div>
      );
    case "pair":
      return <Pair visual={visual} />;
    case "quote":
      return <Quote visual={visual} />;
    default:
      return <Lead facts={facts} size={48} />;
  }
}

/** The surname, its rarity on the scale and its counts. */
function Hero({ sheet }: { sheet: SheetFacts }): ReactNode {
  const rarity = sheet.cards.rarity;
  const scale = rarity?.visual?.kind === "scale" ? rarity.visual : null;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          marginTop: 24,
          fontFamily: TYPE_FAMILIES.display,
          fontSize: nameSize(sheet.surname),
          lineHeight: 0.98,
          letterSpacing: -3,
          maxWidth: MEASURE,
        }}
      >
        {sheet.surname}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: GAP, marginTop: 18 }}>
        {rarity === undefined ? null : (
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <Eyebrow text={rarity.eyebrow} color={DUSK.light} />
            {rarity.figure === null ? null : (
              <Figure text={rarity.figure} size={88} color={DUSK.light} />
            )}
            {rarity.figureNote === null ? null : (
              <div style={{ fontSize: 19, lineHeight: 1.3, color: DUSK.soft }}>
                {rarity.figureNote}
              </div>
            )}
          </div>
        )}
        {sheet.counts.map((c) => (
          <div
            key={c.list}
            style={{
              display: "flex",
              flexDirection: "column",
              width: 240,
              padding: "12px 20px",
              borderRadius: 20,
              background: DUSK.tile,
              border: `1.5px solid ${DUSK.tileLine}`,
            }}
          >
            <Eyebrow text={c.list} color={DUSK.muted} />
            <div style={{ fontFamily: TYPE_FAMILIES.display, fontSize: 44, lineHeight: 1.12 }}>
              {c.value}
            </div>
            <div style={{ fontSize: 14.5, color: DUSK.soft }}>{sheet.countUnit}</div>
          </div>
        ))}
      </div>
      {rarity === undefined ? null : (
        <div style={{ display: "flex", flexDirection: "column", marginTop: 20 }}>
          {scale === null ? null : <Scale visual={scale} width={MEASURE} />}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: GAP,
              marginTop: 10,
            }}
          >
            <div style={{ fontSize: 15, lineHeight: 1.36, color: DUSK.soft }}>
              {rarity.explanation}
            </div>
            <div
              style={{
                flexShrink: 0,
                fontFamily: TYPE_FAMILIES.data,
                fontSize: 11.5,
                color: DUSK.muted,
              }}
            >
              {rarity.source}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Where the surname is most common: the map large, its caveat and figure beside it. */
function Where({ facts }: { facts: ShareFacts }): ReactNode {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 30,
        marginTop: 22,
        padding: `16px ${String(PANEL_PAD_X)}px`,
        borderRadius: 20,
        background: DUSK.tile,
        border: `1.5px solid ${DUSK.tileLine}`,
      }}
    >
      {facts.visual?.kind === "map" ? <PolandMap bands={facts.visual.bands} width={284} /> : null}
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <Eyebrow text={facts.eyebrow} color={DUSK.light} />
        <Warning text={facts.warning} />
        <div style={{ display: "flex", marginTop: 8 }}>
          <Lead facts={facts} size={68} />
        </div>
        <Foot facts={facts} />
      </div>
    </div>
  );
}

/** A row of panels that share its width, or nothing when none is ready. */
function Row({
  cards,
  sheet,
}: {
  cards: readonly (keyof SheetFacts["cards"])[];
  sheet: SheetFacts;
}): ReactNode {
  const present = cards.flatMap((key) => {
    const facts = sheet.cards[key];
    return facts === undefined ? [] : [facts];
  });
  if (present.length === 0) return null;
  const inner = Math.floor(
    (MEASURE - GAP * (present.length - 1)) / present.length - PANEL_PAD_X * 2 - 3,
  );
  return (
    <div style={{ display: "flex", gap: GAP, marginTop: GAP }}>
      {present.map((facts) => (
        <Panel key={facts.card} facts={facts}>
          <Body facts={facts} width={inner} />
        </Panel>
      ))}
    </div>
  );
}

function sheetFace(sheet: SheetFacts, host: string | null): ReactElement {
  const { where, neighbours, change, other, meaning, print } = sheet.cards;
  // A surname with only its count and rarity sits in the middle of the page, not at its head.
  const sparse = [where, neighbours, change, other, meaning, print].every((x) => x === undefined);
  return (
    <div
      style={{
        width: SHEET_SIZE.width,
        height: SHEET_SIZE.height,
        display: "flex",
        flexDirection: "column",
        padding: `46px ${String(PAD_X)}px 42px`,
        color: DUSK.ink,
        fontFamily: TYPE_FAMILIES.ui,
        backgroundColor: DUSK.ground,
        backgroundImage: `radial-gradient(70% 22% at 88% 0%, ${TOKENS["dusk-sky-ember"]} 0%, ${TOKENS["dusk-sky-wine"]} 38%, rgba(31,7,31,0) 100%), radial-gradient(80% 24% at 10% 100%, ${TOKENS["dusk-sky-wine"]} 0%, rgba(31,7,31,0) 100%), linear-gradient(180deg, ${TOKENS["dusk-surface-sunk"]} 0%, ${DUSK.ground} 45%, ${DUSK.raised} 100%)`,
      }}
    >
      {/* The wordmark and what the page is. */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          paddingBottom: 14,
          borderBottom: `1.5px solid ${DUSK.line}`,
          fontFamily: TYPE_FAMILIES.data,
          fontSize: 14,
          letterSpacing: 5,
          textTransform: "uppercase",
        }}
      >
        <div style={{ color: DUSK.light }}>Name Atlas</div>
        <div style={{ color: DUSK.muted }}>{sheet.eyebrow}</div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          justifyContent: sparse ? "center" : "flex-start",
          paddingBottom: 18,
        }}
      >
        <Hero sheet={sheet} />
        {where === undefined ? null : <Where facts={where} />}
        <Row cards={["neighbours", "change", "other"]} sheet={sheet} />
        <Row cards={["meaning", "print"]} sheet={sheet} />
      </div>

      {/* Every figure has its source; then the way back. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: GAP,
          paddingTop: 14,
          borderTop: `1.5px solid ${DUSK.line}`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: 15, color: DUSK.soft }}>{sheet.note}</div>
          <div style={{ fontFamily: TYPE_FAMILIES.data, fontSize: 11.5, color: DUSK.muted }}>
            {[...sheet.sources, ...(host === null ? [] : [host])].join(" · ")}
          </div>
        </div>
        <div
          style={{
            flexShrink: 0,
            fontSize: 18,
            fontWeight: 600,
            padding: "11px 24px",
            borderRadius: 999,
            background: DUSK.light,
            color: DUSK.onLight,
          }}
        >
          {sheet.cta}
        </div>
      </div>
    </div>
  );
}

/** Draws the sheet as one PNG, A4 at 200 dpi (1653 × 2339 px). */
export async function renderSurnameSheet(
  sheet: SheetFacts,
  host: string | null,
): Promise<ImageResponse> {
  const brandFonts = await loadFonts();
  const fonts = brandFonts.length > 0 ? { fonts: brandFonts } : {};
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "flex",
          transform: `scale(${String(SHEET_SCALE)})`,
          transformOrigin: "top left",
        }}
      >
        {sheetFace(sheet, host)}
      </div>
    </div>,
    {
      width: Math.round(SHEET_SIZE.width * SHEET_SCALE),
      height: Math.round(SHEET_SIZE.height * SHEET_SCALE),
      ...fonts,
    },
  );
}
