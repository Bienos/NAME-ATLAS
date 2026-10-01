/**
 * Whether accounts exist at all (TASK-062, ADR-0027 §2.8 and its amendment in
 * `tasks/062-account-pages.md` §4).
 *
 * Accounts are on only when **every** one of these is set. A sign-up that
 * cannot be confirmed must not be accepted, a mail's link must be absolute, and
 * the 7-day retention the privacy notice states for a pending address holds
 * only while the daily purge can run, which needs the cron's bearer. A missing
 * variable is therefore "off", never "half on": no link, no page, no route, and
 * the legal pages read as before.
 *
 * Reads the variables by name and imports no package, so the header, which every
 * page renders, does not pull the database driver into its module graph. The
 * values themselves are read by `accounts-runtime.ts` through
 * `@name-atlas/db` and `@name-atlas/accounts`; a test holds the two in step.
 */

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

/** True only when all five are set. Read at render, so a static page bakes it at build. */
export function accountsEnabled(env: Env = process.env): boolean {
  return ACCOUNTS_ENV.every((name) => isSet(env, name));
}

/** Which of the five are missing, for a message that names the variable and never a value. */
export function missingAccountsEnv(env: Env = process.env): readonly string[] {
  return ACCOUNTS_ENV.filter((name) => !isSet(env, name));
}
