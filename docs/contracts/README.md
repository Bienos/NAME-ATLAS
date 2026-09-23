# docs/contracts/

Accepted API and data contracts. Empty until the first contract is accepted.

## What belongs here

A document describing a contract that code on both sides must honour: request/response shapes, state machines, error taxonomy, versioning and compatibility rules.

Canonical **contract semantics** are specified in `docs/canonical/16` (API and frontend data contract). Documents here record what has actually been accepted and implemented for this repository, and they reference the canonical document rather than restating it.

## What does not belong here

- Runtime schema code. That lives in `packages/contracts` once it exists (see `docs/CODEMAP.md`).
- Product promises — `PRODUCT.md`.
- System boundaries — `ARCHITECTURE.md`.
- Technical decisions — `docs/adr/`.

## Rules

- One file per contract, named for the resource it covers (e.g. `surname-search.md`).
- A contract is added or changed only by the task that implements the change, in the same change.
- Breaking a published contract requires a version bump and a stated compatibility window.
- A task session reads only the contracts its task file references (`AGENTS.md` §4).

Accepted: `surname-result.md` (TASK-006) and `surname-prefix.md` (suggest-as-you-type, 2026-09-23).
