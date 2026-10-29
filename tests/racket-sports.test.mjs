import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTennis, normalizeAtpRankings } from "../server/tennis.mjs";
import {
  parseCbvMatches,
  normalizeVolley,
  parseCbvStandings,
  volleyDetailRow,
} from "../server/volleyball.mjs";
import { flightObjects } from "../server/public-flight.mjs";
import { leagueFor } from "../server/catalog.mjs";
import { volleyballProfiles } from "../server/volleyball-profiles.mjs";
import { teamProfileId, providerTeamId } from "../server/team-identity.mjs";
const competitor = (id, name, values, win) => ({
  id,
  homeAway: id === "1" ? "home" : "away",
  winner: win,
  athlete: {
    displayName: name,
    flag: { href: "https://a.espncdn.com/i/teamlogos/countries/500/bra.png" },
  },
  linescores: values.map((v, i) => ({
    value: v,
    winner: win ? i !== 1 : i === 1,
    tiebreak: i === 1 ? 5 : null,
  })),
});
const c = {
  id: "185187",
  date: "2026-10-29T12:30Z",
  status: { period: 3, type: { state: "post", name: "STATUS_FINAL" } },
  competitors: [
    competitor("1", "Atleta A", [6, 6, 6], true),
    competitor("2", "Atleta B", [3, 7, 2], false),
  ],
  round: { displayName: "Final" },
};
const tennis = {
  events: [
    {
      id: "10-2026",
      date: "2026-10-24T04:00Z",
      name: "ATP Test",
      groupings: [
        { grouping: { slug: "mens-singles" }, competitions: [c] },
        {
          grouping: { slug: "womens-singles" },
          competitions: [{ ...c, id: "2" }],
        },
        {
          grouping: { slug: "mens-doubles" },
          competitions: [{ ...c, id: "3" }],
        },
      ],
    },
  ],
};
const flight = (v) =>
  `<script>self.__next_f.push(${JSON.stringify([1, "a:" + JSON.stringify(v) + "\n"])})</script>`;
const row = {
  ChampionshipMatch_ID: 2584863,
  Championship_ID: 6979,
  HomeTeam_ID: 11,
  GuestTeam_ID: 12,
  HomeTeam: "Time A",
  GuestTeam: "Time B",
  MatchDateTime: "2026-10-29T23:00:00+01:00",
  WonSetHome: 3,
  WonSetGuest: 1,
  Set1Home: 25,
  Set1Guest: 20,
  Set2Home: 21,
  Set2Guest: 25,
  Set3Home: 25,
  Set3Guest: 19,
  Set4Home: 25,
  Set4Guest: 22,
  isLive: false,
  isFinished: true,
  HomeTeamData: {
    Team_ID: 11,
    id: 11,
    badge: "https://assets.volleystation.com/website/teams/11/badge.png",
    PlayerList: [
      {
        Player_ID: 77,
        Player_Name: "Atleta",
        Player_Surname: "A",
        Number: 5,
        Position: 5,
      },
    ],
  },
  custom_data: { sge_transmission_names: ["SporTV 2"] },
};
test("ATP tournaments flatten into individual men singles fixtures with independent date, set wins and tiebreaks", () => {
  const ms = normalizeTennis(tennis);
  assert.equal(ms.length, 1);
  assert.equal(ms[0].id, "20261029185187");
  assert.equal(ms[0].date, c.date);
  assert.equal(ms[0].home.score, "2");
  assert.equal(ms[0].away.score, "1");
  assert.equal(ms[0].setScores[1].homeTiebreak, 5);
  assert.equal(ms[0].home.logo, c.competitors[0].athlete.flag.href);
  const scheduled = normalizeTennis({
    events: [
      {
        ...tennis.events[0],
        groupings: [
          {
            grouping: { slug: "mens-singles" },
            competitions: [{ ...c, status: { type: { state: "pre" } } }],
          },
        ],
      },
    ],
  })[0];
  assert.equal(scheduled.home.score, null);
});
test("ATP ranking uses singles category only and preserves points and provider ranks", () => {
  const raw = {
    rankings: [
      {
        type: "wta",
        ranks: [{ current: 1, athlete: { id: "1", displayName: "Outra" } }],
      },
      {
        type: "atp",
        update: "2026-10-22T07:00Z",
        ranks: [
          {
            current: 2,
            previous: 3,
            points: 100,
            athlete: {
              id: "2",
              displayName: "Atleta",
              flag: "https://a.espncdn.com/bra.png",
            },
          },
        ],
      },
    ],
  };
  const result = normalizeAtpRankings(raw);
  assert.equal(result.players.length, 1);
  assert.equal(result.players[0].name, "Atleta");
  assert.equal(result.players[0].points, 100);
  assert.equal(result.updatedAt, raw.rankings[1].update);
  assert.throws(() => normalizeAtpRankings({ rankings: [] }));
});
test("CBV public Flight is parsed without executing code and gender must be explicitly masculine", () => {
  const html = flight({ gender: "masculino", matches: [row, row] });
  const ms = parseCbvMatches(html);
  assert.equal(ms.length, 1);
  assert.equal(ms[0].HomeTeamData.PlayerList.length, 1);
  assert.throws(() =>
    parseCbvMatches(flight({ gender: "feminino", matches: [row] })),
  );
  assert.deepEqual(
    flightObjects('<script>throw Error("must not run")</script>'),
    [],
  );
  assert.throws(() => flightObjects("x".repeat(3_000_001)));
});
test("volleyball score is sets, not rally points; Brasília date, all played sets, status and roster remain separate", () => {
  const m = normalizeVolley(row);
  assert.equal(m.home.score, "3");
  assert.equal(m.away.score, "1");
  assert.equal(m.setScores.length, 4);
  assert.equal(m.setScores[0].home, "25");
  assert.equal(m.date, "2026-10-29T22:00:00.000Z");
  assert.equal(m.state, "finished");
  assert.equal(
    volleyDetailRow(row).lineups[0].players[0].positionName,
    "Levantador",
  );
  assert.equal(volleyDetailRow(row).lineups[0].players[0].starter, false);
  const live = normalizeVolley({ ...row, isFinished: false, isLive: true });
  assert.equal(live.watch.confirmedForMatch, true);
  assert.equal(live.watch.links[0].name, "sportv 2");
  assert.equal(live.watch.links[0].sourceUrl, live.sourceUrl);
  const later = normalizeVolley({
    ...row,
    isFinished: false,
    isLive: false,
    postponed: true,
  });
  assert.equal(later.state, "scheduled");
  assert.equal(later.statusName, "STATUS_POSTPONED");
  assert.equal(later.home.score, null);
});
test("CBV standings preserve official points and order rather than recalculating results", () => {
  const rows = parseCbvStandings(
    flight({
      championshipId: 6979,
      gender: "masculino",
      teams: [
        {
          teamId: 12,
          teamName: "B",
          position: 2,
          points: 2,
          wins: 1,
          losses: 0,
          matches: 1,
          setsWon: 3,
          setsLost: 2,
        },
        {
          teamId: 11,
          teamName: "A",
          position: 1,
          points: 3,
          wins: 1,
          losses: 0,
          matches: 1,
          setsWon: 3,
          setsLost: 0,
        },
      ],
    }),
  );
  assert.equal(rows[0].name, "A");
  assert.equal(rows[1].stats.points, "2");
});
test("catalog registers only masculine ATP/Superliga and 12 volleyball teams use isolated IDs", () => {
  assert.ok(leagueFor("tennis", "atp"));
  assert.equal(leagueFor("tennis", "wta"), null);
  assert.ok(leagueFor("volleyball", "superliga-men"));
  assert.equal(leagueFor("volleyball", "superliga-women"), null);
  assert.equal(volleyballProfiles.clubs.length, 12);
  for (const c of volleyballProfiles.clubs) {
    assert.equal(teamProfileId(c.cbvId, "volleyball", "superliga-men"), c.id);
    assert.equal(providerTeamId(c.id), c.cbvId);
    assert.ok(c.logo && c.website && c.stadium);
  }
  assert.throws(() =>
    teamProfileId("volleyball-superliga-men-11", "soccer", "bra.1"),
  );
});

test("new match and standings API routes use their providers without sending CBV IDs to ESPN summary", async () => {
  const { route } = await import("../server/api.mjs");
  const { clearAllCaches } = await import("../server/cache.mjs");
  await clearAllCaches({ shared: false });
  const original = globalThis.fetch;
  const requested = [];
  const cbvHtml = flight({ gender: "masculino", matches: [row] });
  globalThis.fetch = async (url) => {
    requested.push(String(url));
    if (String(url).startsWith("https://cbv.com.br/"))
      return { ok: true, text: async () => cbvHtml };
    if (String(url).includes("/tennis/atp/scoreboard"))
      return { ok: true, json: async () => tennis };
    throw Error("Unexpected provider " + url);
  };
  try {
    const [st, t] = await route(
      new URL(
        "http://localhost/api/match?sport=tennis&league=atp&id=20261029185187",
      ),
    );
    assert.equal(st, 200);
    assert.equal(t.match.home.score, "2");
    assert.equal(t.match.setScores.length, 3);
    const [sv, v] = await route(
      new URL(
        "http://localhost/api/match?sport=volleyball&league=superliga-men&id=2584863",
      ),
    );
    assert.equal(sv, 200);
    assert.equal(v.match.home.score, "3");
    assert.equal(v.lineups[0].players[0].name, "Atleta A");
    assert.ok(requested.every((url) => !url.includes("/summary?")));
    const [invalid] = await route(
      new URL("http://localhost/api/match?sport=tennis&league=wta&id=123"),
    );
    assert.equal(invalid, 400);
  } finally {
    globalThis.fetch = original;
    await clearAllCaches({ shared: false });
  }
});
test("combined daily scoreboard exposes both new sports, deduplicates fixtures and excludes other dates and female groups", async () => {
  const { scoreboard } = await import("../server/api.mjs");
  const { clearAllCaches } = await import("../server/cache.mjs");
  await clearAllCaches({ shared: false });
  const original = globalThis.fetch;
  globalThis.fetch = async (url) =>
    String(url).startsWith("https://cbv.com.br/")
      ? {
          ok: true,
          text: async () => flight({ gender: "masculino", matches: [row] }),
        }
      : String(url).includes("/tennis/atp/")
        ? { ok: true, json: async () => tennis }
        : { ok: true, json: async () => ({ events: [] }) };
  try {
    const data = await scoreboard("2026-10-29");
    assert.equal(data.matches.length, 2);
    assert.deepEqual(
      new Set(data.matches.map((m) => m.sport)),
      new Set(["tennis", "volleyball"]),
    );
    assert.ok(data.sports.some((s) => s.id === "tennis"));
    assert.ok(data.sports.some((s) => s.id === "volleyball"));
  } finally {
    globalThis.fetch = original;
    await clearAllCaches({ shared: false });
  }
});
