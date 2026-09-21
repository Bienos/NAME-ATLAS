# `fixtures/onomastics/` — synthetic test fixtures only

**Nothing in this directory is real.** Both files are invented, and they exist to exercise the
`SURNAME_MEANING` chain (TASK-022) end to end where no licensed onomastic corpus exists.

- The works do not exist. The authors do not exist.
- Every gloss is the literal string `PLACEHOLDER GLOSS …`. No file here contains a claim about the
  origin of a Polish surname, and none may be added.
- Both files carry `"synthetic": true`, and `importOnomasticSource` **refuses** a synthetic file
  unless the caller passes `allowSynthetic: true` (ADR-0008 §6). Only tests pass it, so a fixture
  cannot become a production claim by accident.

`synthetic-test-work-b.json` agrees with `synthetic-test-work.json` about `KOWALCZYK` and disagrees
about `NOWAK`, which is how the integration suite reaches `LIKELY` and `CONFLICTING` from real stored
rows rather than from a mock.

## Adding a real source

A real onomastic source does **not** belong here. It is imported as its own file with
`"synthetic": false`, and must satisfy ADR-0008 §4's four admissibility conditions — citable work,
rights permitting the surface, reliability tier `C_SCHOLARLY_SECONDARY` or better, and a stated
licence basis. The parser enforces all four and refuses anything short of them.
