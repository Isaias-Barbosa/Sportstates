import test from "node:test";
import assert from "node:assert/strict";
import {
  WOMEN_SOCCER_LEAGUES,
  WOMEN_LEAGUES,
  SOCCER_TEAM_LEAGUES,
  leagueGender,
  leagueFor,
} from "../server/catalog.mjs";
import {
  SOCCER_365_COMPETITIONS,
  SOCCER_365_PRIMARY_COMPETITIONS,
  competitionGamesUrl,
  competitionStandingsUrl,
} from "../server/365scores.mjs";
import { KNOCKOUT_LEAGUES } from "../server/tournaments.mjs";
import { womenTeams, validateWomenTeams } from "../server/women-teams.mjs";
import { route, scoreboard } from "../server/api.mjs";
import { clearAllCaches } from "../server/cache.mjs";
import { dayInBrazil } from "../server/data.mjs";

const WOMEN_365_IDS = {
  "bra.feminino": 6223,
  "bra.feminino.paulista": 7762,
  "bra.feminino.copa_rio": 8073,
  "bra.feminino.copa_do_brazil": 8702,
  "conmebol.libertadores_feminina": 6226,
};
const WOMEN_ESPN = [
  "eng.w.1",
  "eng.w.fa",
  "eng.w.league_cup",
  "esp.w.1",
  "esp.copa_de_la_reina",
  "fra.w.1",
  "usa.nwsl",
  "uefa.wchampions",
];

test("women leagues are registered, classified and uniquely named", () => {
  assert.equal(WOMEN_SOCCER_LEAGUES.size, 13);
  assert.ok(WOMEN_LEAGUES.has("wnba"));
  for (const league of WOMEN_SOCCER_LEAGUES) {
    assert.ok(leagueFor("soccer", league), league);
    assert.ok(SOCCER_TEAM_LEAGUES.has(league), league);
    assert.equal(leagueGender("soccer", league), "women", league);
  }
  assert.equal(leagueGender("soccer", "bra.1"), "men");
  assert.equal(leagueGender("basketball", "wnba"), "women");
  assert.equal(leagueGender("basketball", "nba"), "men");
});

test("women competitions use verified providers and knockout rules", () => {
  for (const [league, id] of Object.entries(WOMEN_365_IDS)) {
    assert.equal(SOCCER_365_COMPETITIONS[league], id, league);
    assert.ok(SOCCER_365_PRIMARY_COMPETITIONS.has(league), league);
    assert.equal(
      new URL(competitionStandingsUrl(league)).searchParams.get("competitions"),
      String(id),
    );
    assert.equal(
      new URL(competitionGamesUrl(league)).searchParams.get("competitions"),
      String(id),
    );
  }
  assert.deepEqual(
    [...WOMEN_SOCCER_LEAGUES]
      .filter((league) => !SOCCER_365_PRIMARY_COMPETITIONS.has(league))
      .sort(),
    [...WOMEN_ESPN].sort(),
  );
  for (const league of [
    "eng.w.fa",
    "eng.w.league_cup",
    "esp.copa_de_la_reina",
    "bra.feminino.copa_rio",
    "bra.feminino.copa_do_brazil",
    "conmebol.libertadores_feminina",
    "uefa.wchampions",
  ])
    assert.ok(KNOCKOUT_LEAGUES.has(league), league);
});

test("reviewed women squad has real IDs, sources and expected league sizes", () => {
  assert.equal(womenTeams.clubs.length, 147);
  assert.equal(validateWomenTeams(womenTeams), womenTeams);
  assert.equal(new Set(womenTeams.clubs.map((c) => c.id)).size, 147);
  const counts = {};
  for (const club of womenTeams.clubs)
    counts[club.league] = (counts[club.league] || 0) + 1;
  assert.deepEqual(counts, womenTeams.expectedCounts);
  assert.equal(Object.keys(counts).length, 11);
  for (const club of womenTeams.clubs) {
    assert.equal(club.gender, "women");
    assert.equal(club.sport, "soccer");
    assert.ok(WOMEN_SOCCER_LEAGUES.has(club.league), club.id);
    assert.ok(club.name.length > 1 && !/\bTBD\b/i.test(club.name));
    assert.ok(club.sources.every((source) => source.url.startsWith("https://")));
    assert.equal(
      new URL(club.logo).hostname === "a.espncdn.com"
        ? "espn"
        : new URL(club.logo).hostname === "imagecache.365scores.com"
          ? "365"
          : "unknown",
      club.provider,
    );
  }
  assert.throws(() =>
    validateWomenTeams({
      ...womenTeams,
      clubs: [{ ...womenTeams.clubs[0], name: "TBD" }, ...womenTeams.clubs.slice(1)],
    }),
  );
});

test("women standings use the 365Scores adapter for Brazilian competitions", async () => {
  await clearAllCaches({ shared: false });
  const original = globalThis.fetch;
  let standingsUrl;
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    if (url.pathname === "/web/standings/") {
      standingsUrl = url;
      return {
        ok: true,
        json: async () => ({
          standings: [
            {
              competitionId: 6223,
              rows: [
                {
                  competitor: { id: 12345, name: "Corinthians" },
                  position: 1,
                  points: 21,
                },
              ],
            },
          ],
        }),
      };
    }
    return { ok: true, json: async () => ({ games: [] }) };
  };
  try {
    const [status, result] = await route(
      new URL("http://localhost/api/standings?sport=soccer&league=bra.feminino"),
    );
    assert.equal(status, 200);
    assert.equal(standingsUrl.searchParams.get("competitions"), "6223");
    assert.equal(result.groups[0].rows[0].name, "Corinthians");
    assert.match(result.source, /365Scores/);
  } finally {
    globalThis.fetch = original;
  }
});

test("ESPN-backed women leagues are requested with their verified slug", async () => {
  await clearAllCaches({ shared: false });
  const original = globalThis.fetch;
  let requested;
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    if (url.hostname === "site.api.espn.com" && url.pathname.endsWith("/standings")) {
      requested = url;
      return {
        ok: true,
        json: async () => ({
          children: [{ standings: { entries: [{ team: { id: "19973", displayName: "Arsenal" } }] } }],
        }),
      };
    }
    return { ok: true, json: async () => ({ events: [], games: [] }) };
  };
  try {
    const [status, result] = await route(
      new URL("http://localhost/api/standings?sport=soccer&league=eng.w.1"),
    );
    assert.equal(status, 200);
    assert.match(requested.pathname, /soccer\/eng\.w\.1\/standings$/);
    assert.equal(result.groups[0].rows[0].name, "Arsenal");
  } finally {
    globalThis.fetch = original;
  }
});

test("365-only women leagues never fall through to a non-existent ESPN slug", async () => {
  await clearAllCaches({ shared: false });
  const original = globalThis.fetch;
  const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const date = dayInBrazil(past);
  const espnPaths = [];
  const competitions = new Set();
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    if (url.hostname === "site.api.espn.com") {
      espnPaths.push(url.pathname);
      return { ok: true, json: async () => ({ events: [] }) };
    }
    if (url.hostname === "webws.365scores.com") {
      const id = url.searchParams.get("competitions");
      if (id) competitions.add(id);
      return {
        ok: true,
        json: async () => ({
          games: [
            {
              id: 900001 + Number(id || 0),
              competitionId: Number(id),
              startTime: `${date}T16:00:00-03:00`,
              statusGroup: 4,
              statusText: "Fim",
              homeCompetitor: { id: 1, name: "Casa" },
              awayCompetitor: { id: 2, name: "Visitante" },
            },
          ],
        }),
      };
    }
    return { ok: true, json: async () => ({ events: [], games: [] }) };
  };
  try {
    const data = await scoreboard(date, "soccer");
    const match = data.matches.find((item) => item.league === "bra.feminino");
    assert.ok(match, "jogo feminino do Brasileirão deve aparecer no placar");
    assert.equal(match.source, "365scores");
    assert.ok(competitions.has("6223"));
    assert.ok(
      espnPaths.every((path) => !path.includes("bra.feminino") && !path.includes("libertadores_feminina")),
      espnPaths.filter((path) => path.includes("feminino")).join(", "),
    );
  } finally {
    globalThis.fetch = original;
  }
});
