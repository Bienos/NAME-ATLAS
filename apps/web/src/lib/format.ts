/** Display formatting only. Nothing here changes a value. */

const counts = new Intl.NumberFormat("en-GB");
const dates = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatCount(value: number): string {
  return counts.format(value);
}

/** `2026-01-20` → `20 Jan 2026`. Throws on anything but a real calendar date. */
export function formatIsoDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (match === null) {
    throw new RangeError(`not an ISO date: "${iso}"`);
  }
  const [, year, month, day] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError(`not a calendar date: "${iso}"`);
  }
  return dates.format(date);
}
