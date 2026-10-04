/**
 * Builds the blog's feature images, `apps/web/public/images/blog/<slug>.webp`
 * (TASK-075).
 *
 *   pnpm exec tsx apps/web/scripts/build-blog-images.ts
 *
 * Each image is drawn here as SVG from the dusk palette (ADR-0021: the values
 * are `globals.css`'s `--dusk-*` tokens), with no text, no face, no document
 * and no map. Nothing else goes into them: no photograph, no third-party
 * artwork, no generative model. Randomness comes from a seeded generator, so
 * a run produces the same pictures.
 *
 * Rasterising: the SVG is opened in headless Chromium in a window taller than
 * the image (its viewport is shorter than the window it is given), screenshotted
 * to PNG, cropped to 1600 × 840 and encoded to WebP (quality 82) with ImageMagick.
 * `CHROMIUM` overrides the browser path. The PNGs are temporary.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const W = 1600;
const H = 840;

/** `--dusk-*` values from `globals.css`. */
const C = {
  sunk: "#170a17",
  surface: "#1f071f",
  raised: "#32112a",
  wine: "#7d2833",
  ember: "#b15439",
  amber: "#fcbf5b",
  sun: "#fdf8ad",
  ink: "#fffaf3",
  inkSoft: "#f0d6db",
  inkMuted: "#d9b8c4",
  mapDim: "#7e3b25",
  map1: "#9a5230",
  map2: "#c77a3e",
} as const;

/** mulberry32: a small seeded generator, so every run draws the same image. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => n.toFixed(1);

/**
 * The sky, a low sun at the horizon, faint stars and the ground's curve; `front`
 * is drawn over the ground.
 */
function scene(seed: number, horizon: number, body: string, front = ""): string {
  const rnd = random(seed);
  const stars = Array.from({ length: 70 }, () => {
    const x = rnd() * W;
    const y = rnd() * horizon * 0.62;
    const r = 0.6 + rnd() * 1.4;
    return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${C.ink}" opacity="${f(0.15 + rnd() * 0.45)}"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.sunk}"/>
    <stop offset="0.38" stop-color="${C.raised}"/>
    <stop offset="0.72" stop-color="${C.wine}"/>
    <stop offset="0.9" stop-color="${C.ember}"/>
  </linearGradient>
  <radialGradient id="sun" cx="0.5" cy="1" r="0.5">
    <stop offset="0" stop-color="${C.sun}" stop-opacity="0.95"/>
    <stop offset="0.18" stop-color="${C.amber}" stop-opacity="0.55"/>
    <stop offset="1" stop-color="${C.amber}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.surface}"/>
    <stop offset="1" stop-color="${C.sunk}"/>
  </linearGradient>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="6" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
${stars}
<ellipse cx="${W / 2}" cy="${horizon}" rx="${W * 0.42}" ry="${H * 0.36}" fill="url(#sun)"/>
${body}
<path d="M0 ${horizon} Q ${W / 2} ${horizon - 46} ${W} ${horizon} L ${W} ${H} L 0 ${H} Z" fill="url(#ground)"/>
<path d="M0 ${horizon} Q ${W / 2} ${horizon - 46} ${W} ${horizon}" fill="none" stroke="${C.amber}" stroke-opacity="0.45" stroke-width="2"/>
${front}
</svg>`;
}

/** genealogia: a branching tree of thin amber lines, each tip a lit point. */
function genealogia(): string {
  const rnd = random(71);
  const horizon = 640;
  const lines: string[] = [];
  const tips: string[] = [];
  const grow = (x: number, y: number, angle: number, len: number, depth: number) => {
    const x2 = x + Math.cos(angle) * len;
    const y2 = y + Math.sin(angle) * len;
    const width = Math.max(1, depth * 1.6);
    lines.push(
      `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${C.amber}" stroke-width="${f(width)}" stroke-linecap="round" opacity="${f(0.35 + depth * 0.08)}"/>`,
    );
    if (depth === 0) {
      tips.push(
        `<circle cx="${f(x2)}" cy="${f(y2)}" r="${f(2.5 + rnd() * 2.5)}" fill="${C.sun}"/>`,
      );
      return;
    }
    const spread = 0.38 + rnd() * 0.22;
    grow(x2, y2, angle - spread, len * (0.7 + rnd() * 0.1), depth - 1);
    grow(x2, y2, angle + spread, len * (0.7 + rnd() * 0.1), depth - 1);
  };
  grow(W / 2, horizon - 20, -Math.PI / 2, 150, 7);
  return scene(71, horizon, `<g>${lines.join("")}</g><g filter="url(#glow)">${tips.join("")}</g>`);
}

/** koncowki-nazwisk: rows of word-like segments, each row's last one lit. */
function koncowki(): string {
  const rnd = random(72);
  const horizon = 680;
  const rows: string[] = [];
  const rowCount = 6;
  for (let r = 0; r < rowCount; r += 1) {
    const y = 150 + r * 76;
    const segments = 3 + Math.floor(rnd() * 4);
    const widths = Array.from({ length: segments }, () => 50 + rnd() * 120);
    const gap = 18;
    const total = widths.reduce((a, b) => a + b, 0) + gap * (segments - 1);
    let x = (W - total) / 2 + (rnd() - 0.5) * 160;
    widths.forEach((w, i) => {
      const last = i === segments - 1;
      rows.push(
        `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="30" rx="15" fill="${last ? C.amber : C.inkMuted}" opacity="${last ? "0.95" : f(0.16 + rnd() * 0.14)}"${last ? ' filter="url(#glow)"' : ""}/>`,
      );
      x += w + gap;
    });
  }
  return scene(72, horizon, `<g>${rows.join("")}</g>`);
}

/** jak-szukac-przodkow: a shelf of book spines and a lens lighting one of them. */
function jakSzukac(): string {
  const rnd = random(73);
  const horizon = 700;
  const shelf = horizon - 24;
  const tones = [C.raised, C.wine, C.mapDim, C.map1, C.surface];
  const spines: string[] = [];
  let x = 170;
  let lit: { x: number; w: number; h: number } | null = null;
  let i = 0;
  while (x < W - 170) {
    const w = 34 + rnd() * 40;
    const h = 180 + rnd() * 190;
    const tone = tones[Math.floor(rnd() * tones.length)]!;
    spines.push(
      `<rect x="${f(x)}" y="${f(shelf - h)}" width="${f(w)}" height="${f(h)}" rx="4" fill="${tone}" stroke="${C.ink}" stroke-opacity="0.12"/>`,
      `<rect x="${f(x + w * 0.2)}" y="${f(shelf - h + 22)}" width="${f(w * 0.6)}" height="5" rx="2" fill="${C.inkMuted}" opacity="0.25"/>`,
    );
    if (i === 11) lit = { x, w, h };
    x += w + 6;
    i += 1;
  }
  const target = lit ?? { x: W / 2, w: 50, h: 300 };
  const cx = target.x + target.w / 2;
  const cy = shelf - target.h * 0.55;
  const r = 92;
  const lens = `
<rect x="${f(target.x)}" y="${f(shelf - target.h)}" width="${f(target.w)}" height="${f(target.h)}" rx="4" fill="${C.map2}"/>
<circle cx="${f(cx)}" cy="${f(cy)}" r="${r}" fill="${C.sun}" fill-opacity="0.12" stroke="${C.amber}" stroke-width="10" filter="url(#glow)"/>
<line x1="${f(cx + r * 0.72)}" y1="${f(cy + r * 0.72)}" x2="${f(cx + r * 1.55)}" y2="${f(cy + r * 1.55)}" stroke="${C.amber}" stroke-width="22" stroke-linecap="round"/>`;
  return scene(
    73,
    horizon,
    `<rect x="140" y="${shelf}" width="${W - 280}" height="10" rx="3" fill="${C.raised}"/>${spines.join("")}${lens}`,
  );
}

/**
 * historia-genealogii: rows of points narrowing toward the sky, each point
 * joined to two in the row above, so the lines from the many below meet in
 * the few shared points at the top.
 */
function historia(): string {
  const rnd = random(74);
  const horizon = 690;
  const counts = [14, 11, 8, 6, 4, 2];
  const rows = counts.map((n, r) => {
    const y = horizon - 60 - r * 100;
    const span = 1180 - r * 150;
    return Array.from({ length: n }, (_, i) => ({
      x: (W - span) / 2 + (n === 1 ? span / 2 : (i * span) / (n - 1)) + (rnd() - 0.5) * 30,
      y: y + (rnd() - 0.5) * 16,
    }));
  });
  const lines: string[] = [];
  rows.slice(0, -1).forEach((row, r) => {
    const above = rows[r + 1]!;
    row.forEach((p, i) => {
      const near = Math.round((i / Math.max(1, row.length - 1)) * (above.length - 1));
      const other = Math.min(above.length - 1, Math.max(0, near + (rnd() < 0.5 ? -1 : 1)));
      for (const q of [above[near]!, above[other]!]) {
        lines.push(
          `<line x1="${f(p.x)}" y1="${f(p.y)}" x2="${f(q.x)}" y2="${f(q.y)}" stroke="${C.amber}" stroke-width="2" stroke-linecap="round" opacity="${f(0.3 + r * 0.08)}"/>`,
        );
      }
    });
  });
  const points = rows.flatMap((row, r) =>
    row.map(
      (p) =>
        `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(3 + r * 1.4)}" fill="${r === rows.length - 1 ? C.sun : C.amber}"/>`,
    ),
  );
  return scene(
    74,
    horizon,
    `<g>${lines.join("")}</g><g filter="url(#glow)">${points.join("")}</g>`,
  );
}

/**
 * imie-i-nazwisko-ciekawostki: thin threads drifting in from the left, each
 * on its own wave, that draw together and twist into one lit strand.
 */
function ciekawostki(): string {
  const rnd = random(75);
  const horizon = 700;
  const meetX = 1180;
  const meetY = 360;
  const threads = 9;
  const paths: string[] = [];
  for (let t = 0; t < threads; t += 1) {
    const y0 = 150 + (t * 430) / (threads - 1) + (rnd() - 0.5) * 30;
    const amp = 18 + rnd() * 26;
    const phase = rnd() * Math.PI * 2;
    const pts: string[] = [];
    for (let x = 0; x <= meetX; x += 20) {
      const k = x / meetX;
      const pull = k * k * (3 - 2 * k);
      const y = y0 + (meetY - y0) * pull + Math.sin(x / 70 + phase) * amp * (1 - pull);
      pts.push(`${f(x)},${f(y)}`);
    }
    paths.push(
      `<polyline points="${pts.join(" ")}" fill="none" stroke="${C.amber}" stroke-width="2" stroke-linecap="round" opacity="${f(0.3 + rnd() * 0.35)}"/>`,
    );
  }
  const strand: string[] = [];
  for (const offset of [0, Math.PI]) {
    const pts: string[] = [];
    for (let x = meetX; x <= W; x += 10) {
      pts.push(`${f(x)},${f(meetY + Math.sin((x - meetX) / 26 + offset) * 9)}`);
    }
    strand.push(
      `<polyline points="${pts.join(" ")}" fill="none" stroke="${C.sun}" stroke-width="4" stroke-linecap="round"/>`,
    );
  }
  return scene(
    75,
    horizon,
    `<g>${paths.join("")}</g><g filter="url(#glow)">${strand.join("")}<circle cx="${meetX}" cy="${meetY}" r="9" fill="${C.sun}"/></g>`,
  );
}

/**
 * jak-sprawdzic-pochodzenie-nazwiska: layers of ground under the horizon and a
 * thin line sounding down through them, lit where it meets each of seven layers.
 */
function jakSprawdzic(): string {
  const rnd = random(82);
  const horizon = 400;
  const layers: string[] = [];
  const pebbles: string[] = [];
  const marks: string[] = [];
  const tones = [C.raised, C.wine, C.mapDim, C.wine, C.raised, C.mapDim, C.wine];
  const depth = (H - horizon) / tones.length;
  const x = W * 0.5;
  tones.forEach((tone, i) => {
    const top = horizon + 18 + i * depth;
    const a = (rnd() - 0.5) * 50;
    const b = (rnd() - 0.5) * 50;
    layers.push(
      `<path d="M0 ${f(top + 26)} C ${f(W * 0.3)} ${f(top - 30 + a)} ${f(W * 0.7)} ${f(top - 30 + b)} ${W} ${f(top + 26)}" fill="none" stroke="${tone}" stroke-width="${f(depth * 0.5)}" stroke-opacity="${f(0.45 + rnd() * 0.3)}" stroke-linecap="round"/>`,
    );
    for (let k = 0; k < 9; k += 1) {
      pebbles.push(
        `<ellipse cx="${f(rnd() * W)}" cy="${f(top + rnd() * depth)}" rx="${f(4 + rnd() * 10)}" ry="${f(2 + rnd() * 4)}" fill="${C.inkMuted}" opacity="${f(0.06 + rnd() * 0.1)}"/>`,
      );
    }
    marks.push(
      `<circle cx="${f(x)}" cy="${f(top + depth * 0.1)}" r="${f(4 + (tones.length - i) * 0.9)}" fill="${C.sun}" opacity="${f(1 - i * 0.08)}"/>`,
    );
  });
  // `#sun` is centred on the bottom edge of its box, so the box ends at the horizon.
  const glow = `<rect x="${x - W * 0.36}" y="${horizon - H * 0.4}" width="${W * 0.72}" height="${H * 0.4}" fill="url(#sun)"/>`;
  const line = `<line x1="${f(x)}" y1="${horizon - 30}" x2="${f(x)}" y2="${H}" stroke="${C.amber}" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round" opacity="0.85"/>`;
  return scene(
    82,
    horizon,
    glow,
    `<g>${layers.join("")}${pebbles.join("")}</g>${line}<g filter="url(#glow)">${marks.join("")}</g>`,
  );
}

/**
 * co-mozna-wyczytac-z-nazwiska: a small lantern on the ground at dusk, its pool
 * of light showing the stones near it clearly while those beyond fade into the
 * dark.
 */
function coMozna(): string {
  const rnd = random(94);
  const horizon = 380;
  const cx = W * 0.5;
  const cy = 640;
  const rx = 470;
  const ry = 150;
  const stones: string[] = [];
  for (let k = 0; k < 140; k += 1) {
    const x = rnd() * W;
    const y = horizon + 30 + rnd() * (H - horizon - 30);
    const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
    const lit = Math.max(0, 1 - d);
    const size = 5 + rnd() * 12 * (0.6 + (y - horizon) / (H - horizon));
    stones.push(
      `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(size)}" ry="${f(size * 0.42)}" fill="${lit > 0 ? C.amber : C.inkMuted}" opacity="${f(lit > 0 ? 0.2 + lit * 0.6 : 0.04 + rnd() * 0.06)}"/>`,
    );
  }
  const pool = `<defs><radialGradient id="pool" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="${C.amber}" stop-opacity="0.42"/>
    <stop offset="0.45" stop-color="${C.ember}" stop-opacity="0.22"/>
    <stop offset="1" stop-color="${C.ember}" stop-opacity="0"/>
  </radialGradient></defs>
<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#pool)"/>`;
  const lantern = `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 64}" stroke="${C.mapDim}" stroke-width="4" stroke-linecap="round"/>
<g filter="url(#glow)"><rect x="${cx - 13}" y="${cy - 100}" width="26" height="36" rx="6" fill="${C.sun}" opacity="0.95"/></g>
<path d="M${cx - 17} ${cy - 100} L ${cx} ${cy - 116} L ${cx + 17} ${cy - 100} Z" fill="${C.mapDim}"/>`;
  return scene(94, horizon, "", `${pool}<g>${stones.join("")}</g>${lantern}`);
}

const IMAGES: Record<string, () => string> = {
  genealogia,
  "koncowki-nazwisk": koncowki,
  "jak-szukac-przodkow": jakSzukac,
  "historia-genealogii": historia,
  "imie-i-nazwisko-ciekawostki": ciekawostki,
  "jak-sprawdzic-pochodzenie-nazwiska": jakSprawdzic,
  "co-mozna-wyczytac-z-nazwiska": coMozna,
};

const out = resolve(process.argv[2] ?? join(import.meta.dirname, "..", "public", "images", "blog"));
const chromium = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const work = mkdtempSync(join(tmpdir(), "blog-images-"));
try {
  for (const [slug, draw] of Object.entries(IMAGES)) {
    const html = join(work, `${slug}.html`);
    const png = join(work, `${slug}.png`);
    writeFileSync(
      html,
      `<!doctype html><html><body style="margin:0;background:#000">${draw()}</body></html>`,
    );
    execFileSync(
      chromium,
      [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        `--window-size=${W},${H + 240}`,
        `--screenshot=${png}`,
        `file://${html}`,
      ],
      { stdio: "ignore" },
    );
    execFileSync("convert", [
      png,
      "-crop",
      `${W}x${H}+0+0`,
      "+repage",
      "-strip",
      "-quality",
      "82",
      join(out, `${slug}.webp`),
    ]);
    console.log(`${slug}.webp`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
