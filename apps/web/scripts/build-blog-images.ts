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

/** The sky, a low sun at the horizon, faint stars and the ground's curve. */
function scene(seed: number, horizon: number, body: string): string {
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

const IMAGES: Record<string, () => string> = {
  genealogia,
  "koncowki-nazwisk": koncowki,
  "jak-szukac-przodkow": jakSzukac,
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
