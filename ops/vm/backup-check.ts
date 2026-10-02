import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { createPool, createDb } from "../../packages/db/src/index.js";
import { querySurnameResult } from "../../packages/truth/src/query.js";
import { surnameResultResponseSchema } from "../../packages/contracts/src/surname-result.js";

// Run from the same checkout for both sides of the restore drill. The manifest
// holds aggregate counts and a public surname payload, never private rows.
async function run(): Promise<void> {
  const pool = createPool(
    { databaseUrl: process.env["DATABASE_URL"] ?? "" },
    { connectionTimeoutMillis: 10_000 },
  );
  const db = createDb(pool);
  const mode = process.argv[2];
  const client = await pool.connect().catch(() => null);
  try {
    if (!client) throw new Error("connection failed");
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const snapshot = await client.query<{ id: string }>("SELECT pg_export_snapshot() AS id");
    const counts: Record<string, string | null> = {};
    for (const table of [
      "public.surnames",
      "accounts.users",
      "accounts.sessions",
      "accounts.email_tokens",
      "accounts.sign_in_failures",
      "family.trees",
      "family.persons",
      "family.parentage",
      "family.members",
      "family.audit_events",
    ]) {
      const exists = await client.query<{ id: string | null }>(
        "SELECT to_regclass($1)::text AS id",
        [table],
      );
      counts[table] =
        exists.rows[0]?.id == null
          ? null
          : ((await client.query<{ n: string }>(`SELECT count(*)::text AS n FROM ${table}`)).rows[0]
              ?.n ?? null);
    }
    const claims = await client.query<{ claim_type: string; n: string }>(
      "SELECT claim_type::text, count(*)::text AS n FROM public.claims WHERE claim_status = 'ACTIVE' GROUP BY claim_type ORDER BY claim_type",
    );
    const surname = process.env["BACKUP_SAMPLE_SURNAME"] ?? "ZAREMBA";
    const outcome = await querySurnameResult(db, surname);
    if (outcome.kind !== "OK" || outcome.response.status !== "RESOLVED") {
      throw new Error("sample surname could not be read");
    }
    const manifest = {
      counts,
      claims: claims.rows,
      surname,
      payload: surnameResultResponseSchema.parse(outcome.response),
    };
    if (mode === "snapshot") {
      // Keep this transaction open until pg_dump --snapshot finishes. Accounts
      // may change meanwhile; the dump and these counts still describe one instant.
      const released = new Promise<void>((resolve) => {
        process.stdin.once("data", () => resolve());
        process.stdin.once("end", () => resolve());
      });
      process.stdout.write(`${snapshot.rows[0]?.id ?? ""}\n${JSON.stringify(manifest)}\n`);
      await released;
    } else if (mode === "verify" && process.argv[3]) {
      const expected: unknown = JSON.parse(readFileSync(process.argv[3], "utf8"));
      if (!isDeepStrictEqual(expected, manifest))
        throw new Error("restored counts or sample payload differ");
      process.stdout.write("[backup-check] restored counts and surname payload match\n");
    } else {
      throw new Error("use snapshot or verify <manifest>");
    }
    await client.query("ROLLBACK");
  } catch {
    process.stderr.write(
      "[backup-check] verification failed; no private data or connection details printed\n",
    );
    process.exitCode = 1;
  } finally {
    client?.release();
    await db.destroy();
  }
}

void run().catch(() => {
  process.stderr.write(
    "[backup-check] verification failed; no private data or connection details printed\n",
  );
  process.exitCode = 1;
});
