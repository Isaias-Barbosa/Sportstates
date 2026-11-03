// Provider orchestration: sequential fallback, negative caching and a short
// circuit breaker. This is process-local and intentionally makes no Runtime
// Cache writes; the caller supplies its existing cached() implementation.
const failures = new Map();
const pending = new Map();

export async function resolveSources({
  key, providers, cached, now = Date.now,
  failureTtl = 5 * 60_000, emptyTtl = 60_000,
}) {
  if (!key || !Array.isArray(providers) || !providers.length)
    throw new Error("Fontes inválidas");
  if (pending.has(key)) return pending.get(key);
  const work = (async () => {
    const warnings = [];
    let empty = null;
    for (const provider of providers) {
      if (!provider?.name || typeof provider.load !== "function") continue;
      const id = `${key}:${provider.name}`;
      const blockedUntil = failures.get(id) || 0;
      if (blockedUntil > now()) {
        warnings.push(`${provider.name}: temporariamente indisponível`);
        continue;
      }
      if (blockedUntil) failures.delete(id);
      try {
        const result = await cached(
          `provider:v1:${id}`,
          provider.ttl ?? emptyTtl,
          async () => {
            const data = await provider.load();
            if (!Array.isArray(data))
              throw new Error("Fonte não retornou uma lista de partidas");
            return data;
          },
          provider.staleFor ?? 300_000,
        );
        failures.delete(id);
        if (result.value.length)
          return { matches: result.value, provider: provider.name,
            stale: result.stale, at: result.at, warnings };
        empty ??= { matches: [], provider: provider.name,
          stale: result.stale, at: result.at, warnings };
      } catch (error) {
        failures.set(id, now() + failureTtl);
        warnings.push(`${provider.name}: ${error.message}`);
      }
    }
    return empty ? { ...empty, warnings } : {
      matches: [], provider: null, stale: false, at: null, warnings,
    };
  })();
  pending.set(key, work);
  try { return await work; } finally { pending.delete(key); }
}
