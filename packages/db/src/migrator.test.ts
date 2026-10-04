import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { MIGRATIONS_DIR } from "./migrator.js";

describe("MIGRATIONS_DIR", () => {
  it("resolves to an existing directory containing exactly the migrations added so far, in order", () => {
    // One entry per task that added schema; a migration appearing here
    // before the task that owns it is scope creep (AGENTS.md §6).
    expect(fs.existsSync(MIGRATIONS_DIR)).toBe(true);
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".ts"));
    expect(files).toEqual([
      "0001_bootstrap_extensions.ts", // TASK-001
      "0002_identity_core.ts", // TASK-003
      "0003_source_rights_distribution.ts", // TASK-004
      "0004_truth_layer.ts", // TASK-005
      "0005_current_rank.ts", // TASK-009
      "0006_canonical_key_v2.ts", // D-013 / ADR-0005
      "0007_script_flags.ts", // TASK-010 / D-014
      "0008_pesel_rights_decision.ts", // D-007
      "0009_rarity_context.ts", // TASK-014 / U-6
      "0010_places_core.ts", // TASK-011 / D-004
      "0011_current_distribution.ts", // TASK-012
      "0012_surname_trigram_index.ts", // TASK-015 / ADR-0006
      "0013_runtime_outbox.ts", // TASK-020 / canonical 15 MCP 15-C
      "0014_surname_meaning.ts", // TASK-022 / ADR-0008
      "0015_surname_meaning_scope.ts", // TASK-022 — separate: a new enum value cannot be used in its own transaction
      "0016_citations_per_source_record.ts", // TASK-022 — a multi-sourced claim cites every work
      "0017_surname_slug_lookup_index.ts", // TASK-024 / ADR-0009 — slug lookup without a scan
      "0018_surname_slugs.ts", // TASK-027 / ADR-0010 — the persisted slug, resolving D-019
      "0019_snapshot_profile_to_source_record.ts", // TASK-030 — 1 GB of repeated text, normalised
      "0020_surname_fold_prefix_index.ts", // suggest-as-you-type — diacritic-folded prefix search
      "0021_current_rank_top_index.ts", // home page — the most common surnames, from rank claims
      "0022_universe_evidence_lookup_index.ts", // TASK-036 — the universe evidence item, without a scan
      "0023_administrative_memberships.ts", // TASK-039 — the TERC/SIMC place hierarchy
      "0024_distribution_shift.ts", // TASK-051 / ADR-0020 — SURNAME_DISTRIBUTION_SHIFT
      "0025_archive_availability.ts", // TASK-054 — the ARCHIVE_AVAILABILITY claim type
      "0026_rank_neighbours_index.ts", // TASK-055 — a surname's neighbours on its list
      "0027_accounts_schema.ts", // TASK-061 / ADR-0027 — free accounts, in their own schema
      "0028_family_schema.ts", // TASK-066 / ADR-0029 — the family tree, in its own schema
      "0029_notable_bearers.ts", // TASK-073 / ADR-0030 — the NOTABLE_BEARERS claim type
      "0030_family_safeguards.ts", // the #76 review — one mother and one father; editors move updated_at
      "0031_given_names.ts", // TASK-078 / ADR-0032 — given names, apart from surnames
      "0032_accounts_google_identities.ts", // TASK-084 / ADR-0033 — Google sign-in
      "0033_family_invitations.ts", // TASK-094 / ADR-0029 §2.6 — invitations and claims
      "0034_family_person_count.ts", // TASK-111 / ADR-0037 — the free tree's 5-person cap
    ]);
  });
});
