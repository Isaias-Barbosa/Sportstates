import test from "node:test";
import assert from "node:assert/strict";
import {
  enrichBrazilSerieARounds,
  geBrazilSerieARoundGamesUrl,
  fetchGeBrazilSeasonRounds,
} from "../server/ge-rounds.mjs";

test("GE round fallback matches dates, home/away teams and known name variants", () => {
  const matches = [
    {
      date: "2026-10-28T22:30:00Z",
      home: { name: "Red Bull Bragantino", short: "BRA" },
      away: { name: "Chapecoense", short: "CHA" },
      venue: "",
    },
    {
      date: "2026-10-29T22:00:00Z",
      home: { name: "Coritiba", short: "CFC" },
      away: { name: "Vitória", short: "VIT" },
      venue: "Estádio informado pela ESPN",
    },
    {
      date: "2026-10-30T22:00:00Z",
      home: { name: "Time sem jogo correspondente", short: "TSC" },
      away: { name: "Visitante", short: "VIS" },
      venue: "",
    },
  ];
  const enriched = enrichBrazilSerieARounds(matches, [
    {
      round: 33,
      games: [
        {
          data_realizacao: "2026-10-28T19:30",
          equipes: {
            mandante: { sigla: "RBB", nome_popular: "Bragantino" },
            visitante: { sigla: "CHA", nome_popular: "Chapecoense" },
          },
          sede: { nome_popular: "Cícero de Souza Marques" },
        },
      ],
    },
    {
      round: 32,
      games: [
        {
          data_realizacao: "2026-10-29T19:00",
          equipes: {
            mandante: { sigla: "CFC", nome_popular: "Coritiba" },
            visitante: { sigla: "VIT", nome_popular: "Vitória" },
          },
          sede: { nome_popular: "Couto Pereira" },
        },
      ],
    },
  ]);
  assert.equal(enriched[0].round, "33");
  assert.equal(enriched[0].venue, "Cícero de Souza Marques");
  assert.equal(enriched[1].round, "32");
  assert.equal(enriched[1].venue, "Estádio informado pela ESPN");
  assert.equal(enriched[2].round, undefined);
});

test("GE round endpoint rejects invalid round numbers", () => {
  assert.throws(() => geBrazilSerieARoundGamesUrl(2026, 0), /Rodada inválida/);
  assert.throws(() => geBrazilSerieARoundGamesUrl(2026, 39), /Rodada inválida/);
});

test("GE season lookup checks all rounds and finds postponed fixtures", async () => {
  const requested = [];
  const schedule = await fetchGeBrazilSeasonRounds(2026, async (url) => {
    const round = Number(new URL(url).pathname.match(/rodada\/(\d+)/)?.[1]);
    requested.push(round);
    return round === 21
      ? [
          {
            data_realizacao: "2026-10-02T20:00",
            equipes: {
              mandante: { sigla: "SAO", nome_popular: "São Paulo" },
              visitante: { sigla: "SAN", nome_popular: "Santos" },
            },
          },
        ]
      : [];
  });
  assert.equal(requested.length, 38);
  assert.equal(schedule.rounds.length, 38);
  assert.deepEqual(schedule.failures, []);
  const [match] = enrichBrazilSerieARounds(
    [
      {
        date: "2026-10-02T23:00:00Z",
        home: { name: "São Paulo", short: "SAO" },
        away: { name: "Santos", short: "SAN" },
      },
    ],
    schedule.rounds,
  );
  assert.equal(match.round, "21");
});
