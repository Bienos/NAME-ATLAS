import { z } from "zod";

/**
 * `GET /api/v1/surname-prefix` — suggest-as-you-type
 * (`docs/contracts/surname-prefix.md`).
 *
 * Deliberately thin: a name and where it lives. No count, rank, share, score
 * or similarity crosses this boundary — the list is ordered by the server and
 * that order is the only signal a client gets.
 */
export const SURNAME_PREFIX_SCHEMA_VERSION = "1.0" as const;

export const prefixItemSchema = z.object({
  /** The surname exactly as the register stores it. */
  display_name: z.string().min(1),
  /** Its current canonical page in the requested language, or null if it has none. */
  path: z
    .string()
    .regex(/^\/(pl\/nazwisko|en\/surname)\/[^/]+$/u)
    .nullable(),
});

export const surnamePrefixResponseSchema = z
  .object({
    schema_version: z.literal(SURNAME_PREFIX_SCHEMA_VERSION),
    /**
     * SUGGESTIONS — `items` holds 0 to 8 surnames, best first.
     * TOO_SHORT — fewer than two characters; nothing was looked up.
     * INVALID_INPUT — the input failed validation (e.g. mixed script); nothing is offered.
     */
    status: z.enum(["SUGGESTIONS", "TOO_SHORT", "INVALID_INPUT"]),
    items: z.array(prefixItemSchema).max(8),
  })
  .refine((r) => r.status === "SUGGESTIONS" || r.items.length === 0, {
    message: "only SUGGESTIONS may carry items",
  });

export type PrefixItem = z.infer<typeof prefixItemSchema>;
export type SurnamePrefixResponse = z.infer<typeof surnamePrefixResponseSchema>;
