import { ImageResponse } from "next/og";
import { TOKENS, TYPE_FAMILIES } from "./design-tokens.js";
import { loadFonts, OG_SIZE } from "./og-card.js";
import { VOIVODESHIP_VIEWBOX, VOIVODESHIPS } from "./voivodeship-geometry.js";

const C = {
  ground: TOKENS["dusk-surface"],
  raised: TOKENS["dusk-surface-raised"],
  sunk: TOKENS["dusk-surface-sunk"],
  amber: TOKENS["dusk-amber"],
  ink: TOKENS["dusk-ink"],
  muted: TOKENS["dusk-ink-muted"],
  line: TOKENS["dusk-line"],
  wine: TOKENS["dusk-sky-wine"],
} as const;

/** The atlas is atmosphere (ADR-0021 §2.5), never a population map. */
function Atlas() {
  return (
    <svg viewBox={VOIVODESHIP_VIEWBOX} width={280} height={265}>
      {Object.entries(VOIVODESHIPS).map(([code, shape]) => (
        <path key={code} d={shape.d} fill={C.raised} stroke={C.amber} strokeWidth={1.3} />
      ))}
      <path
        d="M120 165L260 105L358 185L265 285L393 350M265 285L165 350"
        fill="none"
        stroke={C.amber}
        strokeWidth={2}
        opacity={0.5}
      />
      {[
        [120, 165],
        [260, 105],
        [358, 185],
        [265, 285],
        [393, 350],
        [165, 350],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r={15} fill={C.amber} opacity={0.12} />
          <circle cx={x} cy={y} r={5} fill={C.amber} />
        </g>
      ))}
    </svg>
  );
}

/** A brand cover for the bare site link; no invented count, origin or family claim. */
export async function renderSitePreview(address: string): Promise<ImageResponse> {
  const fonts = await loadFonts();
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: C.ground,
        color: C.ink,
        fontFamily: TYPE_FAMILIES.ui,
        padding: "48px 64px",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          width: 740,
          height: 740,
          right: -220,
          top: -90,
          borderRadius: 999,
          background: `radial-gradient(circle, ${C.wine} 0%, ${C.ground} 70%)`,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 640,
          height: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 10, height: 10, borderRadius: 999, background: C.amber }} />
          <div style={{ fontSize: 31, fontWeight: 600, letterSpacing: -1 }}>Name Atlas</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: TYPE_FAMILIES.display,
              fontWeight: 500,
              fontSize: 72,
              lineHeight: 1.02,
              letterSpacing: -3,
            }}
          >
            <div>Każde nazwisko</div>
            <div>gdzieś się</div>
            <div style={{ color: C.amber }}>zaczęło.</div>
          </div>
          <div style={{ fontSize: 26, lineHeight: 1.4, color: C.muted, maxWidth: 550 }}>
            Sprawdź swoje. Odkryj liczby, miejsca i ślady w źródłach.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: C.amber,
              color: TOKENS["dusk-on-amber"],
              borderRadius: 999,
              padding: "13px 21px",
              fontSize: 21,
              fontWeight: 600,
            }}
          >
            Za darmo · bez konta
          </div>
          <div style={{ fontFamily: TYPE_FAMILIES.data, fontSize: 18, color: C.muted }}>
            {address}
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: 61,
          top: 62,
          width: 358,
          height: 490,
          border: `1px solid ${C.line}`,
          borderRadius: 28,
          background: C.raised,
          transform: "rotate(9deg)",
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: 72,
          top: 65,
          width: 358,
          height: 490,
          border: `1px solid ${C.line}`,
          borderRadius: 28,
          background: C.sunk,
          transform: "rotate(3deg)",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "absolute",
          right: 93,
          top: 70,
          width: 358,
          height: 490,
          padding: "28px 26px",
          border: `1px solid ${C.amber}`,
          borderRadius: 28,
          background: `linear-gradient(155deg, ${C.raised}, ${C.sunk})`,
          transform: "rotate(-5deg)",
          boxShadow: `0 20px 60px ${C.sunk}`,
        }}
      >
        <div style={{ fontFamily: TYPE_FAMILIES.data, fontSize: 15, color: C.amber }}>
          ATLAS TWOJEGO NAZWISKA
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: TYPE_FAMILIES.display,
            fontSize: 47,
            lineHeight: 1.04,
            marginTop: 20,
            letterSpacing: -1,
          }}
        >
          <div>Twoje</div>
          <div>nazwisko.</div>
        </div>
        <div style={{ display: "flex", marginLeft: 12, marginTop: -3 }}>
          <Atlas />
        </div>
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 27,
            left: 26,
            right: 26,
            borderTop: `1px solid ${C.line}`,
            paddingTop: 17,
            color: C.muted,
            fontSize: 19,
          }}
        >
          Liczby. Miejsca. Źródła.
        </div>
      </div>
    </div>,
    { ...OG_SIZE, ...(fonts.length > 0 ? { fonts } : {}) },
  );
}
