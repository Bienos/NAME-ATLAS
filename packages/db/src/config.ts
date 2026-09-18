/**
 * Environment configuration for the db package.
 *
 * Reads DATABASE_URL only (.env.example). No other package may read
 * process.env for database configuration — this is the single owner.
 */
export interface DbConfig {
  readonly databaseUrl: string;
}

export class MissingDatabaseUrlError extends Error {
  constructor() {
    super(
      "DATABASE_URL is not set. Copy .env.example to .env and set it to a " +
        "PostgreSQL connection string (see docs/adr/0002-db-access.md).",
    );
    this.name = "MissingDatabaseUrlError";
  }
}

/**
 * Reads database configuration from the given environment map (defaults to
 * `process.env`). Throws {@link MissingDatabaseUrlError} if DATABASE_URL is
 * unset or empty, rather than silently falling back to a guessed default —
 * a wrong silent default here would point at the wrong database.
 */
export function loadDbConfig(env: NodeJS.ProcessEnv = process.env): DbConfig {
  const databaseUrl = env["DATABASE_URL"];
  if (!databaseUrl || databaseUrl.trim() === "") {
    throw new MissingDatabaseUrlError();
  }
  return { databaseUrl };
}
