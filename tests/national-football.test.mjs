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

test("selection profiles expose confirmed phases and links to competitions", async () => {
  const [status, profile] = await route(new URL("https://app.test/api/team-competitions?id=164"));
  assert.equal(status, 200);
  const worldCup = profile.competitions.find(c => c.id === "fifa.world");
  const nationsLeague = profile.competitions.find(c => c.id === "uefa.nations");
  assert.equal(worldCup.phase, "Final");
  assert.equal(worldCup.status, "champion");
  assert.equal(nationsLeague.phase, "Fase de liga");
  assert.match(nationsLeague.href, /league=uefa.nations$/);
});

test("a saved national fixture opens with its confirmed broadcasts when ESPN summary fails", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  const [status, detail] = await route(new URL("https://app.test/api/match?sport=soccer&league=fifa.friendly&id=401916337"));
  assert.equal(status, 200);
  assert.equal(detail.match.id, "401916337");
  assert.equal(detail.match.watch.confirmedForMatch, true);
  assert.ok(detail.match.watch.links.some(link => link.id === "globo"));
  assert.equal(detail.stale, true);
  assert.match(detail.source, /cadastro local/);
});

test("Alisson shows the Liverpool crest, Brazil tournament stats and verified award", async () => {
  const [status, player] = await route(new URL("https://app.test/api/player?id=espn-196876"));
  assert.equal(status, 200);
  assert.equal(player.currentClub.name, "Liverpool");
  assert.match(player.currentClub.logo, /\/364\.png$/);
  assert.match(player.currentClub.url, /\/364$/);
  const worldCup = player.competitions.find(item => item.league === "fifa.world");
  assert.equal(worldCup.stats.games, 5);
  assert.equal(worldCup.stats.saves, 14);
  assert.ok(player.awards.some(award => award.name === "Luva de Ouro · Copa América 2019"));
  const { leaders } = nationalTeamDetails("205");
  assert.equal(leaders.league, "fifa.world");
  assert.ok(leaders.goals.players.some(player => player.id === "espn-252107"));
});
