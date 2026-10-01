import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import type { ShareFacts, ShareVisual } from "./share-facts.js";
import { TOKENS, TYPE_FAMILIES } from "./design-tokens.js";
import { graphemeCount, loadFonts } from "./og-card.js";
import { VOIVODESHIP_VIEWBOX, VOIVODESHIPS } from "./voivodeship-geometry.js";

/**
 * A share card in story size (TASK-056): how it looks, never what it says.
 *
 * It draws only what `shareFacts` hands it, in the dusk look of the deck (the
 * old-print card on paper), with the brand fonts the page's share image uses.
 * `next/og` lays out with flexbox only, so every box with more than one child
 * says `display: flex`. If the fonts are missing the card still renders, in
 * the face `next/og` bundles.
 */

export const SHARE_SIZE = { width: 1080, height: 1920 } as const;
const PAD_X = 88;
const MEASURE = SHARE_SIZE.width - PAD_X * 2;

const DUSK = {
  ground: TOKENS["dusk-surface"],
  raised: TOKENS["dusk-surface-raised"],
  ink: TOKENS["dusk-ink"],
  soft: TOKENS["dusk-ink-soft"],
  muted: TOKENS["dusk-ink-muted"],
  light: TOKENS["dusk-amber"],
  onLight: TOKENS["dusk-on-amber"],
  warning: TOKENS["dusk-warning"],
  line: TOKENS["dusk-line"],
  tile: TOKENS["dusk-tile"],
  tileLine: TOKENS["dusk-tile-line"],
  track: TOKENS["dusk-track"],
  wash: TOKENS["dusk-amber-wash"],
  map: [
    TOKENS["dusk-map-0"],
    TOKENS["dusk-map-1"],
    TOKENS["dusk-map-2"],
    TOKENS["dusk-map-3"],
    TOKENS["dusk-map-4"],
  ],
  noData: TOKENS["dusk-map-no-data"],
} as const;

/** The old-print card's paper. */
const PAPER = {
  ground: TOKENS.paper,
  deep: TOKENS["paper-deep"],
  ink: TOKENS["paper-ink"],
  soft: TOKENS["paper-ink-soft"],
  muted: TOKENS["paper-ink-muted"],
  light: TOKENS["paper-accent"],
  line: TOKENS["paper-line"],
} as const;

/** The surname's size: as large as fits the card on one line, down to 72px, then it wraps. */
function nameSize(name: string): number {
  const n = Math.max(1, graphemeCount(name));
  return Math.max(72, Math.min(150, Math.floor(MEASURE / (n * 0.7))));
}

function figureSize(figure: string): number {
  const n = Math.max(1, graphemeCount(figure));
  return Math.max(96, Math.min(210, Math.floor(MEASURE / (n * 0.56))));
}

/**
 * A figure in the display face with its sign drawn in the interface face.
 *
 * The static Fraunces this app ships (`assets/fonts/`) draws "+" as a bar
 * with its vertical stroke displaced under the next digit, so "+0,9%" reads
 * as "−0,9%", the opposite change. Instrument Sans draws both signs
 * correctly, so the sign is set apart and the digits stay in the display face.
 */
export function Figure({
  text,
  size,
  color,
}: {
  text: string;
  size: number;
  color: string;
}): ReactNode {
  const sign = text.startsWith("+") || text.startsWith("\u2212") ? text.slice(0, 1) : null;
  const base = {
    fontFamily: TYPE_FAMILIES.display,
    fontSize: size,
    lineHeight: 1.08,
    color,
  } as const;
  if (sign === null) return <div style={base}>{text}</div>;
  return (
    <div style={{ ...base, display: "flex", alignItems: "baseline" }}>
      <div
        style={{
          fontFamily: TYPE_FAMILIES.ui,
          fontWeight: 600,
          fontSize: Math.round(size * 0.78),
          marginRight: Math.round(size * 0.06),
        }}
      >
        {sign}
      </div>
      <div>{text.slice(1)}</div>
    </div>
  );
}

function Visual({ visual, paper }: { visual: ShareVisual; paper: boolean }): ReactNode {
  const ink = paper ? PAPER.ink : DUSK.ink;
  const muted = paper ? PAPER.muted : DUSK.muted;
  switch (visual.kind) {
    case "scale": {
      const x = Math.round(visual.at * MEASURE);
      return (
        <div style={{ display: "flex", flexDirection: "column", width: MEASURE }}>
          <div style={{ display: "flex", position: "relative", height: 48, width: MEASURE }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 21,
                height: 6,
                borderRadius: 3,
                background: DUSK.track,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 21,
                width: x,
                height: 6,
                borderRadius: 3,
                background: DUSK.light,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: x - 22,
                top: 2,
                width: 44,
                height: 44,
                borderRadius: 999,
                background: DUSK.light,
                boxShadow: `0 0 40px ${DUSK.light}`,
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 18,
              fontFamily: TYPE_FAMILIES.data,
              fontSize: 26,
              color: muted,
            }}
          >
            {visual.ticks.map((tick) => (
              <div key={tick}>{tick}</div>
            ))}
          </div>
        </div>
      );
    }
    case "ladder":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, width: MEASURE }}>
          {visual.rows.map((row) => (
            <div
              key={`${row.rank}-${row.name}`}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "22px 30px",
                borderRadius: 26,
                background: row.self ? DUSK.wash : DUSK.tile,
                border: `2px solid ${row.self ? DUSK.light : DUSK.tileLine}`,
              }}
            >
              <div
                style={{
                  width: 190,
                  fontFamily: TYPE_FAMILIES.data,
                  fontSize: 30,
                  color: muted,
                }}
              >
                {row.rank}
              </div>
              <div
                style={{
                  flex: 1,
                  fontFamily: TYPE_FAMILIES.display,
                  fontSize: 52,
                  color: row.self ? DUSK.light : ink,
                }}
              >
                {row.name}
              </div>
              <div style={{ fontFamily: TYPE_FAMILIES.data, fontSize: 30, color: DUSK.soft }}>
                {row.count}
              </div>
            </div>
          ))}
        </div>
      );
    case "map":
      return (
        <div style={{ display: "flex", justifyContent: "center", width: MEASURE }}>
          <svg
            viewBox={VOIVODESHIP_VIEWBOX}
            width={MEASURE * 0.86}
            height={MEASURE * 0.86 * (531 / 560)}
          >
            {Object.entries(VOIVODESHIPS).map(([terc, shape]) => {
              const band = visual.bands[terc];
              return (
                <path
                  key={terc}
                  d={shape.d}
                  fill={band === undefined ? DUSK.noData : (DUSK.map[band] ?? DUSK.noData)}
                  stroke={DUSK.ground}
                  strokeWidth={1.4}
                />
              );
            })}
          </svg>
        </div>
      );
    case "line": {
      const W = MEASURE;
      const H = 420;
      const px = (x: number) => 24 + x * (W - 48);
      const py = (y: number) => 60 + (1 - y) * (H - 150);
      const pts = visual.points.map((p) => `${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(" ");
      const first = visual.points[0];
      const last = visual.points.at(-1);
      return (
        <div style={{ display: "flex", flexDirection: "column", width: W }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 40,
              fontWeight: 600,
            }}
          >
            <div>{visual.first.count}</div>
            <div>{visual.last.count}</div>
          </div>
          <svg viewBox={`0 0 ${String(W)} ${String(H)}`} width={W} height={H}>
            <polyline
              points={pts}
              fill="none"
              stroke={DUSK.light}
              strokeWidth={9}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {visual.points.map((p) => (
              <circle
                key={`${p.x}-${p.y}`}
                cx={px(p.x)}
                cy={py(p.y)}
                r={10}
                fill={DUSK.raised}
                stroke={DUSK.light}
                strokeWidth={6}
              />
            ))}
            {first === undefined || last === undefined ? null : (
              <circle cx={px(last.x)} cy={py(last.y)} r={16} fill={DUSK.light} />
            )}
          </svg>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: TYPE_FAMILIES.data,
              fontSize: 28,
              color: muted,
            }}
          >
            <div>{visual.first.year}</div>
            <div>{visual.last.year}</div>
          </div>
        </div>
      );
    }
    case "pair":
      return (
        <div style={{ display: "flex", gap: 36, width: MEASURE }}>
          {visual.items.map((item) => (
            <div key={item.label} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div
                style={{
                  fontFamily: TYPE_FAMILIES.data,
                  fontSize: 26,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: muted,
                }}
              >
                {item.label}
              </div>
              <div style={{ fontFamily: TYPE_FAMILIES.display, fontSize: 116, lineHeight: 1.05 }}>
                {item.value}
              </div>
              <div style={{ fontSize: 38, color: DUSK.soft }}>{item.sub}</div>
            </div>
          ))}
        </div>
      );
    case "quote":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 34, width: MEASURE }}>
          <div style={{ display: "flex" }}>
            <div
              style={{
                fontFamily: TYPE_FAMILIES.data,
                fontSize: 28,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: DUSK.light,
                border: `2px solid ${DUSK.light}`,
                borderRadius: 999,
                padding: "10px 26px",
              }}
            >
              {visual.tag}
            </div>
          </div>
          <div style={{ fontFamily: TYPE_FAMILIES.display, fontSize: 70, lineHeight: 1.22 }}>
            {visual.text}
          </div>
          <div style={{ fontSize: 32, color: muted }}>{visual.ref}</div>
        </div>
      );
    case "periods":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 30, width: MEASURE }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {visual.rows.map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontFamily: TYPE_FAMILIES.data,
                  fontSize: 28,
                  color: PAPER.ink,
                }}
              >
                <div style={{ width: 230 }}>{row.label}</div>
                <div style={{ display: "flex", flex: 1, height: 22, marginRight: 24 }}>
                  <div
                    style={{
                      width: `${Math.max(0.5, row.share * 100).toFixed(1)}%`,
                      height: 22,
                      background: PAPER.light,
                      borderRadius: "0 6px 6px 0",
                    }}
                  />
                </div>
                <div style={{ width: 170, textAlign: "right" }}>{row.count}</div>
              </div>
            ))}
          </div>
          {visual.quote === null ? null : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  fontFamily: TYPE_FAMILIES.display,
                  fontSize: 52,
                  lineHeight: 1.25,
                  color: PAPER.ink,
                  borderLeft: `6px solid ${PAPER.light}`,
                  paddingLeft: 30,
                }}
              >
                {visual.quote.text}
              </div>
              <div style={{ fontSize: 30, color: PAPER.muted }}>{visual.quote.ref}</div>
            </div>
          )}
        </div>
      );
    case "recap":
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 22, width: MEASURE }}>
          {visual.cells.map((cell) => (
            <div
              key={cell.k}
              style={{
                display: "flex",
                flexDirection: "column",
                width: (MEASURE - 22) / 2,
                padding: 32,
                borderRadius: 28,
                background: DUSK.tile,
              }}
            >
              <div
                style={{
                  fontFamily: TYPE_FAMILIES.data,
                  fontSize: 24,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: muted,
                }}
              >
                {cell.k}
              </div>
              <div style={{ fontFamily: TYPE_FAMILIES.display, fontSize: 62, lineHeight: 1.1 }}>
                {cell.v}
              </div>
            </div>
          ))}
        </div>
      );
  }
}

export async function renderShareCard(
  facts: ShareFacts,
  host: string | null,
  headers: Record<string, string> = {},
): Promise<ImageResponse> {
  const brandFonts = await loadFonts();
  const paper = facts.paper;
  const ink = paper ? PAPER.ink : DUSK.ink;
  const soft = paper ? PAPER.soft : DUSK.soft;
  const muted = paper ? PAPER.muted : DUSK.muted;
  const light = paper ? PAPER.light : DUSK.light;
  const line = paper ? PAPER.line : DUSK.line;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: `96px ${String(PAD_X)}px 80px`,
        color: ink,
        fontFamily: TYPE_FAMILIES.ui,
        backgroundColor: paper ? PAPER.ground : DUSK.ground,
        backgroundImage: paper
          ? `linear-gradient(170deg, ${PAPER.ground} 0%, ${PAPER.deep} 100%)`
          : `radial-gradient(90% 38% at 50% 104%, ${TOKENS["dusk-sky-ember"]} 0%, ${TOKENS["dusk-sky-wine"]} 34%, rgba(31,7,31,0) 80%), linear-gradient(180deg, ${TOKENS["dusk-surface-sunk"]} 0%, ${DUSK.ground} 55%, ${DUSK.raised} 100%)`,
      }}
    >
      {/* The wordmark and what the card answers. */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: TYPE_FAMILIES.data,
          fontSize: 28,
          letterSpacing: 5,
          textTransform: "uppercase",
        }}
      >
        <div style={{ color: light }}>Name Atlas</div>
        <div style={{ color: muted }}>{facts.eyebrow}</div>
      </div>

      <div
        style={{
          marginTop: 64,
          fontFamily: TYPE_FAMILIES.display,
          fontSize: nameSize(facts.surname),
          lineHeight: 0.98,
          letterSpacing: -2,
          maxWidth: MEASURE,
        }}
      >
        {facts.surname}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 30,
          flex: 1,
          paddingTop: 40,
        }}
      >
        {/* A coverage warning comes before any figure (TASK-012 §3). */}
        {facts.warning === null ? null : (
          <div style={{ fontSize: 36, lineHeight: 1.3, color: DUSK.warning }}>{facts.warning}</div>
        )}
        {facts.visual?.kind === "map" ? <Visual visual={facts.visual} paper={paper} /> : null}
        {facts.figure === null ? null : (
          <Figure
            text={facts.figure}
            size={figureSize(facts.figure)}
            color={paper ? PAPER.ink : DUSK.light}
          />
        )}
        {facts.figureNote === null ? null : (
          <div style={{ fontSize: 44, lineHeight: 1.25, color: soft }}>{facts.figureNote}</div>
        )}
        {facts.visual === null || facts.visual.kind === "map" ? null : (
          <Visual visual={facts.visual} paper={paper} />
        )}
      </div>

      <div style={{ marginTop: 40, fontSize: 44, lineHeight: 1.34, color: soft }}>
        {facts.explanation}
      </div>

      {/* Source and date, then the way back. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 44,
          paddingTop: 30,
          borderTop: `2px solid ${line}`,
        }}
      >
        <div
          style={{ fontFamily: TYPE_FAMILIES.data, fontSize: 26, lineHeight: 1.4, color: muted }}
        >
          {facts.source}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 28,
          }}
        >
          <div
            style={{
              fontSize: 34,
              fontWeight: 600,
              whiteSpace: "nowrap",
              flexShrink: 0,
              padding: "18px 34px",
              borderRadius: 999,
              background: paper ? PAPER.ink : DUSK.light,
              color: paper ? PAPER.ground : DUSK.onLight,
            }}
          >
            {facts.cta}
          </div>
          {host === null ? null : (
            <div
              style={{
                fontFamily: TYPE_FAMILIES.data,
                fontSize: 24,
                whiteSpace: "nowrap",
                marginLeft: 24,
                color: soft,
              }}
            >
              {host}
            </div>
          )}
        </div>
      </div>
    </div>,
    { ...SHARE_SIZE, headers, ...(brandFonts.length > 0 ? { fonts: brandFonts } : {}) },
  );
}
