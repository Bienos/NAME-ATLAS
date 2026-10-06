/**
 * The Visual System v1 tokens, declared once for the web app (TASK-034).
 *
 * `globals.css` declares the same custom properties in its `:root` block,
 * because CSS cannot import this file. `design-tokens.test.ts` fails when the
 * two differ by one name or one value. The notes on each value (contrast
 * ratios, why the map ramp starts where it does) stay beside it in the CSS.
 *
 * The web app's TypeScript takes these values from here, never as a hex
 * literal. That matters for code that cannot read CSS: the share card
 * (`next/og` renders with no stylesheet), the Name Print mark's fallback, and
 * the number of map bands.
 */
export const TOKENS = {
  // Surfaces and text
  "surface-primary": "#f3f0e8",
  "surface-elevated": "#f8f7f2",
  "surface-inverse": "#101413",
  "text-primary": "#101413",
  "text-secondary": "#4f534f",
  "text-tertiary": "#6e716c",
  "text-inverse": "#f3f0e8",

  // Rules
  "border-soft": "#d6d2c8",
  "border-default": "#b5b2a9",
  "border-strong": "#6e716c",

  // Action
  accent: "#1e4fd7",
  "on-accent": "#ffffff",
  "hover-light": "#e8e5dc",
  "hover-blue": "#163da9",
  "focus-ring": "var(--accent)",

  // States
  "state-positive": "#236a58",
  "state-warning": "#8a6515",
  "state-error": "#b54436",

  // Confidence
  "confidence-verified": "#236a58",
  "confidence-likely": "var(--accent)",
  "confidence-possible": "#8a6515",
  "confidence-unconfirmed": "#6e716c",

  // Map ramp, lowest share first
  "map-0": "#82a5f2",
  "map-1": "#6890ec",
  "map-2": "#4d78e5",
  "map-3": "#1e4fd7",
  "map-4": "#1438a0",
  "map-no-data": "#e8e5dc",

  // Dusk (ADR-0021): the landing hero and the surname journey. Text tokens read
  // on dusk-surface at 18:1 (ink), 13.9:1 (ink-soft), 10.5:1 (ink-muted); the
  // amber at 11.5:1; the warning at 9.5:1. The map ramp runs dim to lit, lowest
  // share darkest, lightness rising at every step. Checked by hand against the
  // dusk ground; the dataviz validator models light surfaces only.
  "dusk-surface": "#1f071f",
  "dusk-surface-raised": "#32112a",
  "dusk-surface-sunk": "#170a17",
  "dusk-sky-wine": "#7d2833",
  "dusk-sky-ember": "#b15439",
  "dusk-amber": "#fcbf5b",
  "dusk-amber-hover": "#ffd98a",
  "dusk-glow": "#fcbf5b59",
  "dusk-sun": "#fdf8ad",
  "dusk-ink": "#fffaf3",
  "dusk-ink-soft": "#f0d6db",
  "dusk-ink-muted": "#d9b8c4",
  "dusk-on-amber": "#230312",
  "dusk-shell": "#f7e4da",
  "dusk-warning": "#f2a86a",
  "dusk-glass": "#fffaf31a",
  "dusk-line": "#fffaf32e",
  "dusk-line-control": "#9e6e80",
  "dusk-map-glow": "#fff7d1",
  "dusk-map-dim": "#7e3b25",
  "dusk-map-0": "#6e3524",
  "dusk-map-1": "#9a5230",
  "dusk-map-2": "#c77a3e",
  "dusk-map-3": "#e9a24f",
  "dusk-map-4": "#fcd27a",
  "dusk-map-no-data": "#2a1424",
  // The share cards (TASK-056): tiles and track on the dusk, and the old-print card's paper.
  "dusk-tile": "#fffaf314",
  "dusk-tile-line": "#fffaf326",
  "dusk-track": "#fffaf340",
  "dusk-amber-wash": "#fcbf5b26",
  paper: "#f6ead4",
  "paper-deep": "#e6cfa8",
  "paper-ink": "#2a1610",
  "paper-ink-soft": "#4a3226",
  "paper-ink-muted": "#6d5544",
  "paper-accent": "#9a4f17",
  "paper-line": "#2a16102e",

  // Brand System v1 foundations (TASK-147). These are additive during the
  // migration: existing pages keep the legacy token names until a bounded
  // follow-up moves them onto the semantic layer in src/design-system.
  "atlas-plum-950": "#12040f",
  "atlas-plum-900": "#170a17",
  "atlas-plum-850": "#1f071f",
  "atlas-plum-800": "#281026",
  "atlas-plum-700": "#32112a",
  "atlas-plum-600": "#4a1b41",
  "atlas-aubergine-700": "#3b1336",
  "atlas-aubergine-600": "#512049",
  "atlas-aubergine-500": "#6a2c5e",
  "atlas-dusk-600": "#7d2833",
  "atlas-dusk-500": "#9a3e43",
  "atlas-dusk-400": "#b15439",
  "atlas-ink-950": "#0f0d12",
  "atlas-ink-900": "#161219",
  "atlas-ivory-50": "#fffaf3",
  "atlas-ivory-100": "#f7eee9",
  "atlas-ivory-200": "#f0d6db",
  "atlas-ivory-300": "#d9b8c4",
  "atlas-paper-50": "#fbf4e8",
  "atlas-paper-100": "#f6ead4",
  "atlas-paper-200": "#e6cfa8",
  "atlas-blue-700": "#1438a0",
  "atlas-blue-600": "#163da9",
  "atlas-blue-500": "#1e4fd7",
  "atlas-blue-400": "#4d78e5",
  "atlas-blue-300": "#82a5f2",
  "atlas-blue-200": "#aec4f7",
  "atlas-amber-700": "#c77a3e",
  "atlas-amber-600": "#e9a24f",
  "atlas-amber-500": "#fcbf5b",
  "atlas-amber-400": "#fcd27a",
  "atlas-amber-300": "#ffd98a",
  "atlas-green-500": "#3ea37f",
  "atlas-green-400": "#78d6b4",
  "atlas-red-500": "#c95c54",
  "atlas-red-400": "#e78a7f",
  "atlas-shadow-soft": "0 10px 30px rgb(9 3 10 / 0.18)",
  "atlas-shadow-elevated": "0 20px 60px rgb(9 3 10 / 0.28)",
  "atlas-radius-lg": "10px",
  "atlas-radius-pill": "999px",
  "atlas-space-1": "2px",
  "atlas-space-10": "80px",
  "atlas-space-11": "112px",
  "atlas-space-12": "160px",
  "atlas-duration-micro": "90ms",
  "atlas-duration-quick": "160ms",
  "atlas-duration-base": "260ms",
  "atlas-duration-unfold": "520ms",
  "atlas-duration-narrative": "900ms",
  "atlas-ease-resolve": "cubic-bezier(0.22, 1, 0.36, 1)",
  "atlas-ease-locate": "cubic-bezier(0.2, 0.8, 0.2, 1)",
  "atlas-ease-unfold": "cubic-bezier(0.16, 1, 0.3, 1)",

  // Shape and space
  "radius-xs": "2px",
  "radius-sm": "4px",
  "radius-md": "6px",
  "space-2": "4px",
  "space-3": "8px",
  "space-4": "12px",
  "space-5": "16px",
  "space-6": "24px",
  "space-7": "32px",
  "space-8": "48px",
  "space-9": "64px",
  measure: "40rem",

  // Motion
  "duration-instant": "100ms",
  "duration-fast": "180ms",
  "duration-standard": "300ms",
  "duration-narrative": "650ms",
  "ease-primary": "cubic-bezier(0.22, 1, 0.36, 1)",
} as const;

export type TokenName = keyof typeof TOKENS;

/**
 * The map's colour bands, lowest share first. The count of bands is their
 * number (`voivodeship-map-scale.ts`), and `globals.css` styles each one twice
 * (`.vmap-bN` on the map, `.rb-fill[data-band]` on the compare bars).
 */
export const MAP_BANDS = [
  "map-0",
  "map-1",
  "map-2",
  "map-3",
  "map-4",
] as const satisfies readonly TokenName[];

/**
 * The three type voices (ADR-0021) by family name. The page sets them with
 * `next/font/google` in `layout.tsx`. The share card loads the files in
 * `assets/fonts/` under these names.
 */
export const TYPE_FAMILIES = {
  display: "Fraunces",
  ui: "Instrument Sans",
  data: "IBM Plex Mono",
} as const;

/**
 * Google's mark on the "Continue with Google" button (TASK-084), in the four
 * colours Google's sign-in branding guidelines fix. Not the site's palette.
 */
export const GOOGLE_MARK = {
  red: "#EA4335",
  blue: "#4285F4",
  yellow: "#FBBC05",
  green: "#34A853",
} as const;
