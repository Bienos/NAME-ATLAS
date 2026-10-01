import type { SurnameResultResponse } from "@name-atlas/contracts";

/**
 * What the dusk world draws for a surname (TASK-052, ADR-0021): a weight per
 * voivodeship and, where there is one, the region that is lit.
 *
 * Presentation only, and it derives no fact. The weights are the first
 * `READY` distribution entry's own `share_of_covered` values, keyed by TERC
 * code, exactly as the payload carries them; they shade the atmosphere behind
 * the page, while the chapter's choropleth and table carry the figures. The lit
 * region follows `snapshot.tsx`'s rule: the largest region only when it is
 * strictly larger than the second, because a tie is a sort artefact, not a
 * fact. A surname with no ready distribution gets no weights and no lit
 * region, and the world draws the register alone.
 *
 * One entry only, never a sum across the two register lists (`ARCHITECTURE.md`
 * §10): the second list's shares are in its own chapter.
 */
export interface WorldInput {
  readonly weights: Readonly<Record<string, number>>;
  readonly lit: string | null;
}

export const EMPTY_WORLD: WorldInput = { weights: {}, lit: null };

export function worldInput(response: SurnameResultResponse): WorldInput {
  // Optional chaining, not a null check: a partial fixture may omit the field.
  const distribution = response.distribution;
  if (distribution?.state !== "READY") return EMPTY_WORLD;
  const entry = distribution.entries.find((e) => e.coverage_state === "READY");
  if (entry === undefined) return EMPTY_WORLD;
  const weights: Record<string, number> = {};
  for (const region of entry.regions) {
    if (region.terc_code !== null) weights[region.terc_code] = region.share_of_covered;
  }
  const top = entry.regions[0];
  const second = entry.regions[1];
  const lit =
    top !== undefined &&
    top.terc_code !== null &&
    (second === undefined || second.count < top.count)
      ? top.terc_code
      : null;
  return { weights, lit };
}
