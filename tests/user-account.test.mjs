import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, SignJWT } from "jose";
import {
  sessionIdentity,
  userIdentity,
  verifySessionToken,
} from "../server/user-auth.mjs";
import {
  emptyPreferences,
  validatePreferenceAction,
  applyPreferenceAction,
  mutateVersionedPreferences,
  DEFAULT_NOTIFICATIONS,
} from "../server/user-preferences.mjs";
import {
  buildDailySummary,
  summarySports,
  isFavoriteMatch,
} from "../server/daily-summary.mjs";
import { handler } from "../server/api.mjs";
test("signed Neon identities require matching signature, issuer, audience and expiry", async () => {
  const { publicKey, privateKey } = await generateKeyPair("EdDSA");
  const origin = "https://test.neon.tech";
  const make = (claims) =>
    new SignJWT({ email: "person@example.test", name: "Pessoa", ...claims })
      .setProtectedHeader({ alg: "EdDSA" })
      .setSubject("user-a")
      .setIssuedAt()
      .setIssuer(origin)
      .setAudience(origin)
      .setExpirationTime("5m");
  const token = await make({}).sign(privateKey);
  assert.equal(
    (await verifySessionToken(token, publicKey, origin)).id,
    "user-a",
  );
  await assert.rejects(() =>
    verifySessionToken(token, publicKey, "https://other.neon.tech"),
  );
  const wrong = await generateKeyPair("EdDSA");
  await assert.rejects(() =>
    verifySessionToken(token, wrong.publicKey, origin),
  );
  const expired = await make({}).setExpirationTime(1).sign(privateKey);
  await assert.rejects(() => verifySessionToken(expired, publicKey, origin));
  const banned = await make({ banned: true }).sign(privateKey);
  assert.equal(await verifySessionToken(banned, publicKey, origin), null);
  assert.equal(
    sessionIdentity({ sub: "a", email: "", role: "anonymous" }),
    null,
  );
});
test("user APIs never accept the admin recovery key or anonymous callers and never cache responses", async () => {
  const previous = process.env.ADMIN_ACCESS_KEY;
  process.env.ADMIN_ACCESS_KEY = "z".repeat(32);
  try {
    for (const path of [
      "/api/me",
      "/api/me/summary",
      "/api/index?path=me/summary",
    ]) {
      const headers = {};
      let response = "";
      const res = {
        statusCode: 0,
        setHeader: (k, v) => (headers[k] = v),
        end: (s) => (response = s),
      };
      await handler(
        {
          url: path,
          method: "GET",
          headers: { authorization: "Bearer " + "z".repeat(32) },
        },
        res,
      );
      assert.equal(res.statusCode, 401);
      assert.match(headers["Cache-Control"], /no-store/);
      assert.equal(headers["Vercel-CDN-Cache-Control"], "no-store");
      assert.ok(!response.includes("user-a"));
    }
  } finally {
    if (previous === undefined) delete process.env.ADMIN_ACCESS_KEY;
    else process.env.ADMIN_ACCESS_KEY = previous;
  }
  assert.equal(await userIdentity(undefined), null);
});
test("preference mutations are idempotent, immutable and bounded; caller cannot provide a user ID", () => {
  const first = emptyPreferences(),
    second = emptyPreferences();
  const action = validatePreferenceAction({
    action: "favorite",
    kind: "match",
    id: "soccer/bra.1/123",
    selected: true,
    userId: "other-user",
  });
  assert.ok(!("userId" in action));
  const next = applyPreferenceAction(first, action);
  assert.deepEqual(first.matches, []);
  assert.deepEqual(second.matches, []);
  assert.deepEqual(next.matches, ["soccer/bra.1/123"]);
  assert.deepEqual(applyPreferenceAction(next, action).matches, next.matches);
  assert.deepEqual(
    applyPreferenceAction(next, { ...action, selected: false }).matches,
    [],
  );
  const full = {
    ...first,
    teams: Array.from({ length: 50 }, (_, i) => String(i + 1)),
  };
  assert.throws(
    () =>
      applyPreferenceAction(full, {
        action: "favorite",
        kind: "team",
        id: "900",
        selected: true,
      }),
    /Limite/,
  );
  for (const bad of [
    {
      action: "favorite",
      kind: "match",
      id: "soccer/women/123",
      selected: true,
    },
    { action: "favorite", kind: "team", id: "../../users", selected: true },
    { action: "sports", sports: ["not-a-sport"] },
    {
      action: "notifications",
      notifications: { ...DEFAULT_NOTIFICATIONS, volume: 2 },
    },
    {
      action: "notifications",
      notifications: { ...DEFAULT_NOTIFICATIONS, sound: "yes" },
    },
  ])
    assert.throws(() => validatePreferenceAction(bad));
});
test("daily summary selects interests and favorite teams across cups without treating guides as confirmed TV", () => {
  const p = emptyPreferences();
  p.teams = ["817"];
  const teams = [{ id: "817", sport: "soccer", name: "Al Nassr" }];
  const m = {
    sport: "soccer",
    league: "ksa.kings.cup",
    id: "123",
    home: { id: "817", name: "Al Nassr" },
    away: { id: "8363", name: "Al Ettifaq" },
    date: "2026-10-29T18:00:00Z",
    state: "live",
    watch: { confirmedForMatch: false },
  };
  assert.equal(isFavoriteMatch(m, p, teams), true);
  assert.deepEqual(summarySports(p, teams), ["soccer"]);
  const d = buildDailySummary({
    date: "2026-10-29",
    preferences: p,
    teams,
    today: [
      m,
      { ...m, id: "124", liveUnverified: true },
      { ...m, id: "125", home: { id: "999" }, away: { id: "888" } },
    ],
  });
  assert.equal(d.live.length, 1);
  assert.equal(d.watch.length, 0);
  assert.equal(d.onboarding, false);
  assert.equal(
    buildDailySummary({
      date: "2026-10-29",
      preferences: p,
      teams,
      today: [{ ...m, watch: { confirmedForMatch: true } }],
    }).watch.length,
    1,
  );
  const empty = buildDailySummary({
    date: "2026-10-29",
    preferences: emptyPreferences(),
    teams: [],
  });
  assert.equal(empty.onboarding, true);
});

test("concurrent writes retry against the latest row and retain the other device favorite", async () => {
  let row = { preferences: emptyPreferences(), version: 0 },
    attempts = 0;
  const action = validatePreferenceAction({
    action: "favorite",
    kind: "match",
    id: "soccer/bra.1/123",
    selected: true,
  });
  const result = await mutateVersionedPreferences("user-a", action, {
    read: async (id) => {
      assert.equal(id, "user-a");
      return structuredClone(row);
    },
    write: async (id, next, version) => {
      if (attempts++ === 0) {
        row.preferences.matches = ["basketball/nba/999"];
        row.version++;
        return null;
      }
      assert.equal(version, row.version);
      row = { preferences: next, version: version + 1 };
      return row;
    },
  });
  assert.deepEqual(result.preferences.matches, [
    "basketball/nba/999",
    "soccer/bra.1/123",
  ]);
  assert.equal(result.version, 2);
});
