/**
 * The committed given-name list-facts artefact, validated (TASK-178,
 * ADR-0051, `docs/contracts/given-name-list-facts.md`).
 *
 * The web app calls {@link givenNameListFacts} server-side and renders what it
 * returns. It never recomputes a figure: every number was derived here, in
 * `packages/truth`, by `bin/build-given-name-list-facts.ts`.
 */
import { givenNameListFactsArtefactSchema } from "@name-atlas/contracts";
import type { GivenNameListFactsArtefact } from "@name-atlas/contracts";
import { GIVEN_NAME_LIST_FACTS_DATA } from "../generated/given-name-list-facts.js";

let cached: GivenNameListFactsArtefact | null = null;

/**
 * The committed artefact, parsed against `givenNameListFactsArtefactSchema`
 * once and memoised. Throws if it does not parse: a page must never render an
 * artefact the contract rejects.
 */
export function givenNameListFacts(): GivenNameListFactsArtefact {
  if (cached === null) {
    const parsed = givenNameListFactsArtefactSchema.safeParse(GIVEN_NAME_LIST_FACTS_DATA);
    if (!parsed.success) {
      throw new Error(
        "the committed given-name list-facts artefact does not satisfy its contract: " +
          parsed.error.message,
      );
    }
    cached = parsed.data;
  }
  return cached;
}
