# SECOND CLAUDE PROMPT — IMPLEMENT TASK-001 FOUNDATION

Use this only AFTER the control-plane session has been reviewed and committed.

Implement `tasks/001-project-foundation.md`.

Follow `AGENTS.md`.

Start by reading:

1. `tasks/001-project-foundation.md`
2. `PROGRESS.md`
3. `ARCHITECTURE.md`
4. `docs/adr/0001-stack.md`
5. `docs/adr/0002-db-access.md`
6. only canonical documentation explicitly required by TASK-001
7. current git status/diff

Perform a targeted read-only preflight before editing.

Implement only the minimum production-shaped foundation required by TASK-001.

Do not implement:

- surname resolver;
- PESEL source logic;
- PESEL ingestion;
- SourceRecord domain logic;
- EvidenceItem;
- Claims;
- ConfidenceAssessment;
- Citation;
- Polona;
- historical research;
- Redis/BullMQ unless TASK-001 explicitly and demonstrably requires it;
- Stripe;
- premium reports;
- SEO.

Before completion run every verification command required by TASK-001.

At minimum verify:

```text
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
pnpm build
```

Also verify that the development/test PostgreSQL environment can enable:

- PostGIS
- `pg_trgm`

Before stopping:

1. inspect the complete git diff;
2. remove unrelated changes;
3. update `docs/CODEMAP.md` if structure changed;
4. update `PROGRESS.md` with observed facts only;
5. report actual commands and actual results;
6. STOP.

Do not create or implement TASK-002.
