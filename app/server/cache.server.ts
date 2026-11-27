interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

// L1: per-isolate cache for public catalogue data. Values are settled before
// they enter the map, so a request never awaits a promise created by another
// request. Keep the number of entries bounded; Workers isolates are small.
const store = new Map<string, CacheEntry>();
const MAX_ENTRIES = 200;
const CACHE_ORIGIN = "https://openbingeboard.com/__obb-cache/v2/";

function trim() {
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

function cacheRequest(key: string): Request {
  return new Request(CACHE_ORIGIN + encodeURIComponent(key), { method: "GET" });
}

// Workers expose the default Cache API instance as `caches.default`. The
// generated DOM types only describe the browser CacheStorage shape.
function defaultCache(): Cache {
  return (caches as unknown as { default: Cache }).default;
}

async function readL2<T>(key: string): Promise<T | undefined> {
  try {
    const response = await defaultCache().match(cacheRequest(key));
    if (!response) return undefined;
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

async function writeL2(key: string, value: unknown, ttlMs: number) {
  if (value === undefined) return;
  try {
    await defaultCache().put(
      cacheRequest(key),
      new Response(JSON.stringify(value), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `max-age=${Math.max(1, Math.floor(ttlMs / 1000))}`,
        },
      }),
    );
  } catch {
    // Cache is an optimization. Never fail the request because it is unavailable.
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

  const shared = await readL2<T>(key);
  if (shared !== undefined) {
    store.set(key, { value: shared, expiresAt: Date.now() + ttlMs });
    trim();
    return shared;
  }

  const value = await load();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  trim();
  await writeL2(key, value, ttlMs);
  return value;
}
