/**
 * The family tree contract (TASK-066, ADR-0029 §2.5.16).
 *
 * One object, `tree`, answered by `GET /api/v1/trees/{id}` to a signed-in
 * reader who owns the tree or is a member of it. The browser derives every
 * view from it: the pedigree's slots, the constellation, the map, the
 * Ahnentafel numbers and the dashboard's next empty slot. No view is stored.
 *
 * What a member who may not see the living receives: the same shape, with the
 * living and unknown people and their links removed on the server, and
 * `hidden_living_count` saying how many. Notes travel to the owner and
 * editors only; a viewer receives `null`.
 *
 * 1.1 (TASK-094): a person carries `claimed`, `claimed_by_me`, `hidden_fields`
 * and `contact_declined`, the trace of an invitation answered (ADR-0029 §2.6).
 *
 * `places` is filled by the route from the register (the read-only pool, by
 * TERYT code, with no user id in that query) so the map can place a birth;
 * the family package does not read the register and answers `place_codes`
 * instead.
 */
import { z } from "zod";

export const TREE_SCHEMA_VERSION = "1.1";

/** What a claimant may keep from everyone else (TASK-094, ADR-0029 §2.6.22). */
export const hiddenFieldSchema = z.enum(["birth_year", "birth_place", "birth_surname"]);

export const livingStatusSchema = z.enum(["UNKNOWN", "LIVING", "DECEASED"]);
export const parentRoleSchema = z.enum(["MOTHER", "FATHER", "PARENT"]);
export const treeRoleSchema = z.enum(["OWNER", "EDITOR", "VIEWER"]);

const simcCode = z.string().regex(/^[0-9]{7}$/u);
const year = z.number().int().min(1000).max(2100);

export const lifeEventSchema = z.object({
  year: year.nullable(),
  approx: z.boolean(),
  place_code: simcCode.nullable(),
  place_text: z.string().min(1).max(120).nullable(),
});

export const treePersonSchema = z
  .object({
    id: z.string().uuid(),
    given_names: z.string().min(1).max(120),
    surname: z.string().min(1).max(120),
    birth_surname: z.string().min(1).max(120).nullable(),
    birth: lifeEventSchema,
    death: lifeEventSchema,
    living_status: livingStatusSchema,
    /** The canonical rule applied: true unless `DECEASED`. */
    treated_as_living: z.boolean(),
    /** The first release knows one provenance (ADR-0029 §2.2.6). */
    provenance: z.literal("ENTERED"),
    source_note: z.string().min(1).max(500).nullable(),
    /** Null for a viewer. */
    notes: z.string().min(1).max(2000).nullable(),
    updated_at: z.string().datetime(),
    /** Someone answered "to ja" to an invitation for this row (1.1, TASK-094). */
    claimed: z.boolean(),
    claimed_by_me: z.boolean(),
    /** The fields the claimant hides; blank in this object for everyone but them. */
    hidden_fields: z.array(hiddenFieldSchema),
    /** The person declined contact: the owner alone receives the row (D-031). */
    contact_declined: z.boolean(),
  })
  .refine((p) => p.treated_as_living === (p.living_status !== "DECEASED"), {
    message: "treated_as_living must follow living_status",
  })
  .refine((p) => p.death.year === null || p.living_status === "DECEASED", {
    message: "a death year means DECEASED",
  })
  .refine((p) => p.claimed || (!p.claimed_by_me && p.hidden_fields.length === 0), {
    message: "only a claimed row is claimed by the caller or hides a field",
  });

export const treeParentageSchema = z.object({
  child_id: z.string().uuid(),
  parent_id: z.string().uuid(),
  role: parentRoleSchema,
});

export const treeMemberSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["EDITOR", "VIEWER"]),
  sees_living: z.boolean(),
});

export const treePlaceSchema = z.object({
  code: simcCode,
  name: z.string().min(1),
  lat: z.number(),
  lon: z.number(),
});

export const treeResponseSchema = z.object({
  schema_version: z.literal(TREE_SCHEMA_VERSION),
  tree: z.object({
    id: z.string().uuid(),
    title: z.string().min(1).max(120),
    root_person_id: z.string().uuid().nullable(),
    /** The caller's relationship to the tree. */
    role: treeRoleSchema,
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  }),
  persons: z.array(treePersonSchema),
  parentage: z.array(treeParentageSchema),
  /** Null unless the caller owns the tree. */
  members: z.array(treeMemberSchema).nullable(),
  /** People removed from `persons` because the caller may not see the living. */
  hidden_living_count: z.number().int().nonnegative(),
  /** Resolved by the route for every distinct place code in `persons`; a code the register does not know is left out. */
  places: z.array(treePlaceSchema),
});

export type TreeResponse = z.infer<typeof treeResponseSchema>;
export type TreePerson = z.infer<typeof treePersonSchema>;
export type TreeParentage = z.infer<typeof treeParentageSchema>;
