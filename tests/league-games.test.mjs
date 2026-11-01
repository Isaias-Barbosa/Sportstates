import test from "node:test";
import assert from "node:assert/strict";
import { route } from "../server/api.mjs";
import { dayInBrazil } from "../server/data.mjs";

function event(id, date, state = "pre") {
  return {
    id,
    date,
    competitions: [
      {
        status: { type: { state } },
        competitors: [
          {
            homeAway: "home",
            team: { id: "1", displayName: "Casa" },
            score: "0",
          },
          {
            homeAway: "away",
            team: { id: "2", displayName: "Fora" },
            score: "1",
          },
        ],
      },
    ],
  };
}
test("league games rejects unknown competitions and invalid months before fetching", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("Network must not be called");
  };
  try {
    for (const query of [
      "sport=soccer&league=bad",
      "sport=soccer&league=bra.1&month=2026-13",
      "sport=soccer&league=bra.1&month=2026-1",
    ])
      assert.equal(
        (await route(new URL("http://localhost/api/league-games?" + query)))[0],
        400,
      );
  } finally {
    globalThis.fetch = original;
  }
});
test("league month includes the last Brazilian evening, removes duplicates and preserves match states", async () => {
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (input) => {
    const u = new URL(input);
    requests.push(u);
    if (u.hostname === "api.globoesporte.globo.com")
      return {
        ok: true,
        json: async () =>
          u.pathname.endsWith("/classificacao/")
            ? { rodada: { atual: 33 }, lista_jogos: [] }
            : [],
      };
    return {
      ok: true,
      json: async () => ({
        events:
          u.searchParams.get("dates") === "201902"
            ? [
                event("1", "2019-02-01T01:00Z"),
                event("2", "2019-02-03T23:00Z", "post"),
                event("3", "2019-02-28T22:00Z", "in"),
              ]
            : [
                event("3", "2019-02-28T22:00Z", "in"),
                event("4", "2019-03-01T02:00Z"),
                event("5", "2019-03-01T04:00Z"),
              ],
      }),
    };
  };
  try {
    const [status, data] = await route(
      new URL(
        "http://localhost/api/league-games?sport=soccer&league=bra.1&month=2019-02",
      ),
    );
    assert.equal(status, 200);
    assert.deepEqual(
      data.matches.map((m) => m.id),
      ["2", "3", "4"],
    );
    assert.deepEqual(
      data.matches.map((m) => m.state),
      ["finished", "live", "scheduled"],
    );
    assert.equal(data.partial, false);
    assert.deepEqual(
      requests
        .filter((u) => u.hostname === "site.api.espn.com")
        .map((u) => u.searchParams.get("dates")),
      ["201902", "20190301"],
    );
    assert.ok(
      requests
        .filter((u) => u.hostname === "site.api.espn.com")
        .every((u) => u.pathname.endsWith("/soccer/bra.1/scoreboard")),
    );
    assert.ok(data.matches.every((m) => m.league === "bra.1"));
  } finally {
    globalThis.fetch = original;
  }
});
test("league games use the GE season schedule as a fallback for Brazilian fixtures", async () => {
  const original = globalThis.fetch;
  const month = dayInBrazil(new Date()).slice(0, 7);
  const date = `${month}-15`;
  const requests = [];
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    requests.push(url);
    if (url.hostname === "api.globoesporte.globo.com") {
      const round = Number(url.pathname.match(/rodada\/(\d+)/)?.[1]);
      return {
        ok: true,
        json: async () =>
          round === 33
            ? [
                {
                  data_realizacao: `${date}T19:30`,
                  equipes: {
                    mandante: { sigla: "RBB", nome_popular: "Bragantino" },
                    visitante: { sigla: "CHA", nome_popular: "Chapecoense" },
                  },
                  sede: { nome_popular: "Estádio de teste" },
                },
              ]
            : [],
      };
    }
    const dates = url.searchParams.get("dates");
    return {
      ok: true,
      json: async () => ({
        events:
          dates === date.replaceAll("-", "").slice(0, 6)
            ? [
                {
                  ...event("ge-round-match", `${date}T22:30:00Z`),
                  competitions: [
                    {
                      ...event("ge-round-match", `${date}T22:30:00Z`)
                        .competitions[0],
                      competitors: [
                        {
                          homeAway: "home",
                          team: {
                            id: "1",
                            displayName: "Red Bull Bragantino",
                            abbreviation: "BRA",
                          },
                          score: "0",
                        },
                        {
                          homeAway: "away",
                          team: {
                            id: "2",
                            displayName: "Chapecoense",
                            abbreviation: "CHA",
                          },
                          score: "0",
                        },
                      ],
                    },
                  ],
                },
              ]
            : [],
      }),
    };
  };
  try {
    const [status, data] = await route(
      new URL(
        `http://localhost/api/league-games?sport=soccer&league=bra.1&month=${month}`,
      ),
    );
    assert.equal(status, 200);
    assert.equal(data.roundsUnavailable, false);
    const match = data.matches.find((item) => item.id === "ge-round-match");
    assert.equal(match.round, "33");
    assert.equal(match.venue, "Estádio de teste");
    assert.equal(
      requests.filter((url) => url.hostname === "api.globoesporte.globo.com")
        .length,
      38,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("league games signals partial data when one month boundary request fails", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (input) =>
    new URL(input).searchParams.get("dates") === "202604"
      ? {
          ok: true,
          json: async () => ({ events: [event("6", "2026-04-02T20:00Z")] }),
        }
      : { ok: false, status: 503 };
  try {
    const [status, data] = await route(
      new URL(
        "http://localhost/api/league-games?sport=soccer&league=eng.1&month=2026-04",
      ),
    );
    assert.equal(status, 200);
    assert.equal(data.matches.length, 1);
    assert.equal(data.partial, true);
  } finally {
    globalThis.fetch = original;
  }
});
