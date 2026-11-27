interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

// Per-isolate cache for public catalogue data. Values are settled before they
// enter the map, so a request never awaits a promise created by another
// request. Keep the number of entries bounded; Workers isolates are small.
const store = new Map<string, CacheEntry>();
const MAX_ENTRIES = 200;

function trim() {
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

export async function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const hit = store.get(key);
  if (hit) {
    if (hit.expiresAt > Date.now()) {
      store.delete(key);
      store.set(key, hit);
      return hit.value as T;
    }
    store.delete(key);
  }

  const value = await load();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  trim();
  return value;
}
