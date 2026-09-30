/**
 * The committed list-facts artefact, validated (TASK-040,
 * `docs/contracts/list-facts.md`).
 *
 * The web app calls {@link listFacts} server-side and renders what it
 * returns. It never recomputes a figure: every number was derived here, in
 * `packages/truth`, by `bin/build-list-facts.ts`.
 */
import { listFactsArtefactSchema } from "@name-atlas/contracts";
import type { ListFactsArtefact } from "@name-atlas/contracts";
import { LIST_FACTS_DATA } from "../generated/list-facts.js";

let cached: ListFactsArtefact | null = null;

/**
 * The committed artefact, parsed against `listFactsArtefactSchema` once and
 * memoised. Throws if it does not parse: a page must never render an
 * artefact the contract rejects.
 */
export function listFacts(): ListFactsArtefact {
  if (cached === null) {
    const parsed = listFactsArtefactSchema.safeParse(LIST_FACTS_DATA);
    if (!parsed.success) {
      throw new Error(
        `the committed list-facts artefact does not satisfy its contract: ${parsed.error.message}`,
      );
    }
    cached = parsed.data;
  }
  return cached;
}
