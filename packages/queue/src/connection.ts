/**
 * The Redis connection (TASK-020).
 *
 * ADR-0001 deferred Redis to M3 and says introducing it then "is an expected,
 * planned change, not a stack revision, and needs no new ADR". This is that.
 *
 * `maxRetriesPerRequest: null` is required by BullMQ for a blocking consumer: its
 * workers hold a long-lived blocking command, and ioredis's default would abort
 * it. It is not a resilience opinion, it is BullMQ's documented requirement.
 */
import { Redis } from "ioredis";

export class MissingRedisUrlError extends Error {
  constructor() {
    super("REDIS_URL is not set. The queue cannot run without it.");
    this.name = "MissingRedisUrlError";
  }
}

export interface QueueConfig {
  readonly redisUrl: string;
}

export function loadQueueConfig(
  env: Record<string, string | undefined> = process.env,
): QueueConfig {
  const redisUrl = env["REDIS_URL"];
  if (redisUrl === undefined || redisUrl.trim() === "") {
    throw new MissingRedisUrlError();
  }
  return { redisUrl };
}

export function createRedis(config: QueueConfig): Redis {
  return new Redis(config.redisUrl, { maxRetriesPerRequest: null });
}
