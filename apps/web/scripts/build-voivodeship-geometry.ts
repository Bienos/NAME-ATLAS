/**
 * Builds `src/lib/voivodeship-geometry.ts` — the 16 voivodeship outlines the
 * regional map draws, as SVG paths keyed by TERYT TERC code.
 *
 *   pnpm exec tsx apps/web/scripts/build-voivodeship-geometry.ts <ne_10m_admin_1_states_provinces.geojson>
 *
 * Input: Natural Earth 1:10m admin-1, pinned to release v5.1.2
 * (https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson).
 * Natural Earth is public domain ("Everything here is public domain", LICENSE.md
 * at that tag), so the derived outlines may be committed and served. The 40 MB
 * source file itself is not committed; its SHA-256 is written into the output.
 *
 * The join to TERC is **exact string equality** on the name, the same method
 * `fixtures/teryt/voivodeship-terc-correspondence.json` uses: Natural Earth's
 * `name_pl` ("województwo śląskie") without its "województwo " prefix,
 * upper-cased, must equal the TERC name ("ŚLĄSKIE"). Anything other than 16
 * unique matches aborts — a map with a missing or doubled region is worse than
 * no map.
 *
 * Projection: equirectangular with the x axis scaled by cos of the mid
 * latitude. Poland spans six degrees of latitude, over which the distortion is
 * a few percent — invisible at this size, and it keeps the script free of a
 * projection library. Each ring is simplified (Ramer–Douglas–Peucker, tolerance
 * 0.8 view-box units — about half a pixel at a 340px phone-width map) and
 * rounded to 0.1 of a unit: 40 KB → 28 KB of markup on every surname page. Borders between neighbours are simplified independently, so they can
 * differ by up to the tolerance; the 1.5px surface-coloured stroke between
 * regions covers that.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Ring = readonly (readonly [number, number])[];
interface Feature {
  readonly properties: Record<string, unknown>;
  readonly geometry:
    | { readonly type: "Polygon"; readonly coordinates: readonly Ring[] }
    | { readonly type: "MultiPolygon"; readonly coordinates: readonly (readonly Ring[])[] };
}

const WIDTH = 560;
const PAD = 6;
const TOLERANCE = 0.8;

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const input = process.argv[2];
if (!input) {
  console.error("usage: build-voivodeship-geometry.ts <ne_10m_admin_1_states_provinces.geojson>");
  process.exit(1);
}

const bytes = readFileSync(input);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const collection = JSON.parse(bytes.toString("utf8")) as { features: Feature[] };
const poland = collection.features.filter((f) => f.properties["adm0_a3"] === "POL");

const correspondence = JSON.parse(
  readFileSync(path.join(repoRoot, "fixtures/teryt/voivodeship-terc-correspondence.json"), "utf8"),
) as { correspondence: { terc_code: string; terc_name: string }[] };
const tercByName = new Map(correspondence.correspondence.map((c) => [c.terc_name, c.terc_code]));

const joined = poland.map((feature) => {
  const namePl = String(feature.properties["name_pl"] ?? "");
  const name = namePl.replace(/^województwo /u, "").toUpperCase();
  const terc = tercByName.get(name);
  if (terc === undefined) throw new Error(`no TERC code for Natural Earth region "${namePl}"`);
  return { terc, name, feature };
});
if (joined.length !== 16 || new Set(joined.map((j) => j.terc)).size !== 16) {
  throw new Error(`expected 16 unique voivodeships, got ${joined.length}`);
}

function polygons(feature: Feature): readonly (readonly Ring[])[] {
  return feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;
}

let minLon = Infinity;
let maxLon = -Infinity;
let minLat = Infinity;
let maxLat = -Infinity;
for (const { feature } of joined) {
  for (const polygon of polygons(feature)) {
    for (const [lon, lat] of polygon[0] ?? []) {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
  }
}
const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
const scale = (WIDTH - 2 * PAD) / ((maxLon - minLon) * kx);
const height = Math.ceil((maxLat - minLat) * scale + 2 * PAD);

const round = (n: number) => Math.round(n * 10) / 10;
type Point = readonly [number, number];
function project([lon, lat]: readonly [number, number]): Point {
  return [PAD + (lon - minLon) * kx * scale, PAD + (maxLat - lat) * scale];
}
function distanceToSegment([px, py]: Point, [ax, ay]: Point, [bx, by]: Point): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function simplify(points: readonly Point[]): Point[] {
  if (points.length <= 4) return [...points];
  const first = points[0] as Point;
  const last = points[points.length - 1] as Point;
  let index = -1;
  let worst = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = distanceToSegment(points[i] as Point, first, last);
    if (d > worst) {
      worst = d;
      index = i;
    }
  }
  if (worst <= TOLERANCE) return [first, last];
  return [...simplify(points.slice(0, index + 1)).slice(0, -1), ...simplify(points.slice(index))];
}
function toPath(feature: Feature): string {
  const parts: string[] = [];
  for (const polygon of polygons(feature)) {
    for (const ring of polygon) {
      const projected = ring.map(project);
      // A closed ring's first and last points coincide; split it in two so the
      // simplification has distinct end points to measure against.
      const half = Math.floor(projected.length / 2);
      const kept = [
        ...simplify(projected.slice(0, half + 1)).slice(0, -1),
        ...simplify(projected.slice(half)),
      ];
      const points = kept
        .map(([x, y]) => `${round(x)},${round(y)}`)
        .filter((p, i, all) => i === 0 || p !== all[i - 1]);
      if (points.length >= 3) parts.push(`M${points.join("L")}Z`);
    }
  }
  return parts.join("");
}

const rows = joined
  .sort((a, b) => a.terc.localeCompare(b.terc))
  .map(({ terc, name, feature }) => `  "${terc}": { name: "${name}", d: "${toPath(feature)}" },`);

const out = `// GENERATED by apps/web/scripts/build-voivodeship-geometry.ts — do not edit by hand.
//
// Source: Natural Earth 1:10m admin-1 states and provinces, release v5.1.2,
// public domain (https://www.naturalearthdata.com/about/terms-of-use/).
// Source file SHA-256: ${sha256}
// Joined to TERYT TERC by exact name, per fixtures/teryt/voivodeship-terc-correspondence.json.

export const VOIVODESHIP_VIEWBOX = "0 0 ${WIDTH} ${height}";

/** Outline of each voivodeship keyed by TERC code, with the TERC name. */
export const VOIVODESHIPS: Readonly<Record<string, { readonly name: string; readonly d: string }>> = {
${rows.join("\n")}
};
`;
const target = path.join(repoRoot, "apps/web/src/lib/voivodeship-geometry.ts");
writeFileSync(target, out);
console.log(`wrote ${target}: 16 voivodeships, view box ${WIDTH}×${height}, ${out.length} bytes`);
