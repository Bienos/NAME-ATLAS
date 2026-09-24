/**
 * Number and date presentation for the English interface (§33): grouped
 * numbers for the locale, and dates written out so nobody has to guess
 * whether 01/02 is January or February.
 */

const counts = new Intl.NumberFormat("en-GB");

const longDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatCount(value: number): string {
  return counts.format(value);
}

/**
 * `2026-01-20` → `20 January 2026`. Parsed as a calendar date in UTC, so the
 * rendered day never shifts with the server's or the reader's timezone.
 */
export function formatIsoDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(isoDate);
  if (!match) {
    return isoDate;
  }
  const [, year, month, day] = match;
  return longDate.format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))));
}

/** The calendar day (UTC) of an instant, as `YYYY-MM-DD`. */
export function isoDay(instant: Date): string {
  return instant.toISOString().slice(0, 10);
}
