import test from "node:test";
import assert from "node:assert/strict";
import { route } from "../server/api.mjs";
import { nationalEvents, nationalTeams, nationalTeamDetails, nationalPlayer } from "../server/national-football.mjs";

test("2026 World Cup includes all teams, matches and linked roster profiles", async () => {
  const teams = nationalTeams.filter(team => team.nationalCompetitions.includes("fifa.world"));
  assert.equal(teams.length, 48);
  assert.equal(nationalEvents("fifa.world").length, 104);
  assert.equal(new Set(nationalEvents("fifa.world").map(event => event.id)).size, 104);
  for (const team of teams) {
    const details = nationalTeamDetails(team.id);
    assert.ok(details.athletes.length > 0);
    assert.ok(details.athletes.every(player => nationalPlayer(player.profileId)?.name === player.name));
  }
  const [status, standings] = await route(new URL("https://app.test/api/standings?sport=soccer&league=fifa.world"));
  assert.equal(status, 200);
  assert.equal(standings.groups.length, 12);
  assert.equal(standings.rounds.flatMap(round => round.fixtures).length, 32);
});

test("both Nations Leagues have squads and friendlies have a 2026 calendar", () => {
  for (const [league, count] of [["uefa.nations", 54], ["concacaf.nations.league", 41]]) {
    const teams = nationalTeams.filter(team => team.nationalCompetitions.includes(league));
    assert.equal(teams.length, count);
    assert.ok(teams.every(team => nationalTeamDetails(team.id).athletes.some(player =>
      nationalPlayer(player.profileId).memberships.some(m => m.id === team.id))));
  }
  assert.ok(nationalEvents("fifa.friendly").some(event => event.date >= "2026-11-01"));
});
