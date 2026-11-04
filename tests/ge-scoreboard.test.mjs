import test from "node:test";
import assert from "node:assert/strict";
import { route } from "../server/api.mjs";

test("scores recover two GE rounds after total ESPN outage and share cached requests", async (t) => {
  const date = "2025-06-19";
  const rounds = [];
  let espnFailures = 0;
  const fixture = {
    id: 100,
    data_realizacao: date + "T22:30",
    equipes: {
      mandante: { id: 1, nome_popular: "Bragantino", sigla: "RBB" },
      visitante: { id: 2, nome_popular: "Santos", sigla: "SAN" },
    },
    placar_oficial_mandante: 2,
    placar_oficial_visitante: 1,
    transmissao: { broadcast: { id: "ENCERRADA" } },
  };
  t.mock.method(globalThis, "fetch", async (input) => {
    const url = new URL(input);
    if (url.hostname === "api.globoesporte.globo.com") {
      const round = Number(url.pathname.match(/rodada\/(\d+)/)[1]);
      rounds.push(round);
      if (round === 18) return Response.json([]);
      if (round === 19) return Response.json([fixture, fixture]);
      if (round === 20)
        return Response.json([
          {
            ...fixture,
            id: 101,
            data_realizacao: "2025-06-20T01:30:00Z",
            equipes: {
              ...fixture.equipes,
              visitante: { id: 3, nome_popular: "Bahia" },
            },
          },
        ]);
      return new Response(null, { status: 503 });
    }
    if (url.hostname === "webws.365scores.com")
      return Response.json({ games: [] });
    if (url.pathname.includes("/soccer/bra.1/scoreboard")) {
      espnFailures++;
      return new Response(null, { status: 503 });
    }
    return Response.json({ events: [] });
  });
  const url = new URL(
    "https://sportstates.test/api/scores?sport=soccer&date=" + date,
  );
  const [[status, data], [secondStatus]] = await Promise.all([
    route(url),
    route(url),
  ]);
  assert.equal(status, 200);
  assert.equal(secondStatus, 200);
  assert.equal(espnFailures, 2);
  assert.deepEqual(rounds, [19, 18, 20]);
  const games = data.matches.filter(({ league }) => league === "bra.1");
  assert.deepEqual(games.map(({ round }) => round).sort(), ["19", "20"]);
  assert.ok(
    games.every(
      ({ date: kickoff }) =>
        Date.parse(kickoff) === Date.parse("2025-06-20T01:30:00Z"),
    ),
  );
  assert.ok(games.every(({ state }) => state === "finished"));
  const source = data.sources.find(({ league }) => league === "bra.1");
  assert.equal(source.provider, "GE");
  assert.equal(source.state, "partial");

  const requestRound = (round) =>
    route(
      new URL(
        "https://sportstates.test/api/ge-fixtures?year=2025&round=" + round,
      ),
    );
  assert.equal((await requestRound(19))[0], 200);
  assert.equal((await requestRound(21))[0], 503);
  assert.equal((await requestRound(22))[0], 503);
  assert.equal((await requestRound(20))[0], 200);
  assert.deepEqual(rounds, [19, 18, 20, 21]);
});
