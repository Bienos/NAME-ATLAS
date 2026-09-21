/**
 * What a job actually does (TASK-020).
 *
 * Kept separate from the BullMQ wiring so the work can be tested by calling a
 * function, with no Redis and no worker process. The handler takes a database and
 * a validated payload and returns what it did.
 *
 * It calls the same four derivations the synchronous path calls. Nothing new is
 * derived asynchronously that could not be derived synchronously — the point of
 * TASK-020 is the runtime, not a new fact — and every one of them is idempotent,
 * which is what makes the outbox's at-least-once delivery safe.
 */
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import type { Logger } from "@name-atlas/logging";
import {
  deriveCurrentDistribution,
  deriveCurrentPopulation,
  deriveCurrentRank,
  deriveRarityContext,
} from "@name-atlas/truth";
import type { DeriveSurnameClaimsPayload } from "@name-atlas/queue";

export interface DeriveResult {
  readonly surname: string;
  /** One entry per chain: what it returned, so a refusal is visible not silent. */
  readonly outcomes: readonly { readonly chain: string; readonly outcome: string }[];
  readonly claims: number;
}

/**
 * Derives every claim this repository knows how to derive for one surname.
 *
 * A refusal is a result, not an error: a surname with no complete universe has no
 * rank, and the job has still done its work correctly. Only an exception is a
 * failure, and BullMQ retries those.
 */
export async function deriveSurnameClaims(
  db: Kysely<DB>,
  payload: DeriveSurnameClaimsPayload,
  log: Logger,
): Promise<DeriveResult> {
  const chains = [
    ["CURRENT_POPULATION", deriveCurrentPopulation],
    ["CURRENT_RANK", deriveCurrentRank],
    ["RARITY_CONTEXT", deriveRarityContext],
    ["CURRENT_DISTRIBUTION", deriveCurrentDistribution],
  ] as const;

  const outcomes: { chain: string; outcome: string }[] = [];
  let claims = 0;

  for (const [chain, derive] of chains) {
    const result = await derive(db, payload.surname);
    if (result.kind === "NO_RESULT") {
      outcomes.push({ chain, outcome: result.reason });
      log.info("chain_refused", { chain, reason: result.reason });
      continue;
    }
    const produced =
      "current_population" in result
        ? result.current_population.length
        : "current_rank" in result
          ? result.current_rank.length
          : "rarity_context" in result
            ? result.rarity_context.length
            : result.current_distribution.length;
    claims += produced;
    outcomes.push({ chain, outcome: `RESULT(${String(produced)})` });
    log.info("chain_derived", { chain, claims: produced });
  }

  return { surname: payload.surname, outcomes, claims };
}
