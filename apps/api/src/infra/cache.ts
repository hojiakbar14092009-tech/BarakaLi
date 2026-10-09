export interface Cache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlSeconds: number): void;
  delete(key: string): void;
  clear(): void;
}

interface Entry {
  value: unknown;
  expiresAt: number;
}

/** In-process cache; swap for a Redis-backed implementation of `Cache` later. */
export class MemoryCache implements Cache {
  private readonly entries = new Map<string, Entry>();

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}

export async function cached<T>(
  cache: Cache,
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
): Promise<T> {
  const hit = cache.get<T>(key);
  if (hit !== undefined) return hit;
  const value = await load();
  cache.set(key, value, ttlSeconds);
  return value;
}
