import { createHash, randomUUID } from "node:crypto";
import { getCache, dangerouslyDeleteByTag } from "@vercel/functions";

export const CACHE_TAG = "sportstates-api-v2";
const stores = new Set();
const runtime = () =>
  getCache({
    namespace: CACHE_TAG,
    keyHashFunction: (key) => createHash("sha256").update(key).digest("hex"),
  });

// No L1 value cache in production: another instance's admin purge must take effect.
// A generation isolates writes from requests that were already running at purge time.
export function createCache({
  max = 300,
  now = Date.now,
  shared = process.env.VERCEL === "1",
  storage = runtime,
} = {}) {
  const values = new Map(),
    pending = new Map();
  let generation = 0;
  const clear = () => {
    generation++;
    values.clear();
    pending.clear();
  };
  stores.add(clear);
  async function cached(key, ttl, loader, staleFor = 0) {
    let backend, remoteGeneration, existing;
    const localGeneration = generation;
    if (shared) {
      try {
        backend = storage();
        remoteGeneration = await backend.get("generation");
        if (!remoteGeneration) {
          remoteGeneration = randomUUID();
          await backend.set("generation", remoteGeneration);
        }
        existing = await backend.get(`${remoteGeneration}:${key}`);
      } catch {
        // A cache outage must not bring down the sports feeds. Don't retain a
        // private long-lived fallback that another instance cannot invalidate.
        backend = undefined;
      }
    } else existing = values.get(key);
    const lifetime = (value) => (typeof ttl === "function" ? ttl(value) : ttl);
    if (existing && now() - existing.at < lifetime(existing.value))
      return { ...existing, stale: false };
    const pendingKey = `${generation}:${remoteGeneration || "local"}:${key}`;
    if (pending.has(pendingKey)) return pending.get(pendingKey);
    const task = (async () => {
      try {
        const value = await Promise.resolve().then(loader);
        const result = { value, at: now() };
        if (generation === localGeneration) {
          if (backend) {
            try {
              await backend.set(`${remoteGeneration}:${key}`, result, {
                ttl: Math.max(
                  1,
                  Math.ceil((lifetime(value) + staleFor) / 1000),
                ),
                tags: [CACHE_TAG],
              });
            } catch {
              /* The response is still usable if the cache is unavailable. */
            }
          } else if (!shared) {
            values.delete(key);
            values.set(key, result);
            while (values.size > max) values.delete(values.keys().next().value);
          }
        }
        return { ...result, stale: false };
      } catch (error) {
        if (
          generation === localGeneration &&
          existing &&
          now() - existing.at < lifetime(existing.value) + staleFor
        )
          return { ...existing, stale: true };
        throw error;
      } finally {
        pending.delete(pendingKey);
      }
    })();
    pending.set(pendingKey, task);
    return task;
  }
  cached.clear = clear;
  return cached;
}

export async function clearAllCaches({
  shared = process.env.VERCEL === "1",
  storage = runtime,
  purge = dangerouslyDeleteByTag,
} = {}) {
  for (const clear of stores) clear();
  if (shared) {
    const backend = storage();
    // The generation is deliberately untagged and has no TTL. If evicted, a new
    // random generation is created, so old keys can never become visible again.
    await backend.set("generation", randomUUID());
    await backend.expireTag(CACHE_TAG);
    await purge(CACHE_TAG);
  }
  return { ok: true, clearedAt: new Date().toISOString() };
}
