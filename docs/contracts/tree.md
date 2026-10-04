# Contract — The family tree

- **Status:** Accepted
- **Accepted by:** TASK-066 (`tasks/065-family-tree-core.md`) with ADR-0029, 2026-10-01
- **Schema version:** `1.1` (1.0 by TASK-066; 1.1 by TASK-094, invitations and claims) · **API version:** `v1`
- **Runtime schema:** `packages/contracts/src/tree.ts`
- **Produced by:** `@name-atlas/family`'s `getTree` and `exportTree` (everything but `places`), and the route that resolves `place_codes` into `places` from the register.

## Endpoint

```http
GET /api/v1/trees/{tree_id}
GET /api/v1/trees/{tree_id}/export
```

Both need a signed-in session (ADR-0027). The export is built by TASK-098 (`apps/web/src/lib/tree-export.ts`): the object below as a file (`content-disposition: attachment`, a name from the id, never the title; `private, no-store`), recorded as `EXPORTED`, with `places` empty while the register holds no coordinates for a locality (TASK-092). The plain read is not built; the pages read through the service.

## Status codes

| Code | When |
|---|---|
| `200` | The caller owns the tree or is a member of it. |
| `401` | No session. |
| `404` | No such tree **or a tree the caller may not open**: the two are not told apart (ADR-0029 §2.3.9). |
| `500` | Unexpected failure (`INTERNAL_ERROR`). |

## Response

```jsonc
{
  "schema_version": "1.1",
  "tree": {
    "id": "<uuid>",
    "title": "Rodzina Zielińskich",
    "root_person_id": "<uuid>" | null,   // the person the pedigree is read from ("Ty")
    "role": "OWNER" | "EDITOR" | "VIEWER", // the caller's
    "created_at": "<ISO 8601>",
    "updated_at": "<ISO 8601>"
  },
  "persons": [{
    "id": "<uuid>",
    "given_names": "Halina",
    "surname": "Zielińska",
    "birth_surname": "Kaczmarek" | null,
    "birth": { "year": 1937 | null, "approx": false, "place_code": "0960432" | null, "place_text": "Szczebrzeszyn" | null },
    "death": { "year": 2015 | null, "approx": false, "place_code": null, "place_text": null },
    "living_status": "UNKNOWN" | "LIVING" | "DECEASED",
    "treated_as_living": false,          // true unless DECEASED (docs/canonical/19 §10)
    "provenance": "ENTERED",             // the first release's only value (ADR-0029 §2.2.6)
    "source_note": "akt małżeństwa, parafia Szczebrzeszyn" | null,
    "notes": "…" | null,                 // null for a VIEWER
    "updated_at": "<ISO 8601>",
    "claimed": false,                    // 1.1: someone answered "to ja" to an invitation for this row
    "claimed_by_me": false,              // 1.1: the caller is that someone
    "hidden_fields": ["birth_year" | "birth_place" | "birth_surname"],  // 1.1: what the claimant hides; blank here for everyone but them
    "contact_declined": false            // 1.1: the person declined contact; the owner alone receives such a row
  }],
  "parentage": [{ "child_id": "<uuid>", "parent_id": "<uuid>", "role": "MOTHER" | "FATHER" | "PARENT" }],
  "members": [{ "user_id": "<uuid>", "role": "EDITOR" | "VIEWER", "sees_living": false }] | null,  // null unless OWNER
  "hidden_living_count": 2,            // people removed because the caller may not see the living
  "places": [{ "code": "0960432", "name": "Szczebrzeszyn", "lat": 50.70, "lon": 22.97 }]
}
```

## Rules the shape carries

- A `death.year` means `living_status = "DECEASED"`; `treated_as_living` is `living_status !== "DECEASED"`. Both are refined in the schema.
- A member whose `sees_living` is off receives `persons` without the living and the unknown, `parentage` without any link that touches them, and the count in `hidden_living_count`. The server does this; the browser never receives what it then hides.
- Every view (pedigree, constellation, map, Ahnentafel numbers, the next empty slot) is derived in the browser from this object. Nothing per view is stored or sent.
- `places` holds one entry per distinct `place_code` in `persons` that the register knows; a code it does not know is left out, and the person keeps their `place_text`.
- `provenance` has one value until documents exist (D-027).

## Versioning

`1.1`. TASK-094 added the four claim fields (the minor bump 1.0 announced); removing or renaming a field is a major bump with a stated window.

## Invitations and claims (TASK-094, ADR-0029 §2.6)

- A claimed row's `birth_surname`, `birth.year` (with `approx`), and `birth.place_code` with `birth.place_text` are `null` for everyone but the claimant when the claimant lists that field in `hidden_fields`; the list itself travels to everyone, so the owner sees that a field is hidden and not what it holds.
- The owner and the editors cannot update a claimed row (`CLAIMED` from `updatePerson`); `parentage` is still theirs.
- A row with `contact_declined` is never in a member's `persons`; the owner receives it with the flag.
- The invited person, and later the claimant, is not a member: they do not receive this object at all, only their own row with the parents' names (`CardRead` in `@name-atlas/family`), and the tree's title is not part of it.

## Parentage edit safeguards (TASK-070)

Parentage writes are serialized per tree before checking its current graph, so concurrent edits cannot each approve a third parent or a cycle. An editor whose living-person visibility is off receives `FORBIDDEN` from parentage changes: graph validation requires the complete graph. The existing read filtering and other member permissions remain as specified.

Visibility changes and membership removal take the same tree lock as parentage edits. A waiting graph edit rechecks living-person visibility after it obtains the lock; a revoked permission cannot leave it checking a partially hidden graph.

A child has at most one `MOTHER` and one `FATHER`, held by a partial unique index and answered as `ROLE_TAKEN`; other links use `PARENT`, and a child still has two parents at most. Deleting a person removes every link to and from them, so it takes the tree lock and the same view of living people as a parentage change: an editor who cannot see the living receives `FORBIDDEN`. Every edit by an owner or an editor moves the tree's `updated_at`, through `family.touch_tree`, because the policy on `trees` lets only the owner update it.
