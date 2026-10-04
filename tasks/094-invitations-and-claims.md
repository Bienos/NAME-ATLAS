# TASK-094 — The family tree: invitations and claims (ADR-0029 §2.6.20–23)

- **Status:** IMPLEMENTED 2026-10-04; AC-1 to AC-7 verified (`docs/progress/2026-10-04-invitations-and-claims.md`).
- **Requested by:** the project owner, 2026-10-04: "Go", after the Mapa (TASK-092); STATUS names invitations and claims as the tree's next step.
- **Number:** 094, the next free on `main` (up to 093) with no open pull request.
- **Builds on:** TASK-066 (the schema, the policies, the service), TASK-076 (the pages and routes), TASK-062 (the mailer and the token pattern of `accounts.email_tokens`), ADR-0029 §2.3.10 (sharing is explicit, per person invited), §2.6.20–23 (the invitation, the three answers, the claim, the suppression), D-031 (a relative who declines contact stays as the owner's private row, pending legal review).
- **Record:** `docs/progress/2026-10-04-invitations-and-claims.md`.

## 1. Outcome

A living person in a tree can be asked whether they are that person. The owner types an address into an invitation on the person's page and ticks that the person agrees to the address being passed on; one mail goes out, naming the owner and nothing of the person; no reminder follows. The invited person signs in, sees their own row (name, birth year, birthplace, birth surname, the parents' names as the owner wrote them) and nothing else of the tree, and answers *To ja*, *To nie ja* or *Nie chcę kontaktu*. *To ja* claims the row: from then on the claimant corrects it themselves, may hide its birth year, birthplace or birth surname from everyone else (who see that a field is hidden, not what it holds), and may leave at any time; the owner keeps the relationships and can no longer edit the claimed fields. The other two answers put the address, as a hash, on the tree's suppression list; *Nie chcę kontaktu* also marks the row as declined, which the owner alone sees. The owner learns the answer and never whether the mail was opened. Everything stays dark with the rest of the tree, and the legal review D-031 names precedes go-live.

## 2. In scope

1. **Migration 0033** (`family_invitations`): `persons` gain `claimed_by_user_id`, `claimed_at`, `contact_declined` and `hidden_fields`; `family.invitations` (tree, person, token hash, address hash, sent by, sent at, expiry, the answer); `family.suppressions` (tree, address hash); the audit kinds `INVITATION_SENT`, `PERSON_CLAIMED`, `CLAIM_RELEASED`, `CONTACT_DECLINED`; the policies: a claimant reads and updates their own row and reads its parents' names, a pending invitation's holder reads the same through `app.invitation`, an owner or editor no longer updates a claimed row, a declined row is the owner's alone; `family.answer_invitation` and `family.release_claim` as the one way those rows change.
2. **The service** (`@name-atlas/family`): `invite` (owner only; a living or unknown person, not under 18 by birth year, not claimed, not declined, the address not suppressed, no pending invitation for the person, ten per tree per 30 days), `withdrawInvitation`, `invitationOf`, `openInvitation`, `answerInvitation`, `listCards`, `getCard`, `updateCard`, `leaveTree`; `getTree` carries `claimed`, `claimed_by_me`, `hidden_fields` and `contact_declined` per person and blanks a hidden field for everyone but the claimant; `updatePerson` answers `CLAIMED` for a row someone else has claimed.
3. **The contract** `tree` 1.0 → 1.1 (`docs/contracts/tree.md`, `packages/contracts/src/tree.ts`): the four fields above.
4. **The pages and routes**: on a person's page, for the owner, the invitation form (address, the consent box) or the state of the last invitation; a claimed row shown read-only with its hidden fields marked; the invitation page `/pl/konto/drzewa/zaproszenie?t=…` (`/en/account/trees/invitation?t=…`) with the card and the three answers, reachable through sign-in (`safeNext`); the claimant's cards `/pl/konto/drzewa/karty` (`…/trees/cards`) and one card `/pl/konto/drzewa/karta/{person}` (`…/trees/card/{person}`) with its form, the hide boxes and the way to leave; the dashboard's link to the cards; the actions `invite`, `answer-invitation`, `update-card`, `leave-tree`; the mail (`tree-mail.ts`) in both languages, sent through the accounts mailer, the row withdrawn when the mail cannot be sent.
5. The privacy notice's tree section gains the sentence on invitations (the address is used for one message; its hash is kept per tree so it is not invited again against the person's answer).
6. Tests: the rules, the paths, `safeNext`, the mail, the loader, the routes, the rendering in both languages, the contract; the integration case over a real database as the app role: the flow end to end, the policies, the limits.

## 3. Out of scope

- §2.6.24 (a claimed person joining two trees), §2.6.25–26 (identity verification, "Czy jestem w czyimś drzewie?"), reminders, an owner-side list of members' claims beyond the person's page, GEDCOM, the deceased match index, any change to the Rodowód, Konstelacja or Mapa views beyond what the new fields require, the legal review itself.

## 4. Acceptance criteria

- **AC-1** `invite` refuses, by name, a deceased person, a person under 18 by birth year, a claimed or declined row, a suppressed address, a second pending invitation for one person and the eleventh in 30 days; a viewer or an editor cannot invite; the mail carries the owner's address and the link, and no name, date or place.
- **AC-2** With the token, a signed-in stranger reads the invited person's row and the parents' names, and cannot read the tree, its other people or its members; without the token, nothing; after the expiry or the answer, nothing.
- **AC-3** *To ja* sets `claimed_by_user_id`, makes the row `LIVING`, writes `PERSON_CLAIMED`; the claimant may read and correct their row and hide its birth year, birthplace or birth surname; the owner then sees the row with those fields blank and listed as hidden, and `updatePerson` by the owner answers `CLAIMED` while `setParent` still works; one account claims at most one row per tree.
- **AC-4** *To nie ja* and *Nie chcę kontaktu* put the address hash on the tree's suppression list, so the owner's next `invite` of that address answers `SUPPRESSED`; *Nie chcę kontaktu* marks the row declined, which a member cannot read and the owner can; the owner's page shows the answer.
- **AC-5** `leaveTree` clears the claim and the hidden fields, suppresses the address of the invitation that led to the claim, and writes `CLAIM_RELEASED`; the owner's next `invite` of that address answers `SUPPRESSED`.
- **AC-6** The pages: the person's page shows the invitation form to the owner only and the state afterwards; the invitation page needs a session and comes back to itself after sign-in; a card's page shows the form with the hide boxes and the way to leave; both languages render the same structure.
- **AC-7** The contract's runtime schema accepts a person with the four new fields and refuses an unknown hidden field.

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids
pnpm test
FAMILY_TREE_ENABLED=1 <the accounts variables> pnpm --filter web build
TEST_DATABASE_URL=… pnpm test:integration
```
