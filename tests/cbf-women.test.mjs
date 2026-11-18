import test from "node:test";
import assert from "node:assert/strict";
import {
  CBF_WOMEN_PHASES,
  cbfWomenPhase,
  cbfWomenDate,
  normalizeCbfWomenGame,
  normalizeCbfWomenScorers,
  cbfWomenRounds,
} from "../server/cbf-women.mjs";
import { leagueStatisticsConfig, leagueRanking } from "../server/league-statistics.mjs";
import { route } from "../server/api.mjs";
import { clearAllCaches } from "../server/cache.mjs";

test("the four Brasileirão Feminino phases are identified from CBF names", () => {
  assert.deepEqual(
    CBF_WOMEN_PHASES.map((phase) => phase.id),
    ["1994", "2097", "2102", "2113"],
  );
  assert.equal(cbfWomenPhase("1ª Fase")?.id, "1994");
  assert.equal(cbfWomenPhase("4ª fase")?.name, "4ª Fase · Final");
  assert.equal(cbfWomenPhase("Fase única"), null);
});

test("CBF kickoff dates use the fixed Brasília offset", () => {
  assert.equal(
    cbfWomenDate(" 26/09/2026", "16:30"),
    "2026-09-26T19:30:00.000Z",
  );
  assert.equal(cbfWomenDate("31/02/2026", "16:30"), null);
});

test("CBF games preserve official phases, scores and broadcasters", () => {
  const phase = cbfWomenPhase("4ª fase");
  const match = normalizeCbfWomenGame(
    {
      ref_jogo: "835387",
      rodada: "1",
      data: " 26/09/2026",
      hora: "16:30",
      transmissao: "GE TV, Globo, NSports, Sportv, TV Brasil, UOL",
      estadio: "Neo Química Arena",
      cidade: "Sao Paulo",
      uf: "SP",
      mandante: { id: "20001", nome: "Corinthians", gols: "1", panaltis: "", url_escudo: "https://conteudo.cbf.com.br/clubes/20001/escudo.jpg" },
      visitante: { id: "20005", nome: "São Paulo", gols: "2", panaltis: "", url_escudo: "https://conteudo.cbf.com.br/clubes/20005/escudo.jpg" },
    },
    phase,
  );
  assert.equal(match.id, "835387");
  assert.equal(match.state, "finished");
  assert.equal(match.home.score, "1");
  assert.equal(match.away.score, "2");
  assert.equal(match.away.winner, true);
  assert.equal(match.seasonPhase, "4ª Fase · Final");
  assert.match(match.broadcast, /Sportv/);
  assert.equal(match.home.logo, "https://conteudo.cbf.com.br/clubes/20001/escudo.jpg");
});

test("CBF scorers are normalized without inventing stats", () => {
  const leaders = normalizeCbfWomenScorers(
    {
      atletas: [
        { id: "672543", gols: "11", apelido: "Marilia", nome: "Marilia da Cruz Furiel", clube: { nome: "Cruzeiro-MG", url_escudo: "https://conteudo.cbf.com.br/clubes/59849/escudo.jpg" } },
        { id: "310048", gols: "9", apelido: "Bia Zaneratto", nome: "Beatriz Zaneratto Joao", clube: { nome: "Palmeiras", url_escudo: "" } },
      ],
    },
    1,
  );
  assert.equal(leaders.length, 2);
  assert.equal(leaders[0].name, "Marilia");
  assert.equal(leaders[0].value, 11);
  assert.equal(leaders[0].teamName, "Cruzeiro-MG");
  assert.equal(leaders[1].position, 2);
});

test("league statistics expose CBF scorers only for Brasileirão Feminino", () => {
  const config = leagueStatisticsConfig("soccer", "bra.feminino");
  assert.equal(config.source, "CBF");
  assert.deepEqual(config.metrics.map((m) => m.id), ["goals"]);
  assert.equal(leagueStatisticsConfig("soccer", "bra.1").source, "ESPN");
});

test("standings include the CBF phases and the final match", async () => {
  await clearAllCaches({ shared: false });
  const original = globalThis.fetch;
  const table = {
    "1ª Fase": { tipo: "pontuacao", jogos: [] },
    "4ª fase": {
      tipo: "eliminacao",
      jogos: [
        {
          ref_jogo: "835387",
          rodada: "1",
          data: " 26/09/2026",
          hora: "16:30",
          transmissao: "Globo, Sportv",
          mandante: { nome: "Corinthians", gols: "1", panaltis: "" },
          visitante: { nome: "São Paulo", gols: "2", panaltis: "" },
        },
      ],
    },
  };
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    if (url.pathname === "/api/cbf/jogos/tabela-detalhada/campeonato/1260614")
      return { ok: true, json: async () => table };
    if (url.pathname === "/web/standings/")
      return { ok: true, json: async () => ({ standings: [{ competitionId: 6223, rows: [{ competitor: { id: 1, name: "Corinthians" }, position: 1, points: 3 }] }] }) };
    return { ok: true, json: async () => ({ games: [], events: [] }) };
  };
  try {
    const [status, result] = await route(
      new URL("http://localhost/api/standings?sport=soccer&league=bra.feminino"),
    );
    assert.equal(status, 200);
    assert.equal(result.provider, "cbf");
    assert.ok(result.rounds.length >= 1);
    const final = result.rounds.find((round) => round.phaseId === "2113");
    assert.ok(final, "a 4ª fase (final) deve estar disponível");
    assert.equal(final.fixtures[0].home.name, "Corinthians");
  } finally {
    globalThis.fetch = original;
  }
});
