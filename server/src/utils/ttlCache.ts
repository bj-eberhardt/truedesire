export type TtlCacheEntry<T> = {
  value: T;
  cachedAt: number;
  expiresAt: number;
};

export class TtlCache<T> {
  private entry: TtlCacheEntry<T> | null = null;
  private pending: Promise<TtlCacheEntry<T>> | null = null;

  constructor(private readonly ttlMs: number) {}

  async getOrCreate(loader: () => Promise<T>, now = Date.now()): Promise<TtlCacheEntry<T>> {
    if (this.entry && this.entry.expiresAt > now) return this.entry;
    if (this.pending) return this.pending;

    this.pending = loader()
      .then((value) => {
        const cachedAt = Date.now();
        const entry = { value, cachedAt, expiresAt: cachedAt + this.ttlMs };
        this.entry = entry;
        return entry;
      })
      .finally(() => {
        this.pending = null;
      });

    return this.pending;
  }

  clear() {
    this.entry = null;
    this.pending = null;
  }
}
