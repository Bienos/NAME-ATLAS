#!/usr/bin/env tsx
/**
 * Measures fuzzy retrieval against the real register (TASK-015 AC-9).
 *
 *   pnpm measure:fuzzy-recall
 *   pnpm measure:fuzzy-recall --sample 40
 *
 * This exists so the feature's recall is a **recorded number rather than a
 * claim**. It takes real surnames from the ingested register, applies one edit
 * of each class, and reports — per input length and per similarity threshold —
 * how often the intended surname is retrieved at all and how often the
 * Damerau rerank puts it first.
 *
 * It is a measurement tool, not a test: it needs the full register, which is
 * not committed, so it cannot run in CI. Its output belongs in `PROGRESS.md`.
 *
 * Every perturbed string is derived from a real surname by a single mechanical
 * edit. No surname here is invented.
 */
import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { sql } from "kysely";
import { damerauLevenshtein, hasAdjacentTransposition } from "../src/distance.js";

/** Similarity thresholds to sweep. Wider than any table would ship. */
const THRESHOLDS = [0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5] as const;

/** Length buckets, following docs/canonical/13 §21's own bands. */
const BUCKETS: readonly { readonly label: string; readonly min: number; readonly max: number }[] = [
  { label: "4-5", min: 4, max: 5 },
  { label: "6-8", min: 6, max: 8 },
  { label: "9-11", min: 9, max: 11 },
  { label: "12+", min: 12, max: 60 },
];

/**
 * Whether to prefer a detected adjacent transposition at equal edit distance.
 * Set by `--no-transposition-preference` so the rule's effect on recall can be
 * measured rather than assumed.
 */
const PREFER_TRANSPOSITION = !process.argv.includes("--no-transposition-preference");

/** The DB shortlist cap (docs/canonical/13 §21.1). */
const SHORTLIST_CAP = 25;

type EditClass = "transposition" | "substitution" | "deletion" | "insertion";

const EDIT_CLASSES: readonly EditClass[] = [
  "transposition",
  "substitution",
  "deletion",
  "insertion",
];

/** One single edit, applied at the middle of the string for determinism. */
function perturb(key: string, kind: EditClass): string | null {
  const chars = [...key];
  const i = Math.floor(chars.length / 2);
  switch (kind) {
    case "transposition": {
      if (i + 1 >= chars.length) return null;
      const swapped = [...chars];
      const left = swapped[i]!;
      const right = swapped[i + 1]!;
      swapped[i] = right;
      swapped[i + 1] = left;
      const out = swapped.join("");
      return out === key ? null : out;
    }
    case "substitution": {
      const replacement = chars[i] === "x" ? "q" : "x";
      const out = [...chars.slice(0, i), replacement, ...chars.slice(i + 1)].join("");
      return out === key ? null : out;
    }
    case "deletion":
      if (chars.length < 5) return null;
      return [...chars.slice(0, i), ...chars.slice(i + 1)].join("");
    case "insertion":
      return [...chars.slice(0, i), "x", ...chars.slice(i)].join("");
  }
}

function parseSample(argv: readonly string[]): number {
  const at = argv.indexOf("--sample");
  if (at === -1) return 30;
  const value = Number(argv[at + 1]);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("--sample takes a positive integer");
  }
  return value;
}

async function main(): Promise<void> {
  const perBucket = parseSample(process.argv.slice(2));
  const db = createDb(createPool(loadDbConfig()));
  try {
    const total = await sql<{ n: string }>`SELECT count(*)::text AS n FROM surnames`.execute(db);
    console.log(`[measure] corpus            ${Number(total.rows[0]?.n ?? 0)} surnames`);
    console.log(`[measure] sample per bucket ${perBucket} surnames x 4 edit classes`);
    console.log(`[measure] shortlist cap     ${SHORTLIST_CAP}`);

    for (const bucket of BUCKETS) {
      // Real surnames by descending national count, so the sample is the
      // register's own common names rather than an alphabetical slice.
      const sample = await sql<{ canonical_key: string }>`
        SELECT n.canonical_key
        FROM distribution_snapshots s
        JOIN distribution_values v
          ON v.distribution_snapshot_id = s.distribution_snapshot_id
        JOIN surnames n ON n.surname_id = s.surname_id
        WHERE s.comparability_group = 'pesel_2026_national_male'
          AND v.place_id IS NULL
          AND length(n.canonical_key) BETWEEN ${bucket.min} AND ${bucket.max}
        ORDER BY v.count DESC
        LIMIT ${perBucket}
      `.execute(db);

      const cases: { target: string; input: string; kind: EditClass }[] = [];
      for (const row of sample.rows) {
        for (const kind of EDIT_CLASSES) {
          const input = perturb(row.canonical_key, kind);
          if (input !== null) cases.push({ target: row.canonical_key, input, kind });
        }
      }

      console.log(`\n[measure] -- length ${bucket.label} -- ${cases.length} cases --`);
      console.log(
        "[measure]   thr  retrieved  rerank_1st  trigram_1st  mean_list  median_list  transp_1st",
      );

      for (const threshold of THRESHOLDS) {
        let retrieved = 0;
        let rerankFirst = 0;
        let trigramFirst = 0;
        let transpositionCases = 0;
        let transpositionFirst = 0;
        const sizes: number[] = [];

        for (const one of cases) {
          const shortlist = await db.transaction().execute(async (trx) => {
            await sql`SET LOCAL pg_trgm.similarity_threshold = ${sql.lit(threshold)}`.execute(trx);
            const rows = await sql<{ canonical_key: string; sim: number }>`
              SELECT canonical_key, similarity(canonical_key, ${one.input}) AS sim
              FROM surnames
              WHERE canonical_key % ${one.input}
              ORDER BY similarity(canonical_key, ${one.input}) DESC, canonical_key
              LIMIT ${SHORTLIST_CAP}
            `.execute(trx);
            return rows.rows;
          });

          sizes.push(shortlist.length);
          if (one.kind === "transposition") transpositionCases += 1;
          const index = shortlist.findIndex((row) => row.canonical_key === one.target);
          if (index === -1) continue;
          retrieved += 1;
          if (index === 0) trigramFirst += 1;
          const reranked = [...shortlist].sort((x, y) => {
            const dx = damerauLevenshtein(one.input, x.canonical_key);
            const dy = damerauLevenshtein(one.input, y.canonical_key);
            if (dx !== dy) return dx - dy;
            if (PREFER_TRANSPOSITION) {
              // At equal distance a transposition is the more diagnostic
              // signal: swapping two adjacent letters is a typing slip, while
              // a deletion at the same distance may be a different surname.
              const tx = hasAdjacentTransposition(one.input, x.canonical_key);
              const ty = hasAdjacentTransposition(one.input, y.canonical_key);
              if (tx !== ty) return tx ? -1 : 1;
            }
            if (x.sim !== y.sim) return y.sim - x.sim;
            return x.canonical_key.localeCompare(y.canonical_key);
          });
          if (reranked[0]?.canonical_key === one.target) {
            rerankFirst += 1;
            if (one.kind === "transposition") transpositionFirst += 1;
          }
        }

        const sorted = [...sizes].sort((a, b) => a - b);
        const mean = sizes.reduce((s, n) => s + n, 0) / (sizes.length || 1);
        const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
        console.log(
          `[measure]  ${threshold.toFixed(2)}  ` +
            `${String(retrieved).padStart(4)}/${cases.length}  ` +
            `${String(rerankFirst).padStart(5)}/${cases.length}  ` +
            `${String(trigramFirst).padStart(6)}/${cases.length}  ` +
            `${mean.toFixed(1).padStart(8)}  ${String(median).padStart(10)}  ` +
            `${String(transpositionFirst).padStart(5)}/${transpositionCases}`,
        );
      }
    }
  } finally {
    await db.destroy();
  }
}

main().catch((err: unknown) => {
  console.error("[measure] unexpected error:", err);
  process.exitCode = 1;
});
