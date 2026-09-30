import type { ListFactsArtefact } from "@name-atlas/contracts";
import { createLogger } from "@name-atlas/logging";

/**
 * The landing atlas's facts, or `null` (TASK-040 AC-08).
 *
 * `read` is `listFacts()` from `@name-atlas/truth`, which parses the committed
 * artefact against its contract and throws if it does not satisfy it. A throw
 * here costs the atlas section, never the page: the error is logged and the
 * landing renders without the plates, exactly as `commonLists` does for the
 * most common surnames.
 */
export function loadListFacts(read: () => ListFactsArtefact): ListFactsArtefact | null {
  try {
    return read();
  } catch (cause: unknown) {
    createLogger({ service: "web", base: { route: "/" } }).error("list_facts_failed", { cause });
    return null;
  }
}
