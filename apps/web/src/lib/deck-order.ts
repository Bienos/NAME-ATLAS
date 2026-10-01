import type { RarityEntry, SurnameResultResponse } from "@name-atlas/contracts";

/**
 * The deck's order and figures (TASK-055, TASK-056), shared by the cards and
 * their share images so the two can never lead with different lists or read a
 * figure differently. Pure: no rendering here.
 */

export function oneInOf(entry: RarityEntry): number | null {
  return entry.primary.metric === "ONE_IN_X" ? entry.primary.value : null;
}

export function rankOf(entry: RarityEntry): number | null {
  return entry.supporting.find((metric) => metric.metric === "RANK")?.value ?? null;
}

export type Side = "male" | "female";

export function sideOf(group: string | null): Side | null {
  if (group === null) return null;
  if (group.endsWith("_female")) return "female";
  if (group.endsWith("_male")) return "male";
  return null;
}

/**
 * The list that holds most of the surname's people: KOWALSKA's is the women's
 * (67,308 against 3 men), KOWALSKI's the men's. Null when nothing says.
 */
export function mainSide(response: SurnameResultResponse): Side | null {
  const counts =
    response.population?.state === "READY"
      ? response.population.observations.map((o) => ({
          side: sideOf(o.comparability_group),
          n: o.value.value ?? 0,
        }))
      : [];
  const best = [...counts].sort((a, b) => b.n - a.n)[0];
  return best === undefined || best.n === 0 ? null : best.side;
}

/** Stable: the main list's items first, everything else in its order. */
function mainFirst<T>(
  items: readonly T[],
  side: Side | null,
  sideOfItem: (item: T) => Side | null,
): T[] {
  if (side === null) return [...items];
  return [
    ...items.filter((i) => sideOfItem(i) === side),
    ...items.filter((i) => sideOfItem(i) !== side),
  ];
}

/**
 * The same response with each section's lists in the deck's order: the main
 * list first, so a card leads with the list the surname mostly lives on. The
 * page keeps the contract's order; nothing is dropped or changed.
 */
export function inDeckOrder(response: SurnameResultResponse): SurnameResultResponse {
  const side = mainSide(response);
  if (side === null) return response;
  const { population, rarity, neighbours, distribution, change } = response;
  return {
    ...response,
    population:
      population === null
        ? null
        : {
            ...population,
            observations: mainFirst(population.observations, side, (o) =>
              sideOf(o.comparability_group),
            ),
          },
    rarity:
      rarity === null
        ? null
        : {
            ...rarity,
            entries: mainFirst(rarity.entries, side, (e) => sideOf(e.comparability_group)),
          },
    neighbours:
      neighbours === null
        ? null
        : {
            ...neighbours,
            lists: mainFirst(neighbours.lists, side, (l) => sideOf(l.comparability_group)),
          },
    distribution:
      distribution === null
        ? null
        : {
            ...distribution,
            entries: mainFirst(distribution.entries, side, (e) => sideOf(e.comparability_group)),
          },
    change:
      change === null
        ? null
        : {
            ...change,
            entries: mainFirst(change.entries, side, (e) =>
              e.list === "MALE" ? "male" : "female",
            ),
          },
  };
}
