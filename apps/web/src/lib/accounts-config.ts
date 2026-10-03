/**
 * Whether accounts exist at all (TASK-062, ADR-0027 §2.8 and its amendment in
 * `tasks/062-account-pages.md` §4), and by which ways in (TASK-084, ADR-0033).
 *
 * Accounts need three things whatever the way in: their database, the site's
 * absolute origin (a mail's link and Google's return address must be absolute)
 * and the cron's bearer (the 7-day retention the privacy notice states for a
 * pending address holds only while the daily purge can run). Then at least one
 * way in, each complete or not at all:
 *
 * - **email and password**: the mail provider's key and sender, because a
 *   sign-up that cannot be confirmed must not be accepted;
 * - **Google**: the OAuth client's id and secret.
 *
 * A missing variable is therefore "off", never "half on": with no way in, no
 * link, no page, no route, and the legal pages read as before. With one way
 * in, the pages offer that one only.
 *
 * Reads the variables by name and imports no package, so the header, which every
 * page renders, does not pull the database driver into its module graph. The
 * values themselves are read by `accounts-runtime.ts` through
 * `@name-atlas/db` and `@name-atlas/accounts`; a test holds the two in step.
 */

/** What every way in needs. */
export const ACCOUNTS_BASE_ENV = ["ACCOUNTS_DATABASE_URL", "SITE_ORIGIN", "CRON_SECRET"] as const;
/** Email and password: the mail that confirms a sign-up and resets a password. */
export const MAIL_ENV = ["RESEND_API_KEY", "ACCOUNTS_MAIL_FROM"] as const;
/** Google sign-in (ADR-0033). */
export const GOOGLE_ENV = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] as const;

/** The five that turn accounts on by email and password, as TASK-062 named them. */
export const ACCOUNTS_ENV = [
  "ACCOUNTS_DATABASE_URL",
  "RESEND_API_KEY",
  "ACCOUNTS_MAIL_FROM",
  "SITE_ORIGIN",
  "CRON_SECRET",
] as const;

type Env = Readonly<Record<string, string | undefined>>;

function isSet(env: Env, name: string): boolean {
  return (env[name]?.trim() ?? "") !== "";
}

const all = (env: Env, names: readonly string[]) => names.every((name) => isSet(env, name));

/** Whether sign-up, sign-in and reset by email and password are offered (the mail is configured). */
export function mailEnabled(env: Env = process.env): boolean {
  return all(env, ACCOUNTS_BASE_ENV) && all(env, MAIL_ENV);
}

/** Whether "Continue with Google" is offered. */
export function googleEnabled(env: Env = process.env): boolean {
  return all(env, ACCOUNTS_BASE_ENV) && all(env, GOOGLE_ENV);
}

/** True when the base and at least one way in are set. Read at render, so a static page bakes it at build. */
export function accountsEnabled(env: Env = process.env): boolean {
  return mailEnabled(env) || googleEnabled(env);
}

/**
 * Which variables are missing, for a message that names the variable and never
 * a value: the base's with Google's set, else the email way's five.
 */
export function missingAccountsEnv(env: Env = process.env): readonly string[] {
  const names: readonly string[] = all(env, GOOGLE_ENV) ? ACCOUNTS_BASE_ENV : ACCOUNTS_ENV;
  return names.filter((name) => !isSet(env, name));
}
