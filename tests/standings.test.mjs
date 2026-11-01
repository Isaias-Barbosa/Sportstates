import test from "node:test";
import assert from "node:assert/strict";
import { normalizeStandings } from "../server/standings.mjs";
import { route } from "../server/api.mjs";
import { clearAllCaches } from "../server/cache.mjs";

test("normalizes nested groups, provider order and zero statistics", () => {
  const groups = normalizeStandings({
    children: [
      {
        name: "Grupo A",
        standings: {
          entries: [
            {
              team: {
                id: "2",
                displayName: "Time B",
                logos: [{ href: "https://example.com/b.png" }],
              },
              stats: [
                { name: "points", value: 0 },
                { name: "rank", displayValue: "1" },
              ],
            },
            {
              team: { id: "1", displayName: "Time A" },
              stats: [{ name: "points", displayValue: "3" }],
            },
          ],
        },
      },
    ],
  });
  assert.equal(groups[0].name, "Grupo A");
  assert.deepEqual(
    groups[0].rows.map((x) => x.id),
    ["2", "1"],
  );
  assert.equal(groups[0].rows[0].stats.points, "0");
  assert.equal(groups[0].rows[0].logo, "https://example.com/b.png");
});
test("catalog includes both Brazilian divisions and rejects invalid standings", async () => {
  const original = globalThis.fetch;
  const past = new Date(Date.now() - 60_000).toISOString();
  globalThis.fetch = async (url) => ({
    ok: true,
    json: async () =>
      String(url).includes("apiweb.fef.ec")
        ? {
            status_code: 200,
            success: true,
            data: {
              stages: [
                {
                  dates: [
                    {
                      groups: [
                        {
                          matches: [
                            {
                              match_date: past.slice(0, 10),
                              home_goals: 1,
                              away_goals: 0,
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          }
        : {
            events: [
              {
                date: past,
                status: { type: { state: "post" } },
              },
            ],
          },
  });
  try {
    const [, catalog] = await route(
      new URL("http://localhost/api/competitions"),
    );
    const soccer = catalog.sports.find((s) => s.id === "soccer");
    assert.ok(soccer.leagues.some((l) => l.id === "bra.1"));
    assert.ok(soccer.leagues.some((l) => l.id === "bra.2"));
    assert.equal(
      (
        await route(
          new URL("http://localhost/api/standings?sport=../../&league=foo"),
        )
      )[0],
      400,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("standings route requests the selected competition and normalizes its response", async () => {
  const original = globalThis.fetch;
  let requested;
  globalThis.fetch = async (url) => {
    requested = new URL(url);
    return {
      ok: true,
      json: async () => ({
        children: [
          {
            name: "Tabela",
            standings: {
              entries: [
                {
                  team: { id: "1", displayName: "Equipe" },
                  stats: [{ name: "points", displayValue: "10" }],
                },
              ],
            },
          },
        ],
      }),
    };
  };
  try {
    const [status, result] = await route(
      new URL("http://localhost/api/standings?sport=soccer&league=bra.2"),
    );
    assert.equal(status, 200);
    assert.match(requested.pathname, /soccer\/bra\.2\/standings$/);
    assert.equal(result.groups[0].rows[0].stats.points, "10");
  } finally {
    globalThis.fetch = original;
  }
});
test("regiões locais e torneios internacionais ficam separados, sem perder competições", async () => {
  await clearAllCaches({ shared: false });
  const original = globalThis.fetch;
  const past = new Date(Date.now() - 60_000).toISOString();
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    if (url.hostname === "webws.365scores.com")
      return {
        ok: true,
        json: async () => ({
          games: [
            {
              id: 123,
              competitionId: Number(url.searchParams.get("competitions")),
              startTime: past,
              statusGroup: 4,
              statusText: "Fim",
              homeCompetitor: { id: 1, name: "Casa" },
              awayCompetitor: { id: 2, name: "Visitante" },
            },
          ],
        }),
      };
    if (url.hostname === "apiweb.fef.ec")
      return {
        ok: true,
        json: async () => ({
          status_code: 200,
          success: true,
          data: {
            stages: [
              {
                dates: [
                  {
                    groups: [
                      {
                        matches: [
                          {
                            match_date: new Date(
                              Date.now() - 3 * 24 * 60 * 60 * 1000,
                            )
                              .toISOString()
                              .slice(0, 10),
                            home_goals: 0,
                            away_goals: 0,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        }),
      };
    return {
      ok: true,
      json: async () => ({
        events: [
          {
            date: past,
            status: { type: { state: "post" } },
          },
        ],
      }),
    };
  };
  let catalog;
  try {
    [, catalog] = await route(new URL("http://localhost/api/competitions"));
  } finally {
    globalThis.fetch = original;
  }
  const leagues = catalog.sports.find((s) => s.id === "soccer").leagues;
  const ids = leagues.map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length);
  const brasil = catalog.soccerRegions.find((r) => r.id === "brasil");
  const argentina = catalog.soccerRegions.find((r) => r.id === "argentina");
  const england = catalog.soccerRegions.find((r) => r.id === "inglaterra");
  const southAmericanLeagues = ["arg.1", "col.1", "chi.1", "uru.1", "ecu.1"];
  const featuredLeagues = [...southAmericanLeagues, "mex.1"];
  assert.deepEqual(brasil.competitions, [
    "bra.1",
    "bra.2",
    "bra.3",
    "bra.4",
    "bra.copa_do_brazil",
    "bra.copa_do_nordeste",
    "bra.copa_verde",
    "bra.copa_paulista",
    "bra.copa_alagoas",
    "bra.copa_santa_catarina",
    "bra.copa_fares_lopes",
    "bra.copa_rio",
    "bra.copa_espirito_santo",
    "bra.copa_fgf",
    "bra.copa_governo_sergipe",
    "bra.copa_sul_sudeste",
    "bra.copa_parana",
  ]);
  assert.deepEqual(argentina.competitions, [
    "arg.1",
    "arg.copa",
    "arg.trofeo_de_la_campeones",
    "arg.supercopa",
    "arg.supercopa.internacional",
  ]);
  assert.ok(featuredLeagues.every((id) => ids.includes(id)));
  assert.ok(
    [
      "mex.campeon",
      "col.copa",
      "col.superliga",
      "chi.copa_chi",
      "chi.super_cup",
      "ecu.copa_2026",
      "ecu.supercopa_2026",
    ].every((id) => ids.includes(id)),
  );
  assert.ok(leagues.find((l) => l.id === "arg.copa").tournamentStarted);
  assert.ok(
    leagues.find((l) => l.id === "arg.1").tournamentFormat.includes("Apertura"),
  );
  assert.ok(
    leagues.find((l) => l.id === "mex.1").tournamentFormat.includes("Clausura"),
  );
  assert.ok(leagues.find((l) => l.id === "col.1").teamLeague);
  assert.ok(
    [
      "bra.camp.carioca",
      "bra.camp.paulista",
      "bra.camp.gaucho",
      "bra.camp.mineiro",
    ].every((id) => brasil.stateCompetitions.includes(id)),
  );
  assert.ok(!brasil.competitions.includes("conmebol.libertadores"));
  assert.deepEqual(england.competitions, ["eng.1", "eng.fa", "eng.league_cup"]);
  const americas = catalog.soccerInternationalGroups.find(
    (g) => g.id === "americas",
  );
  const internationals = catalog.soccerInternationalGroups.find(
    (g) => g.id === "international",
  );
  assert.ok(
    [
      "conmebol.libertadores",
      "conmebol.sudamericana",
      "concacaf.champions",
      "concacaf.leagues.cup",
    ].every((id) => americas.competitions.includes(id)),
  );
  assert.ok(
    ["uefa.champions", "uefa.europa", "uefa.europa.conf"].every((id) =>
      internationals.competitions.includes(id),
    ),
  );
  assert.ok(ids.includes("usa.1") && ids.includes("ksa.1"));
  const grouped = [
    ...catalog.soccerRegions,
    ...catalog.soccerInternationalGroups,
  ].flatMap((g) => [...g.competitions, ...(g.stateCompetitions || [])]);
  assert.equal(new Set(grouped).size, grouped.length);
  assert.deepEqual([...grouped].sort(), [...ids].sort());
  assert.ok(leagues.find((l) => l.id === "usa.1").teamLeague);
  assert.ok(!leagues.find((l) => l.id === "uefa.champions").teamLeague);
  assert.ok(leagues.find((l) => l.id === "concacaf.champions").hasKnockout);
});
