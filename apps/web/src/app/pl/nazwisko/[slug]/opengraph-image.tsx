import { ImageResponse } from "next/og";
import { answerSlug } from "../../../../lib/surname-page.js";
import { ogFacts } from "../../../../lib/og-facts.js";

/**
 * The Open Graph image for a canonical surname page (TASK-024, directive §22–§23).
 *
 * Built from the **validated public projection** and nothing else: the surname,
 * the count per partition, `1 in X` only when rarity is READY, the product
 * name. No LLM, no research triggered by a crawler, no client-supplied value.
 * `ogFacts` is a pure function over the payload and is unit-tested, so what
 * the card may say is decided once, in one place.
 *
 * Deterministic for a given projection; Next serves the route with its own
 * cache headers, and the surname's facts change only when a new resource
 * version is ingested.
 *
 * Geist, which `next/og` bundles, covers every Polish letter (checked against
 * the font's cmap when this was built), so `ŁUCZAK` renders as itself.
 */

export const alt = "Name Atlas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const answer = await answerSlug(slug, null);
  const facts = ogFacts(answer.kind === "RESULT" ? answer.response : null, "pl");

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: "#fdfdfc",
        color: "#16181d",
        fontFamily: "Geist",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 28, color: "#4a4f5a", letterSpacing: 2 }}>{facts.eyebrow}</div>
        <div
          style={{
            fontSize: facts.surname.length > 14 ? 72 : 104,
            fontWeight: 700,
            lineHeight: 1.05,
            marginTop: 8,
            letterSpacing: -2,
          }}
        >
          {facts.surname}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {facts.lines.map((line) => (
          <div key={line} style={{ fontSize: 40 }}>
            {line}
          </div>
        ))}
        {facts.caveat === null ? null : (
          <div style={{ fontSize: 26, color: "#4a4f5a" }}>{facts.caveat}</div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "2px solid #1f4d7a",
          paddingTop: 20,
          fontSize: 30,
          color: "#1f4d7a",
        }}
      >
        <span>Name Atlas</span>
        <span style={{ color: "#4a4f5a", fontSize: 24 }}>{facts.footer}</span>
      </div>
    </div>,
    { ...size },
  );
}
