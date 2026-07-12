type Bucket = Map<string, number[]>;

function pruneTimestamps(values: number[], now: number, maxWindowMs: number): number[] {
  const min = now - maxWindowMs;
  return values.filter((timestamp) => timestamp >= min);
}

export function consumeRateLimit(
  bucket: Bucket,
  key: string,
  now: number,
  perMin: number,
  perHour: number
): boolean {
  const current = pruneTimestamps(bucket.get(key) ?? [], now, 60 * 60 * 1000);
  const inLastMinute = current.filter((timestamp) => timestamp >= now - 60 * 1000).length;
  if (inLastMinute >= perMin || current.length >= perHour) {
    bucket.set(key, current);
    return false;
  }

  current.push(now);
  bucket.set(key, current);
  return true;
}
