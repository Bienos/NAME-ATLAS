# TASK-111 — The free tree's limits: 5 people, and what limits matches

- **Status:** IMPLEMENTED 2026-10-04 (`docs/progress/2026-10-04-tree-free-limits.md`). The second-cousin limit is not built: it has nothing to limit yet (§2.4).
- **Requested by:** the project owner, 2026-10-04: build the free limits they decided that day (D-025, D-034), using a minimal entitlement that answers "no" for everyone until checkout exists.
- **Decision:** ADR-0037 §2.1 (the tiers and the tree unlock), D-025 and D-034 (answered). No new ADR. The design below is the smallest one that holds until checkout, not a binding choice of how tiers are stored.
- **Depends on:** TASK-066 (the family schema and service), TASK-076 (the tree's pages and routes), TASK-094 (invitations and claims), TASK-104 (the offer page), all on `main` @ `9866385`.
- **Model guidance:** implementation session.

## 1. Goal

A free account's tree holds at most 5 people. The server refuses a sixth, and the tree page says why in Polish and English, linking to the offer page with no buy button. Any paid tier lifts the cap. No account has a paid tier until checkout exists, so the cap applies to everyone now. The tree stays dark behind `FAMILY_TREE_ENABLED`.

## 2. Facts (checked on `main` @ `9866385`, 2026-10-04)

1. Only `addPerson` in `packages/family/src/service.ts` inserts into `family.persons`. Invitations and claims update existing rows; they never add any.
2. `persons_select` hides the living and unknown from an editor whose `sees_living` is off, and hides a declined row from everyone but the owner (migrations 0028 and 0033). A count run as an editor can therefore come out short.
3. Nothing stores a tier, an entitlement or a payment. ADR-0023 §2.5 forbids building checkout before the owner's legal and tax gates.
4. **No tree matching exists.** There is no match index, no proposal and no link between people in two trees: no table, no service call, no contract field. ADR-0029 §2.18 says "neither door is in the first release", and §4 puts "the deceased match index" after export. The `matches` strings in `tree-text.ts` are the birthplace picker and the landing's mockup. The degree of kinship within one tree could be worked out from `parentage` and `root_person_id`. A match between two trees could not: nothing stores which person in one tree is the same as a person in another.
5. Migration numbers on `main` end at 0033, and no open pull request adds one. The task numbers on `main` and in open pull requests end at 110.

## 3. In scope

1. `packages/family`: `FREE_TREE_PERSONS_MAX = 5` and `noPaidTier` (returns false) in `rules.ts`. `FamilyDeps.hasPaidTier`, defaulting to `noPaidTier`. `addPerson` answers `{ kind: "PERSON_LIMIT", limit: 5 }` (`AddPersonResult`) when the tree's **owner** has no paid tier and the tree already holds 5 people. The check counts under the tree lock.
2. Migration `0034_family_person_count.ts`: `family.tree_person_count(t)`, SECURITY DEFINER. It returns the count of every row to a caller who may write the tree, and 0 to anyone else.
3. `apps/web`: the add route answers `PERSON_LIMIT` with a redirect to the tree page carrying `?status=person-limit`. That status has Polish and English words and a link to `offerPath` (`/pl/oferta`, `/en/offer`). There is no buy button.
4. Tests: the rule (unit); the route and the page in both languages (unit); against real PostgreSQL, the cap for the owner and for an editor who cannot see the living rows; two concurrent adds for the last place; the paid-tier lift, asked about the owner's account; and the function answering 0 to a stranger.
5. Docs: `docs/contracts/tree.md` (the section on the free tree's limits), `docs/CODEMAP.md`, D-034's line in `docs/DECISIONS_NEEDED.md`, ADR-0037's "Implemented by" line, `STATUS.md`, and a progress record.

## 4. Out of scope

- Checkout, payments, a stored tier, and any way to set one from the web (ADR-0023 §2.5).
- Tree matching and the match index (ADR-0029 §2.18). So, too, the **second-cousin limit**: it limits matches, and there are none to limit (§2.4). The task that builds matching applies the limit. It must first fix what "up to second cousins" counts from, which no decision states yet: for example, a shared ancestor no further up than the reader's great-grandparents.
- A limit on the number of trees per account. Nobody has decided one (D-034), so a free account can still make several trees of 5 people each.
- A count or warning before the limit is reached, for example "4 of 5" on the tree page.
- Turning on accounts or the tree in production.

## 5. Acceptance criteria

- **AC-1** With no paid tier, a sixth `addPerson` on a tree of 5 answers `PERSON_LIMIT` and writes nothing. This holds for the owner and for an editor who cannot see the living rows.
- **AC-2** Of two adds at once for a tree's last place, one succeeds and the other answers `PERSON_LIMIT`.
- **AC-3** With `hasPaidTier` true for the owner, the sixth person is saved. The question is asked about the owner's account.
- **AC-4** The POST answers `PERSON_LIMIT` with `?status=person-limit` on the tree page. The page shows the message in Polish and English with a link to `/pl/oferta` or `/en/offer`, and no buy wording.
- **AC-5** The default answer is "no paid tier" for every account, and nothing in the web can change it.
- **AC-6** Verification: `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm check:ids` pass. The integration tests that touch the tree pass against a real PostgreSQL.
