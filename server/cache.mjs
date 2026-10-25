// Bounded per-process cache; use shared Redis/KV before scaling to multiple instances.
export function createCache({ max = 300, now = Date.now } = {}) {
  const values = new Map(),
    pending = new Map();
  return async function cached(key, ttl, loader, staleFor = 0) {
    const existing = values.get(key);
    if (existing && now() - existing.at < ttl)
      return { ...existing, stale: false };
    if (pending.has(key)) return pending.get(key);
    const task = (async () => {
      try {
        const value = await loader();
        const result = { value, at: now() };
        values.delete(key);
        values.set(key, result);
        while (values.size > max) values.delete(values.keys().next().value);
        return { ...result, stale: false };
      } catch (error) {
        if (existing && now() - existing.at < ttl + staleFor)
          return { ...existing, stale: true };
        throw error;
      } finally {
        pending.delete(key);
      }
    })();
    pending.set(key, task);
    return task;
  };
}
