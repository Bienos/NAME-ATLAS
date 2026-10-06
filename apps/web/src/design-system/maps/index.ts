import { mapTokens } from "../tokens/maps.js";

/**
 * Visual roles only. Factual geometry and distribution values remain owned by
 * the existing voivodeship map and validated presentation objects.
 */
export const atlasMapTheme = {
  ...mapTokens,
  bands: [
    mapTokens.lowest,
    mapTokens.low,
    mapTokens.mid,
    mapTokens.high,
    mapTokens.peak,
  ] as const,
} as const;
