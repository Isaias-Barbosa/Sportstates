import test from "node:test";
import assert from "node:assert/strict";
import { resolveSources } from "../server/source-manager.mjs";

function memoryCache() {
  const values = new Map();
  return async (key, ttl, loader) => {
    if (!values.has(key)) values.set(key, { value: await loader(), at: Date.now() });
    return { ...values.get(key), stale: false };
  };
}

test("uses the first provider with fixtures and does not call later sources", async () => {
  const calls = [];
  const result = await resolveSources({
    key: "test:priority", cached: memoryCache(),
    providers: [
      { name: "ESPN", load: async () => { calls.push("ESPN"); return [{ id: "1" }]; } },
      { name: "365", load: async () => { calls.push("365"); return [{ id: "2" }]; } },
    ],
  });
  assert.equal(result.provider, "ESPN");
  assert.deepEqual(calls, ["ESPN"]);
});

test("falls back on empty results and avoids repeating failed calls", async () => {
  let failures = 0;
  const providers = [
    { name: "broken", load: async () => { failures++; throw new Error("offline"); } },
    { name: "fallback", load: async () => [{ id: "ok" }] },
  ];
  const options = { key: "test:cooldown", providers, cached: memoryCache() };
  assert.equal((await resolveSources(options)).provider, "fallback");
  assert.equal((await resolveSources(options)).provider, "fallback");
  assert.equal(failures, 1);
});

test("deduplicates concurrent requests", async () => {
  let calls = 0;
  const options = {
    key: "test:concurrent", cached: async (_key, _ttl, loader) =>
      ({ value: await loader(), at: Date.now(), stale: false }),
    providers: [{ name: "one", load: async () => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return [{ id: "1" }];
    } }],
  };
  await Promise.all([resolveSources(options), resolveSources(options)]);
  assert.equal(calls, 1);
});
