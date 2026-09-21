import { createDb, createPool, loadDbConfig } from "@name-atlas/db";
import { createLogger } from "@name-atlas/logging";
import { canonicalKey } from "@name-atlas/resolver";
import { inspectorEnabled, inspectSurname } from "../lib/inspect.js";
import type { Inspection } from "../lib/inspect.js";
import { InspectionView } from "../lib/inspector-view.js";

/**
 * The read-only surname inspector (TASK-018).
 *
 * **It fails closed.** `docs/canonical/22` §6 requires staff authentication and
 * §11–§13 a role model, and none of it exists. So the page refuses to query
 * anything unless `ADMIN_INSPECTOR_ENABLED=true` is set, and says why. That is a
 * lock on a door that has no lock yet, not a substitute for §6, and the banner
 * below says so where nobody can miss it.
 *
 * Read-only throughout: `inspectSurname` runs inside a `READ ONLY` transaction,
 * and this page offers no command, no re-derivation and no mutation.
 */

export const dynamic = "force-dynamic";

interface PageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

type Answer =
  | { readonly kind: "NONE" }
  | { readonly kind: "FAILED" }
  | { readonly kind: "INSPECTION"; readonly inspection: Inspection };

async function inspect(query: string): Promise<Answer> {
  if (query === "") return { kind: "NONE" };
  // An internal tool, so the inspected key *is* logged: it is a surname from the
  // public register chosen by a staff member, not a visitor's search term, and
  // knowing which surname an inspection covered is the point of the line.
  const log = createLogger({ service: "admin", base: { route: "/" } });
  const startedAt = Date.now();
  let db: ReturnType<typeof createDb> | null = null;
  try {
    db = createDb(createPool(loadDbConfig()));
    // The resolver's own key function, so the inspector cannot disagree with the
    // thing it is inspecting about what a surname's identity is.
    const key = canonicalKey(query);
    const inspection = await inspectSurname(db, key);
    log.info("inspection_completed", {
      canonical_key: key,
      found: inspection.kind === "FOUND",
      claims: inspection.kind === "FOUND" ? inspection.claims.length : 0,
      source_records: inspection.kind === "FOUND" ? inspection.source_records.length : 0,
      ms: Date.now() - startedAt,
    });
    return { kind: "INSPECTION", inspection };
  } catch (cause: unknown) {
    log.error("inspection_failed", { cause, ms: Date.now() - startedAt });
    return { kind: "FAILED" };
  } finally {
    await db?.destroy();
  }
}

export default async function AdminHomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = first(params["surname"])?.trim() ?? "";

  if (!inspectorEnabled()) {
    return (
      <main>
        <h1>Name Atlas — inspector</h1>
        <div className="gate">
          <p>
            <strong>Disabled.</strong> Set <code>ADMIN_INSPECTOR_ENABLED=true</code> to use it.
          </p>
          <p>
            This console reads internal evidence, and staff authentication (
            <code>docs/canonical/22</code> §6) does not exist yet. The flag is a deliberate lock on
            a door that has no lock: it is not authentication, and this page must not be reachable
            from a network until §6 is built.
          </p>
        </div>
      </main>
    );
  }

  const answer = await inspect(query);
  return (
    <main>
      <h1>Name Atlas — inspector</h1>
      <p className="banner">
        Read-only. No authentication — <code>docs/canonical/22</code> §6 is not implemented, so this
        must not be exposed to a network. Internal values, including confidence rationales, are
        shown here and nowhere else.
      </p>
      <form action="/" method="get">
        <input
          name="surname"
          type="text"
          defaultValue={query}
          placeholder="surname, any casing"
          autoComplete="off"
          spellCheck={false}
          aria-label="Surname"
        />
        <button type="submit">Inspect</button>
      </form>
      {answer.kind === "NONE" ? null : answer.kind === "FAILED" ? (
        <section>
          <h3>Lookup failed</h3>
          <p>The database could not be read. The reason is in the server log, not here.</p>
        </section>
      ) : (
        <InspectionView inspection={answer.inspection} />
      )}
    </main>
  );
}
