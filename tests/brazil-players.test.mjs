import test from "node:test";
import assert from "node:assert/strict";
import { parseBrazilPlayerMatch } from "../server/brazil-players.mjs";

const stats = (fields) =>
  Object.entries(fields).map(([name, value]) => ({ name, value }));
const player = (id, fields) => ({
  athlete: { id: String(id), displayName: `Atleta ${id}` },
  stats: stats(fields),
});
function fixture(league) {
  return {
    header: {
      id: "100",
      league: { slug: league },
      season: { year: 2026 },
      competitions: [
        {
          date: "2026-11-04T22:30Z",
          status: { type: { completed: true, name: "STATUS_FULL_TIME" } },
          competitors: [{ id: "1" }, { id: "2" }],
        },
      ],
    },
    rosters: [1, 2].map((team) => ({
      team: { id: String(team), displayName: `Clube ${team}` },
      roster: Array.from({ length: 11 }, (_, index) =>
        player(team * 100 + index, {
          appearances: 1,
          totalGoals: index === 0 ? 1 : 0,
          goalAssists: 0,
          yellowCards: 0,
          redCards: 0,
        }),
      ),
    })),
  };
}

test("imports played matches for each league and preserves missing fields", () => {
  for (const league of ["bra.1", "bra.2"]) {
    const raw = fixture(league);
    raw.rosters[0].roster[0].stats = stats({ appearances: 1, totalGoals: 1 });
    raw.rosters[0].roster.push(player(190, { appearances: 0 }));
    raw.rosters[0].roster.push(player(191, { appearances: 0, yellowCards: 1 }));
    const match = parseBrazilPlayerMatch(raw, league, "100");
    assert.equal(match.players.length, 23);
    assert.deepEqual(match.players[0].stats, {
      games: 1,
      goals: 1,
      assists: null,
      yellows: null,
      reds: null,
    });
    assert.equal(match.players.find((p) => p.id === "191").stats.games, 0);
  }
});

test("rejects unfinished, foreign, incomplete and duplicated match data", () => {
  const raw = fixture("bra.1");
  assert.equal(parseBrazilPlayerMatch(raw, "bra.2", "100"), null);
  assert.equal(parseBrazilPlayerMatch(raw, "bra.1", "101"), null);
  raw.rosters[0].roster.push(raw.rosters[0].roster[0]);
  assert.equal(parseBrazilPlayerMatch(raw, "bra.1", "100"), null);
  raw.rosters[0].roster.splice(10);
  assert.equal(parseBrazilPlayerMatch(raw, "bra.1", "100"), null);
  const live = fixture("bra.1");
  live.header.competitions[0].status.type.completed = false;
  assert.equal(parseBrazilPlayerMatch(live, "bra.1", "100"), null);
});
