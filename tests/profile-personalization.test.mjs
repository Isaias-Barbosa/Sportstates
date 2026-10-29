import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyPreferences,
  validatePreferenceAction,
  applyPreferenceAction,
  normalizeTeamFavorites,
  mutateVersionedPreferences,
} from "../server/user-preferences.mjs";
import { buildDailySummary, summarySports } from "../server/daily-summary.mjs";
test("league selection validates sport/league pairs, deduplicates and preserves older preferences", () => {
  const action = validatePreferenceAction({
    action: "leagues",
    leagues: ["soccer/bra.1", "basketball/nba", "soccer/bra.1"],
  });
  assert.deepEqual(action.leagues, ["soccer/bra.1", "basketball/nba"]);
  assert.throws(() =>
    validatePreferenceAction({ action: "leagues", leagues: ["soccer/nba"] }),
  );
  assert.throws(() =>
    validatePreferenceAction({
      action: "leagues",
      leagues: ["soccer/bra.1/extra"],
    }),
  );
  const old = { ...emptyPreferences(), teams: ["one"] };
  delete old.leagues;
  assert.deepEqual(applyPreferenceAction(old, action).teams, ["one"]);
  assert.deepEqual(applyPreferenceAction(old, action).leagues, action.leagues);
});
test("legacy favorites keep latest team per league without mixing sports or leagues", () => {
  const current = { ...emptyPreferences(), teams: ["a", "b", "c", "d"] };
  const teams = [
    { id: "a", sport: "soccer", league: "bra.1" },
    { id: "b", sport: "soccer", league: "eng.1" },
    { id: "c", sport: "soccer", league: "bra.1" },
    { id: "d", sport: "basketball", league: "nba" },
  ];
  assert.deepEqual(normalizeTeamFavorites(current, teams).teams, [
    "b",
    "c",
    "d",
  ]);
  assert.deepEqual(current.teams, ["a", "b", "c", "d"]);
  const action = validatePreferenceAction({
    action: "favorite",
    kind: "team",
    id: "123",
    selected: true,
    teamScope: "forged",
    replaceTeamIds: ["b"],
  });
  assert.equal(action.teamScope, undefined);
  assert.equal(action.replaceTeamIds, undefined);
  const next = applyPreferenceAction(current, {
    ...action,
    replaceTeamIds: ["a", "c"],
  });
  assert.deepEqual(next.teams, ["b", "d", "123"]);
});
test("concurrent favorite replacement resolves league members again after a version conflict", async () => {
  let row = {
      preferences: { ...emptyPreferences(), teams: ["old"] },
      version: 1,
    },
    calls = 0;
  const action = {
    action: "favorite",
    kind: "team",
    id: "chosen",
    selected: true,
  };
  const result = await mutateVersionedPreferences("user", action, {
    read: async () => structuredClone(row),
    resolve: async (a, p) => ({
      ...a,
      replaceTeamIds: p.teams.filter((id) => id !== "other-league"),
    }),
    write: async (id, next, version) => {
      calls++;
      if (calls === 1) {
        row = {
          preferences: {
            ...emptyPreferences(),
            teams: ["concurrent", "other-league"],
          },
          version: 2,
        };
        return null;
      }
      assert.equal(version, 2);
      return { preferences: next, version: 3 };
    },
  });
  assert.deepEqual(result.preferences.teams, ["other-league", "chosen"]);
});
test("daily summary includes selected leagues and followed teams across cups", () => {
  const preferences = {
    ...emptyPreferences(),
    sports: ["soccer"],
    leagues: ["soccer/bra.1"],
  };
  const make = (id, league, home) => ({
    id,
    sport: "soccer",
    league,
    date: "2026-10-29T20:00:00Z",
    state: "scheduled",
    home: { id: home, name: "Home" },
    away: { id: "999", name: "Away" },
  });
  const summary = buildDailySummary({
    date: "2026-10-29",
    preferences,
    teams: [{ id: "123", sport: "soccer", name: "Team", league: "eng.1" }],
    today: [
      make("1", "bra.1", "1"),
      make("2", "eng.1", "2"),
      make("3", "uefa.champions", "123"),
    ],
  });
  assert.deepEqual(
    new Set(summary.upcoming.map((m) => m.id)),
    new Set(["1", "3"]),
  );
  assert.ok(
    summarySports(
      { ...emptyPreferences(), leagues: ["basketball/nba"] },
      [],
    ).includes("basketball"),
  );
});

test("sports and leagues save together in one preference mutation", () => {
  const before = emptyPreferences();
  const action = validatePreferenceAction({
    action: "interests",
    sports: ["soccer"],
    leagues: ["soccer/bra.1"],
  });
  const next = applyPreferenceAction(before, action);
  assert.deepEqual(next.sports, ["soccer"]);
  assert.deepEqual(next.leagues, ["soccer/bra.1"]);
  assert.deepEqual(before.sports, []);
  assert.throws(() =>
    validatePreferenceAction({
      action: "interests",
      sports: ["soccer"],
      leagues: ["bad/invalid"],
    }),
  );
});
