export function isoWeekBounds(ts: number): { start: number; end: number } {
  const d = new Date(ts);
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  date.setUTCHours(0, 0, 0, 0);
  return { start: date.getTime(), end: date.getTime() + 7 * 86400000 };
}
