/**
 * `@name-atlas/queue` — the asynchronous runtime ADR-0001 deferred to M3
 * (TASK-020).
 *
 * Three pieces and no more: the job contract, the Redis connection, and the
 * outbox that makes a database write and a queue publish one decision instead of
 * two. `docs/canonical/15` §6 lists eight run types; one of them describes work
 * this repository can actually perform, so one job exists.
 *
 * ADR-0001: "Introducing Redis/BullMQ at M3 is an expected, planned change, not a
 * stack revision, and needs no new ADR."
 */
export {
  DERIVE_SURNAME_CLAIMS,
  JOB_SCHEMAS,
  QUEUE_NAME,
  deriveSurnameClaimsPayload,
  isJobName,
} from "./jobs.js";
export type { DeriveSurnameClaimsPayload, JobName } from "./jobs.js";
export { MissingRedisUrlError, createRedis, loadQueueConfig } from "./connection.js";
export type { QueueConfig } from "./connection.js";
export { MAX_ATTEMPTS, dispatchOutbox, enqueueInTransaction } from "./outbox.js";
export type { DispatchOptions, DispatchReport, JobPublisher, OutboxIntent } from "./outbox.js";
