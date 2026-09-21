/**
 * The job contract (TASK-020).
 *
 * A job crosses a process boundary and sits in Redis for a while, so its payload
 * is validated on **both** sides by the same schema. A producer cannot enqueue a
 * shape the consumer will reject, and a consumer never trusts what it dequeued —
 * a payload can outlive the code that wrote it.
 *
 * One job type, because one kind of real asynchronous work exists: deriving a
 * surname's claims. `docs/canonical/15` §6 lists eight run types; seven of them
 * describe work no module performs yet, and a queue full of unimplemented job
 * names is scaffolding, not capability.
 */
import { z } from "zod";

/** The single queue. One is enough until a job needs different concurrency. */
export const QUEUE_NAME = "name-atlas-runtime";

/**
 * Derive every claim this repository knows how to derive for one surname.
 *
 * Idempotent by construction: each derivation is keyed by `claim_key` and
 * re-running it re-reads rather than duplicating. That is what makes the outbox's
 * at-least-once delivery safe.
 */
export const DERIVE_SURNAME_CLAIMS = "derive-surname-claims";

export const deriveSurnameClaimsPayload = z.object({
  /** The raw input, resolved by the worker through the resolver, not pre-resolved. */
  surname: z.string().min(1).max(200),
  /** Carried from the request that caused the job, so logs join across processes. */
  correlationId: z.string().min(1),
});

export type DeriveSurnameClaimsPayload = z.infer<typeof deriveSurnameClaimsPayload>;

/** Every job name, with the schema that validates its payload. */
export const JOB_SCHEMAS = {
  [DERIVE_SURNAME_CLAIMS]: deriveSurnameClaimsPayload,
} as const;

export type JobName = keyof typeof JOB_SCHEMAS;

export function isJobName(value: string): value is JobName {
  return Object.hasOwn(JOB_SCHEMAS, value);
}
