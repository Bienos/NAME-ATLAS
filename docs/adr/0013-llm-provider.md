# ADR-0013 — LLM provider

- **Status:** Accepted
- **Date:** 2026-09-24
- **Deciders:** project owner
- **Depends on:** ADR-0001 (TypeScript/Node.js P0 stack)
- **Numbering:** first recorded as "ADR-0003" on branch `claude/quirky-babbage-7ps0xa`. That branch was based on an old commit and never merged, and on `main` ADR-0003 is SourceRecord granularity. Renumbered to the next number free on `main` and in open pull requests (ADR-0012 is taken by pull request #7). The decision is unchanged. The first bullet under "Not changed by this ADR" was rewritten, because on `main` M2 is already complete.

## Context

`ARCHITECTURE.md` §4 allows an LLM to structure or synthesise evidence and forbids it from assigning final confidence. `PLAN.md` sequences LLM work after the M2 truth pipeline. Neither names a provider, so the first task that needs an LLM would otherwise have to choose one. On 2026-09-24 the project owner supplied an OpenAI API key and chose OpenAI.

## Decision

**OpenAI is the LLM provider.**

- **Credential.** One environment variable, `OPENAI_API_KEY`, read from the environment at call time. It is never committed, never logged, and never written to the database or to any provenance record. `.env.example` documents the name only; a real value lives in a gitignored `.env` locally or in the cloud environment's settings.
- **Where it runs.** Server-side only: `apps/worker`, or server code in `apps/web` / `apps/admin`. The key never reaches a browser bundle.
- **What it may do.** Only what `ARCHITECTURE.md` §4 allows. LLM output is never truth: it does not set a `ConfidenceAssessment`, a rights decision, a count or any other `Claim.structured_value`.
- **Left to the first task that calls an LLM:** the model, whether to use the `openai` SDK or plain `fetch`, prompts, and cost limits.

## Not changed by this ADR

- `PLAN.md` sequences LLM work after the M2 truth pipeline ("No LLM before the M2 truth pipeline exists"). On `main` M2 is complete, so that rule no longer holds LLM work back. This ADR still starts none: it picks the provider only, and the first use of an LLM needs its own task file.
- No LLM code and no `openai` dependency is added.

## Consequences

- The first LLM task uses OpenAI and `OPENAI_API_KEY` without reopening the provider question.
- CI does not hold the key, so tests stub the provider rather than call the real API.
- Cloud sessions see the key only when it is set in the environment's settings; a `.env` written inside a session container does not outlive it.

## Do not revisit unless

- The legal/privacy review for commercial use (`PLAN.md`, parallel track) finds OpenAI's data-handling or terms unsuitable.
- The project owner changes provider.
