import test from "node:test";
import assert from "node:assert/strict";
import { handler, route } from "../server/api.mjs";
import {
  mapSourceItems,
  sourceRequest,
  validateAppearance,
  validatePlayerEdit,
  validateSources,
  withPlayerEdit,
} from "../server/admin-studio.mjs";

test("appearance settings accept only known competition codes and hex backgrounds", () => {
  const settings = {
    light: "#ffffff",
    dark: "",
    home: ["soccer/bra.1"],
    standings: ["basketball/nbb"],
  };
  assert.deepEqual(validateAppearance(settings), settings);
  assert.throws(() => validateAppearance({ ...settings, dark: "url(abc)" }));
  assert.throws(() =>
    validateAppearance({ ...settings, home: ["soccer/bra.1", "soccer/bra.1"] }),
  );
  assert.throws(() =>
    validateAppearance({ ...settings, standings: ["soccer/invalid"] }),
  );
});

test("custom sources map fields and only attach tokens to their configured origin", () => {
  const config = {
    id: "placares",
    name: "Dados",
    url: "https://demo.example/v1",
    token: "SPORTSTATES_SOURCE_TEST_TOKEN",
    listPath: "items",
    titlePath: "title",
    valuePath: "stats.total",
    linkPath: "url",
    target: "home",
    league: "",
    ttl: 15,
    enabled: true,
  };
  assert.deepEqual(validateSources({ sources: [config] }), [config]);
  assert.deepEqual(
    mapSourceItems(
      {
        items: [
          {
            title: "A",
            stats: { total: 0 },
            url: "javascript:alert(1)",
            private: "ignored",
          },
        ],
      },
      config,
    ),
    [{ title: "A", value: "0", link: undefined }],
  );
  assert.throws(() => mapSourceItems({ items: [{ other: "A" }] }, config));
  const env = {
    SPORTSTATES_SOURCE_ORIGINS: "https://demo.example,https://other.example",
    SPORTSTATES_SOURCE_TEST_TOKEN: "sample",
    SPORTSTATES_SOURCE_TEST_ORIGIN: "https://demo.example",
  };
  const previous = Object.fromEntries(
    Object.keys(env).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, env);
  try {
    assert.equal(sourceRequest(config).headers.Authorization, "Bearer sample");
    assert.throws(() =>
      sourceRequest({ ...config, url: "https://other.example/v1" }),
    );
    assert.throws(() =>
      sourceRequest({ ...config, url: "https://127.0.0.1/v1" }),
    );
  } finally {
    for (const [key, value] of Object.entries(previous))
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
});

test("studio endpoints require admin access and public settings have safe defaults", async () => {
  for (const path of ["appearance", "custom-sources", "player-editor"]) {
    const response = { setHeader() {}, end() {} };
    await handler(
      { method: "PUT", url: "/api/admin/" + path, headers: {} },
      response,
    );
    assert.equal(response.statusCode, 401);
  }
  assert.deepEqual(
    await route(new URL("https://example.test/api/appearance")),
    [200, { light: "", dark: "", home: [], standings: [] }],
  );
});

test("player edits require valid references and live ESPN fills empty profile fields", async (t) => {
  const edit = {
    id: "espn-12",
    espnId: "12",
    awards: [],
    previousClubs: [{ name: "Clube", source: "https://example.com" }],
  };
  assert.equal(validatePlayerEdit(edit).previousClubs[0].name, "Clube");
  assert.throws(() =>
    validatePlayerEdit({
      ...edit,
      awards: [{ name: "Prêmio", source: "javascript:alert(1)" }],
    }),
  );
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      id: "12",
      displayName: "Nome externo",
      citizenship: "Brasil",
    }),
  );
  const merged = await withPlayerEdit(
    { name: "Nome cadastrado", awards: [{ name: "Prêmio" }] },
    "espn-12",
  );
  assert.equal(merged.name, "Nome cadastrado");
  assert.equal(merged.nationality, "Brasil");
  assert.equal(merged.awards[0].name, "Prêmio");
});
