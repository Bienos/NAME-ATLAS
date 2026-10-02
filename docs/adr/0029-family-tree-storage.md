# ADR-0029 — The family tree: what is stored, where, who may read it, and what reads it

- **Status:** Accepted for build, 2026-10-01. The project owner answered the decisions the same day: D-029 "make it paid" (the tree stays dark until checkout exists), D-028 "never" (a tree lives as long as its account), D-030 "ok" (mObywatel through an integrator, with a bank identity as the fallback, read on the day), D-031 "it's ok" (the proposal of §2.6.23 stands, subject to the legal review it names); D-027 (documents) stays open and blocks nothing. Then "do it now, we review later": TASK-068 builds §2.1–§2.5's schema, package and contract, dark.
- **Date:** 2026-10-01
- **Deciders:** the project owner chose the tree's look on 2026-10-01 from the two rounds of mockups (the first round: a dashboard, a consent step, the Konstelacja, Mapa and Rodowód views of one tree, and a phone flow of one question per screen), and asked how the tree should be managed, stored and used. Later the same day they asked that living people not be sealed off: "someone said you are in his tree, please see if that's true — then you have to confirm, and we could use KYC to prove identity", for a commercial product. §2.6 is the answer; it replaces the first draft's "living people are never matched".
- **Builds on:** ADR-0027 (accounts: schema `accounts`, role `nameatlas_app`, the second pool, terms accepted at sign-up completion), ADR-0026 §2.5 (living people, privacy, connecting trees), `ARCHITECTURE.md` §7 (the public / private boundary), `PRODUCT.md` §7.9, `docs/canonical/11` §28 (`FamilyPerson`, `FamilyBranch`), `docs/canonical/19` §4, §10, §11, §37, 19-A to 19-D.
- **Implemented by:** TASK-068 (the schema, the package and the contract, dark). The pages, invitations and claims, export, matching and verification are their own tasks (§5).
- **Preconditions:** TASK-049 (an off-host, restore-tested backup; ADR-0027 §4 makes it a precondition of the tree), TASK-062 and TASK-063 (accounts live), the terms version that carries the clause on living people.

## 1. Context

- ADR-0026 puts "a family tree the reader builds, with more inputs (parents, grandparents, places, dates, maiden names), which they may connect to other readers' trees" in the 29,99 zł tier, and sets three rules: living people only after the reader accepts terms that say so; a tree private to its owner and the people they invite; connections match only people who have died.
- The chosen design shows one tree in three views (a constellation, the tree on the map of Poland, a pedigree with an edit form), a dashboard that leads with the next empty slot, and marks each person as *ze źródła*, *wpisane przez Ciebie*, *żyje · prywatne* or *brak danych*. It draws nothing the reader did not enter, and leaves an empty slot empty.
- `docs/canonical/11` §28 reserved the objects: `FamilyPerson` with `privacy_class = SENSITIVE_FAMILY`, never indexable; `FamilyBranch`, a private grouping with relationship hypotheses; `CandidateRecord` and `EvidenceLink` for the bridge to the public evidence system, later. §1.4 of the same document: "surname-level, family-level and person-level evidence are separate scopes. The database must make cross-scope overclaiming difficult."
- `docs/canonical/19`: family data is workspace-scoped, has no public cache, "no cross-user dedup that exposes existence", a shorter explicit retention; an unknown living status is protected as living; 19-C wants an audit event for privileged operations; 19-D a `LivingStatus` of UNKNOWN, LIVING, DECEASED.
- ADR-0027 built the shape this extends: user data in its own schema, written and read by `nameatlas_app` only, no foreign key into the register, the terms version recorded on the account, deletion by cascade, nothing logged that names a person.
- The VM holds no copy of its data off-host and a restore has never been run (STATUS, TASK-049). An email and a hash can be re-entered; a tree cannot.

## 2. Decision

### 2.1 Where: schema `family`, same database, same role

1. The tree is in **schema `family`** of the production database, created by the next free migration, owned by the build role `nameatlas`, read and written by **`nameatlas_app`** and by nobody else. `ops/vm/accounts-roles.sql` gains the same grants for `family` as for `accounts` (usage; select, insert, update, delete; default privileges), and `nameatlas_web` gets none. A second schema rather than more tables in `accounts`, so that the privacy class is visible in the name and a future split of roles costs one grant file, not a move.
2. **No foreign key leaves the two private schemas except into `accounts.users`.** A person's birthplace is stored as the TERYT identifier string and the name as typed, not as a reference to `public.places`: the register knows nothing of the tree, and the tree can be dumped and restored without it. The page resolves a code to a name and coordinates through the read-only pool, in the same route handler, with no user id in that query.
3. **Not a graph database, not a document store, not a file.** A tree is a few hundred rows; PostgreSQL with two tables and a recursive query answers every view. `ARCHITECTURE.md` §8 keeps a graph database a non-goal.

### 2.2 What: five tables

```text
family.trees        tree_id, owner_user_id → accounts.users (cascade), title, root_person_id (null until set),
                    created_at, updated_at
family.persons      person_id, tree_id (cascade), given_names, surname, birth_surname (null),
                    birth_year (null), birth_year_approx, birth_place_code (TERYT, null), birth_place_text (null),
                    death_year (null), death_year_approx, death_place_code (null), death_place_text (null),
                    living_status  UNKNOWN | LIVING | DECEASED,
                    source_note (null), notes (null), created_by → accounts.users, created_at, updated_at
family.parentage    child_id → persons (cascade), parent_id → persons (cascade), role MOTHER | FATHER | PARENT,
                    created_at; unique (child_id, parent_id); check child_id <> parent_id
family.members      tree_id (cascade), user_id → accounts.users (cascade), role EDITOR | VIEWER,
                    sees_living boolean default false, invited_by, accepted_at; unique (tree_id, user_id)
family.audit_events event_id, tree_id (cascade), user_id (null on account deletion), kind, person_id (null),
                    at; no name, no date of birth, no free text
```

4. **Relationships are rows, not slots.** `parentage` links a child to a parent with a role. The pedigree's slots (ojciec, matka, their parents) and the Ahnentafel numbers are computed from the root person at read time, never stored, so a second marriage, a half-sibling or an unknown parent needs no special case: the row is there or it is not. At most two parents per child and no cycle, both checked by the service inside the write transaction (a recursive query over the tree, which is small).
5. **Living status is a column with the canonical rule.** `UNKNOWN` is treated as `LIVING` wherever it matters: who may see the person, whether the person may ever be matched. A death year set makes the status `DECEASED` (a check constraint). Nothing infers death from an old date.
6. **Provenance is one of two words in the first release.** A person is *wpisane przez Ciebie*; `source_note` lets the reader cite where they know it from ("akt urodzenia, parafia Szczebrzeszyn, 1937") without a file. *Ze źródła* (a document attached) waits for uploads (D-027): an upload needs object storage in the EU, encryption, a size cap and a virus check, which is its own ADR, and the tree does not need it to be useful.
7. **The reader's own family data never becomes a `Claim`.** The truth layer (`Source → … → Claim`) is for surname evidence. `docs/canonical/11` §28's bridge (`CandidateRecord`, `EvidenceLink`) is not built here; when it is, it links a person to a public record, and the record stays a record.

### 2.3 Who may read: the session, then the row

8. **Every query names the tree and the user.** A route reads the session as ADR-0027 does, then reads or writes only trees the user owns or is a member of. A member with `sees_living = false` is served the tree with living and unknown people removed, server-side, before anything is rendered; the response carries the count removed and nothing else about them.
9. **Row-level security as the second lock.** Each `family` table gets a policy keyed on `current_setting('app.user_id', true)`; the service sets it with `SET LOCAL` inside every transaction (PgBouncer's transaction mode keeps it to that transaction). A query with the wrong `tree_id` then returns nothing rather than someone else's family. The integration test proves it as `tests/integration/src/accounts.test.ts` proves the role grants.
10. **Sharing is explicit, per tree, per person invited.** Invitations go to an email through the accounts mailer with a one-use token stored as SHA-256 (the pattern of `accounts.email_tokens`), and are accepted only by a signed-in account. Living people are hidden from a member until the owner turns `sees_living` on for that member, and a living person who has confirmed their own card (§2.6) decides field by field what any member sees. There is no public link to a tree and never a search-engine-visible one.
11. **Audit events for the operations that change who sees what:** member added or removed, `sees_living` changed, a person's living status changed, an export, a tree deleted. Ids and kinds only.

### 2.4 Consent, retention, erasure

12. **Living people need the terms clause.** The terms version that introduces the clause is recorded in code; a tree may hold a `LIVING` or `UNKNOWN` person only for an owner whose `accounts.users.terms_version` is that version or later. An owner on an older version is asked to accept again before the first such person is saved (ADR-0027 §2.9 already provides for a changed version). The one-time "Ta osoba żyje?" step in the design is the moment this is checked.
13. **Deleting the account deletes its trees**, their people, parentage, memberships and audit rows, by cascade (ADR-0027 §2.10). A member of someone else's tree loses access when that owner deletes; nothing is copied to them. Deleting a tree is its own action with the same effect.
14. **Export is a reader's right and a feature.** `GET /api/v1/trees/{id}/export` answers the tree as JSON in the contract's shape; GEDCOM 7 follows when asked for. An export is an audit event.
15. **Retention is the account's.** A tree lives as long as the account that owns it; there is no separate expiry. D-028, answered 2026-10-01: never; a tree is deleted only with its account or by its owner.

### 2.5 What reads it: one response, three views

16. **One contract object, `tree`,** answered by `GET /api/v1/trees/{id}`: the tree, its people (each with `living_status` and the derived `treated_as_living`), its parentage, the members the caller may know about, and for each distinct `birth_place_code` the name and coordinates resolved from the register. The browser derives everything else: the constellation, the map, the pedigree, the Ahnentafel numbers, the generation lanes, and the dashboard's "next question" (the first empty parent slot found breadth-first from the root). No view is stored.
17. **The surname is the product's tie-in.** For each surname in the tree the response may carry the public surname page's slug, resolved through the read-only pool with no user id in the query. The page shows it under `PRODUCT.md` §7's words: the surname's figures, never the family's; "shares the surname, not your relative".
18. **Connecting trees has two doors, and the living open theirs themselves.** For people who have died: a match index built only from `DECEASED` rows; a match is a proposal shown to both owners ("może to ta sama osoba"), never a merge; a confirmed link is a row between two person rows, each tree keeping its own (`docs/canonical/19` §37's "no cross-user dedup that exposes existence" is why the index holds no living or unknown person). For a living person: no index, no proposal to the owners; the person who has confirmed their card in both trees (§2.6) is told, and only they can join the two. Neither door is in the first release.
19. **The tree is paid (D-029, answered 2026-10-01).** ADR-0026 places it in the 29,99 zł tier, which cannot be sold until the owner's items in ADR-0023 §2.5 exist; until then the tree is built and tested and shown to nobody.

### 2.6 Claimed people: the living person decides

A living person in a tree starts as the owner's note about a relative. The product's answer to "someone says you are in their tree" is to make that person a participant, not a subject, and to let nothing about them travel before they have said "to ja". This is also the commercial engine: every confirmed relative is a new account with a reason to build. Every rule below needs the legal review `docs/canonical/19` §11 requires before it goes live; the design is written so that the review has something concrete to pass or fail.

20. **An invitation is one email, sent at the owner's request, and it names only the owner.** The owner types the address into the invitation, ticks that the person knows and agrees to the address being passed on (what MyHeritage's policy asks of its users), and the address is used for that one message and not stored on the person row. The mail says who invites and that a private tree exists. It carries no relationship, no date, no place. There are no reminders. An owner may send ten invitations a month per tree and one per person; a person whose birth year makes them under 18 cannot be invited.
21. **The invited person sees their own row, and nothing else, after signing in.** Name, birth year, birthplace and parents' names as the owner wrote them: the data is about the reader, which is the one case where showing it is a right rather than a leak. Three answers: *To ja*, *To nie ja*, *Nie chcę kontaktu*. The owner learns the answer and never whether the mail was opened.
22. ***To ja* claims the row.** `family.persons` gains `claimed_by_user_id` (one account per row, one row per tree per account) and `claimed_at`. From then on the claimant may correct the row's fields and hide any field from the owner and the members (the owner sees that a field is hidden, not what it holds); the owner may no longer edit the claimant's fields, only the relationships. A claim is an audit event. The claimant may *leave* the tree at any time: the claim is removed and the row returns to the owner's note, with no further invitation to that address.
23. ***To nie ja* and *Nie chcę kontaktu* end contact.** Both put the SHA-256 of the address on a per-tree suppression list, so the owner cannot invite it again. *Nie chcę kontaktu* also marks the row `contact_declined`: it stays visible to the owner alone, is never shown to a member, and can never be matched. What the owner may keep of a relative who objects is D-031, answered 2026-10-01: this, subject to the legal review `docs/canonical/19` §11 requires.
24. **A claimed person is their own bridge between trees.** When one account has confirmed its card in two trees, the system tells that person, and only them, that the two trees meet at them; they may connect the trees. The owners see that a connection is possible, not with whom, until the person joins them. Deceased ancestors then appear in the other tree as links, not copies; living people are never copied by a connection, each must confirm their own card in the other tree.
25. **Identity verification is for one feature and for disputes, not for signing up.** A free account's word is enough to claim a card that someone who knows them invited them to: the invitation itself is the trust. Verification (an eIDAS-grade proof of name and birth date; in Poland mObywatel's confirmation for businesses, a bank-based identity such as mojeID, or a commercial provider; D-030, answered 2026-10-01: mObywatel through an integrator, a bank identity as the fallback, each read on the day) unlocks two things: *Czy jestem w czyimś drzewie?*, a search for oneself across other people's trees, answered only to the verified person and only about themselves (the right of access, Article 15, made into a feature: "you are in one tree; the owner's initials are T. W.; send a request"), and the resolution of a dispute when two accounts claim one row. The product stores the provider's reference, the verified name and birth date and the date; never the document, the image or the PESEL number. Verification is included in the 29,99 zł tier (the owner's decision of 2026-10-01: "included"); it is not sold on its own.
26. **The three things a living person's data never does, whoever has verified what:** it does not appear in a search by anyone but the person themselves; it is not proposed as a match to any owner; it does not leave the tree it was written in without that person's own act.

## 3. Why not the alternatives

- **A JSON document per tree.** One column, no joins, and every rule above (two parents, no cycle, hide the living, audit) becomes application code over an opaque blob that RLS cannot see into and a restore cannot check. Rows cost one migration and give every rule a constraint.
- **Fixed father and mother columns on the person.** Simpler for the pedigree and wrong for everything else: an adoptive parent, a parent of unknown role, a person entered twice. The Ahnentafel view reads the same either way.
- **A hosted "family tree" backend or a GEDCOM file as the store.** GEDCOM is an exchange format with no notion of who may see a living person; it is the export, not the truth.
- **Encrypting names in the database with an application key.** Canonical 19 §37 says "encrypted"; the VM's disk and the backups are, and the role split keeps the register's role out. Column encryption would stop the server from hiding living people by rule or matching the dead by surname, and the key would sit in the same Vercel environment as the connection string. Reconsider when there is a key store the app does not hold.
- **Sealing living people off entirely (the first draft).** Safe, and it makes a tree a solitary document; the market's trees grow because relatives are asked in. The claim model keeps the safety where it matters (nothing travels before "to ja") and gives the person more control than they have today in any competitor's tree: they edit and hide their own fields.
- **Verifying everyone's identity at sign-up.** Costly per account, a high-risk processing of identity documents for a free product, and it would not stop a relative being wrong about a date. Verification is sold to the person who wants to search for themselves, and used to settle the rare dispute.
- **Letting owners search for living relatives by name across trees.** This is a people-finder (`docs/canonical/19` §11), and the one thing the design refuses.
- **Uploads in the first release.** See §2.2.6: it doubles the surface (object storage, encryption, scanning, EU residency, a second backup) for a chip.

## 4. Consequences

- `ARCHITECTURE.md` §7's table gains the tree in its private column, and §8 a line that `family` is read by the same role as `accounts`.
- TASK-049's restore drill must compare the `accounts` and `family` schemas as well as the register, or a restore of the register alone would be a restore of nothing a reader wrote.
- The privacy notice and the terms change in the same change as the first tree page: the categories stored, the living-people clause, invitations, export, deletion, and that family data never reaches analytics (`analytics-path.ts` already drops the query string; tree routes carry ids only).
- `docs/contracts/` gains `tree` (schema 1.11 or later), with every field above and its nullability.
- The accounts library's session check becomes the entry of every tree route; `packages/family` (a new workspace package) holds the service, the cycle check and the hiding of the living, with tests of the same shape as `packages/accounts`.
- `family.persons` gains `claimed_by_user_id`, `claimed_at` and `contact_declined`; a `family.invitations` table (tree, person, token hash, expiry, sent by) and a `family.suppressions` table (tree, address hash) come with the invitation feature; a `family.verifications` table (user, provider, reference, verified name, birth date, verified at) with the search-for-yourself feature. None is in the first task.
- The next free migration number is taken from `main` and open pull requests at the time of the task, not from this ADR.

## 5. What goes first, and the decisions it waits on

1. TASK-049, the backup with its restore drill (STATUS already orders it before the tree).
2. TASK-062 and TASK-063, accounts live, with the terms version that carries the clause on living people.
3. D-027 (documents) stays open; D-028 to D-031 were answered on 2026-10-01 (the header).
4. Then one task for the schema, the package and the contract, dark; one for the pages (the dashboard, the consent step, the Rodowód view with its form, the phone flow); then the Konstelacja and Mapa views; then invitations and claims (§2.6.20–24); then export; then the deceased match index; then verification and the search for oneself (§2.6.25).
