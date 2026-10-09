import type { GivenNameListFactsArtefact, ListFactsArtefact } from "@name-atlas/contracts";
import { createLogger } from "@name-atlas/logging";

/**
 * The atlas's facts, or `null` (TASK-040 AC-08; the Atlas page since TASK-178).
 *
 * `read` is `listFacts()` from `@name-atlas/truth`, which parses the committed
 * artefact against its contract and throws if it does not satisfy it. A throw
 * here costs the plates, never the page: the error is logged and the page
 * renders without them, exactly as `loadCommonLists` does for the most common
 * surnames.
 */
export function loadListFacts(
  read: () => ListFactsArtefact,
  route = "/",
): ListFactsArtefact | null {
  try {
    return read();
  } catch (cause: unknown) {
    createLogger({ service: "web", base: { route } }).error("list_facts_failed", { cause });
    return null;
  }
}

/** Part II's facts the same way (TASK-178): a throw costs Part II, never the page. */
export function loadGivenNameListFacts(
  read: () => GivenNameListFactsArtefact,
  route = "/pl/atlas",
): GivenNameListFactsArtefact | null {
  try {
    return read();
  } catch (cause: unknown) {
    createLogger({ service: "web", base: { route } }).error("given_name_list_facts_failed", {
      cause,
    });
    return null;
  }
}
