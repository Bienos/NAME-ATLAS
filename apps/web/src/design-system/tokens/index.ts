export * from "./colors.js";
export * from "./typography.js";
export * from "./motion.js";
export * from "./maps.js";
export * from "./charts.js";

export const spacingTokens = {
  xs: "var(--space-xs)",
  sm: "var(--space-sm)",
  md: "var(--space-md)",
  lg: "var(--space-lg)",
  xl: "var(--space-xl)",
  xxl: "var(--space-xxl)",
  section: "var(--space-section)",
} as const;

export const radiusTokens = {
  editorial: "var(--radius-editorial)",
  control: "var(--radius-control)",
  panel: "var(--radius-panel)",
  pill: "var(--radius-pill)",
} as const;
