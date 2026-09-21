# TASK-018 — read-only admin surname inspector

- **Status:** IMPLEMENTED 2026-09-21. All eight acceptance criteria met; see `PROGRESS.md`.
- **Milestone:** M2. Its description names "a read-only internal inspector"; this is that and nothing more.
- **Depends on:** everything already built. It reads; it adds no claim type, no migration, no contract.
- **Canonical basis:** `docs/canonical/22` §17 (the surname inspector), §18 (search candidates are
  labelled as not evidence), §6 (staff authentication) — and the honest gap around §6, below.

## 1. Goal

Answer "where did this number come from?" without SQL. One page: type a surname, see the whole chain
— `Source → SourceRecord → DistributionSnapshot → EvidenceItem → Claim → ConfidenceAssessment →
Citation` — plus the rights in force and which source record is authoritative.

It exists because the public page shows a figure and nothing else explains it. D-018 was found by
noticing a duplicate count and then writing SQL by hand; this is the tool that would have shown it.

## 2. Fails closed, because staff authentication does not exist

`docs/canonical/22` §6 requires staff authentication and §11–§13 a role model. **None of it exists.**
An unauthenticated console over internal evidence is not something to ship quietly, so the inspector
refuses to run unless `ADMIN_INSPECTOR_ENABLED=true` is set, and says why. That is a lock on a door
that has no lock yet — not a substitute for §6, and the page says so in as many words.

## 3. In scope

1. **One page**, `/`, read-only. A `GET` form; no mutation, no command, no merge, no re-derivation.
2. **The trace**, in sections: identity; source records with their registry status; snapshots and
   values; claims **of every status**, because a `SUPERSEDED` claim is exactly what an inspector is
   for after D-018; evidence per claim with its lineage roles; confidence with its assessment method
   *and* its internal rationale, which is internal and may be shown here; citations; rights.
3. **Registry authority marked explicitly**: for each source record, whether its `content_hash`
   matches the registry and its row count matches — the D-018 decision, made visible.
4. **Search candidates are not shown.** `docs/canonical/22` §18 requires them to be visually
   distinct and labelled "not evidence and not an accepted surname form". They are ephemeral value
   objects that are never persisted (canonical/13 §18.2), so there is nothing to inspect; a panel
   implying otherwise would be worse than its absence.
5. Facts only: raw values, no interpretation, no derived figure computed here.

## 4. Out of scope

Authentication, roles, RBAC/ABAC, audit log, merge, split, unmerge, connector operations, rights
console, schema drift, coverage, premium eligibility, SEO, reports, tabs, tables with sorting and
pagination, and every other section of `docs/canonical/22`. Each is its own task.

## 5. Acceptance criteria

- **AC-1** Without `ADMIN_INSPECTOR_ENABLED=true` the page renders a refusal and performs no query.
- **AC-2** With it set, a surname renders its identity, source records, snapshots, claims of every
  status, evidence, confidence, citations and rights.
- **AC-3** A `SUPERSEDED` claim is shown, labelled, and distinguishable from an `ACTIVE` one.
- **AC-4** Each source record states whether it matches the registry checksum and row count.
- **AC-5** The page issues no write: asserted by counting rows before and after.
- **AC-6** An unknown surname renders "not found", never an empty page or a crash.
- **AC-7** No search-candidate panel exists.
- **AC-8** `pnpm build` passes and the page is server-rendered with no client bundle.

## 6. Verification

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
TEST_DATABASE_URL=… pnpm test:integration
pnpm build
ADMIN_INSPECTOR_ENABLED=true DATABASE_URL=… pnpm --filter admin run dev   # /?surname=NOWAK
```

## 7. Do not

- Do not add a write, a command or a re-derivation trigger.
- Do not ship it reachable without §6's authentication, and do not let the flag imply that it is.
- Do not compute a figure here; show what is stored.
- Do not hide a superseded claim. Showing it is the point.
