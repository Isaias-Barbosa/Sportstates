import test from "node:test";
import assert from "node:assert/strict";
import {
  tableLeague,
  mergeTableCards,
  normalizeTableCalendar,
  tableMatchId,
  tableStartDate,
  normalizeTableMatch,
  normalizeTableRankings,
  TABLE_COMPETITIONS,
} from "../server/table-tennis.mjs";
import { leagueFor } from "../server/catalog.mjs";
const event = {
  id: "3250",
  league: "champions",
  name: "WTT Champions Montpellier 2026",
};
const unit = {
  Code: "TTEMSINGLES-----------R32-000400--",
  SubEvent: "Men's Singles",
  EventCategory: "SEN",
  StartDate: "2026-10-29T14:20:00",
  ScheduleStatus: "Scheduled",
  Round: "R32-",
  StartList: {
    Start: [
      {
        StartOrder: 2,
        Competitor: {
          Code: "115641",
          Description: { TeamName: "CALDERANO Hugo" },
        },
      },
      {
        StartOrder: 1,
        Competitor: {
          Code: "134442",
          Description: { TeamName: "SHINOZUKA Hiroto" },
        },
      },
    ],
  },
};
const card = {
  documentCode: unit.Code.padEnd(42, "-"),
  resultStatus: "OFFICIAL",
  currentGameNumber: 3,
  overallScores: "0-3",
  gameScores: "7-11,10-12,5-11,0-0,0-0",
  matchDateTime: { startDateUTC: "10/29/2026 13:20:00" },
  competitiors: [
    {
      competitorType: "A",
      competitiorId: "115641",
      competitiorName: "CALDERANO Hugo",
    },
    {
      competitorType: "H",
      competitiorId: "134442",
      competitiorName: "SHINOZUKA Hiroto",
    },
  ],
};
test("WTT calendar classifies the senior circuits and excludes youth, para and teams", () => {
  for (const [title, id] of [
    ["China Smash 2026", "grand-smash"],
    ["WTT Star Contender London 2026", "star-contender"],
    ["WTT Champions Montpellier 2026", "champions"],
    ["WTT Feeder Chennai 2026", "feeder"],
    ["ITTF World Table Tennis Championships Finals", "world-championships"],
    ["ITTF Men’s & Women’s World Cup Macao 2026", "world-cup"],
  ])
    assert.equal(tableLeague(title), id);
  for (const title of [
    "WTT Youth Contender",
    "ITTF World Team Championships",
    "World Para Future",
    "TEST",
  ])
    assert.equal(tableLeague(title), null);
});
test("calendar parses actual dates, rejects impossible dates and deduplicates canonical events", () => {
  const name = "WTT Champions Montpellier 2026 (27 Oct 2026 - 01 Nov 2026)";
  const r = normalizeTableCalendar([
    { eventId: 3527, eventName: name },
    { eventId: 3250, eventName: name },
    { eventId: 1, eventName: "WTT Feeder A (31 Feb 2026 - 02 Mar 2026)" },
  ]);
  assert.equal(r.length, 1);
  assert.equal(r[0].id, "3250");
  assert.equal(r[0].start, "2026-10-27");
});
test("all table-tennis competitions are registered without inventing ESPN competitions", () => {
  assert.equal(TABLE_COMPETITIONS.length, 8);
  for (const [id] of TABLE_COMPETITIONS)
    assert.equal(leagueFor("table-tennis", id).league, id);
});
test("schedule and result document padding produces the same numeric route id", () => {
  assert.equal(
    tableMatchId("3250", unit.Code),
    tableMatchId("3250", card.documentCode),
  );
  assert.match(tableMatchId("3250", unit.Code), /^\d{15}$/);
  assert.notEqual(
    tableMatchId("3251", unit.Code),
    tableMatchId("3250", unit.Code),
  );
});
test("official UTC timestamp wins; local scheduled timestamps account for daylight savings", () => {
  assert.equal(tableStartDate(unit, card, {}), "2026-10-29T13:20:00.000Z");
  assert.equal(
    tableStartDate(unit, null, { countryCode: "FRA" }),
    "2026-10-29T13:20:00.000Z",
  );
  assert.equal(
    tableStartDate({ ...unit, StartDate: "2026-07-29T14:20:00" }, null, {
      countryCode: "FRA",
    }),
    "2026-07-29T12:20:00.000Z",
  );
  assert.equal(
    tableStartDate(unit, null, { countryCode: "IND" }),
    "2026-10-29T08:50:00.000Z",
  );
  assert.equal(tableStartDate(unit, null, { countryCode: "USA" }), null);
});
test("official results retain home/away, scores, winner and played sets only", () => {
  const m = normalizeTableMatch(unit, card, event);
  assert.equal(m.home.name, "SHINOZUKA Hiroto");
  assert.equal(m.away.name, "CALDERANO Hugo");
  assert.equal(m.away.score, "3");
  assert.equal(m.away.winner, true);
  assert.equal(m.state, "finished");
  assert.equal(m.setScores.length, 3);
  assert.deepEqual(m.setScores[1], { number: 2, home: "10", away: "12" });
  assert.equal(m.round, "16 avos de final");
});
test("scheduled matches never fabricate points, winners or live status", () => {
  const m = normalizeTableMatch(unit, null, event, { countryCode: "FRA" });
  assert.ok(m.watch.links.some(l => l.id === "cazetv"));
  assert.equal(m.watch.confirmedForMatch, false);
  assert.equal(m.state, "scheduled");
  assert.equal(m.home.score, null);
  assert.equal(m.home.winner, false);
  assert.deepEqual(m.setScores, []);
});
test("explicit live snapshots retain current game points and zero scores", () => {
  const m = normalizeTableMatch(
    unit,
    {
      ...card,
      resultStatus: "INTERMEDIATE",
      currentGameNumber: 2,
      overallScores: "1-0",
      gameScores: "11-9,0-0,0-0,0-0,0-0",
    },
    event,
  );
  assert.equal(m.state, "live");
  assert.equal(m.period, 2);
  assert.equal(m.away.score, "0");
  assert.equal(m.setScores.length, 2);
  assert.equal(m.setScores[1].home, "0");
});
test("women, doubles, junior categories and undefined opponents cannot leak into senior singles", () => {
  for (const u of [
    { ...unit, Code: unit.Code.replace("TTEM", "TTEW") },
    { ...unit, SubEvent: "Men's Doubles" },
    { ...unit, EventCategory: "U19" },
    { ...unit, Code: "TTEMSINGLES--------U19FNL000100--" },
  ])
    assert.equal(normalizeTableMatch(u, card, event), null);
  assert.equal(
    normalizeTableMatch({ ...unit, StartList: { Start: [] } }, null, event, {
      countryCode: "FRA",
    }),
    null,
  );
});
test("ranking retains real points, previous position and world category without photos or fabricated ages", () => {
  const r = normalizeTableRankings({
    Result: [
      {
        IttfId: "115641",
        PlayerName: "Hugo CALDERANO",
        CategoryCode: "SEN",
        SubEventCode: "MS",
        CurrentRank: "5",
        PreviousRank: "6",
        RankingPointsYTD: "5120",
        CountryName: "Brazil",
        PublishDate: "10/26/2026 00:00:00",
      },
      { CategoryCode: "SEN", SubEventCode: "WS" },
    ],
  });
  assert.equal(r.players.length, 1);
  assert.equal(r.players[0].points, 5120);
  assert.equal(r.players[0].previous, 6);
  assert.equal(r.players[0].photo, null);
});

test("WTT data reaches public scores, match detail, athletes, standings and league games routes", async () => {
  const { route, scoreboard } = await import("../server/api.mjs");
  const original = globalThis.fetch;
  const calendar = [
    {
      eventId: 3250,
      eventName: "WTT Champions Montpellier 2026 (27 Oct 2026 - 01 Nov 2026)",
    },
  ];
  globalThis.fetch = async (input, options) => {
    const url = String(input);
    let body;
    if (url.includes("GetAllEventsOnlyWithEventName")) body = calendar;
    else if (url.includes("GetEventSchedule"))
      body = [
        { Competition: { Unit: [unit, { ...unit, Code: card.documentCode }] } },
      ];
    else if (url.includes("GetAllEventsWithIds")) {
      assert.equal(options.method, "POST");
      body = [{ eventId: 3250, countryCode: "FRA" }];
    } else if (url.includes("GetOfficialResult"))
      body = JSON.stringify([{ match_card: card, fullResults: "OFFICIAL" }]);
    else if (url.endsWith("MatchCards")) {
      assert.equal(options.method, "POST");
      body = [card];
    } else if (url.includes("GetRankingIndividuals"))
      body = {
        Result: [
          {
            IttfId: "115641",
            PlayerName: "Hugo CALDERANO",
            CategoryCode: "SEN",
            SubEventCode: "MS",
            CurrentRank: "5",
            PreviousRank: "6",
            RankingPointsYTD: "5120",
            CountryName: "Brazil",
          },
        ],
      };
    else if (url.includes("espn")) body = { events: [] };
    else throw Error("Other source not part of this fixture");
    return new Response(JSON.stringify(body), { status: 200 });
  };
  try {
    const scores = await scoreboard("2026-10-29");
    assert.equal(
      scores.matches.filter((m) => m.sport === "table-tennis").length,
      1,
    );
    const id = tableMatchId("3250", unit.Code);
    const [status, detail] = await route(
      new URL(
        `https://app.test/api/match?sport=table-tennis&league=champions&id=${id}`,
      ),
    );
    assert.equal(status, 200);
    assert.equal(detail.match.away.name, "CALDERANO Hugo");
    const [athleteStatus, athletes] = await route(
      new URL("https://app.test/api/table-tennis-athletes"),
    );
    assert.equal(athleteStatus, 200);
    assert.equal(athletes.players.length, 1);
    const [rankStatus, ranks] = await route(
      new URL(
        "https://app.test/api/standings?sport=table-tennis&league=champions",
      ),
    );
    assert.equal(rankStatus, 200);
    assert.equal(ranks.groups[0].rows[0].stats.points, "5120");
    const [gamesStatus, games] = await route(
      new URL(
        "https://app.test/api/league-games?sport=table-tennis&league=champions&month=2026-10",
      ),
    );
    assert.equal(gamesStatus, 200);
    assert.equal(games.matches.length, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("ranking accepts the official endpoint double-encoded JSON response", () => {
  const data = {
    Result: [
      {
        IttfId: "115641",
        PlayerName: "Hugo CALDERANO",
        CategoryCode: "SEN",
        SubEventCode: "MS",
        CurrentRank: "5",
        PreviousRank: "6",
        RankingPointsYTD: "5120",
        CountryName: "Brazil",
      },
    ],
  };
  assert.equal(
    normalizeTableRankings(JSON.stringify(data)).players[0].id,
    "115641",
  );
  assert.throws(() => normalizeTableRankings("invalid json"));
});

test("official final results replace stale intermediate match cards", () => {
  const stale = {
    ...card,
    resultStatus: "INTERMEDIATE",
    overallScores: "0-0",
    gameScores: "0-0",
    currentGameNumber: 1,
  };
  const merged = mergeTableCards(
    [stale],
    [{ match_card: card, fullResults: "OFFICIAL" }],
  );
  const result = normalizeTableMatch(unit, [...merged.values()][0], event);
  assert.equal(result.state, "finished");
  assert.equal(result.away.score, "3");
  assert.equal(result.setScores.length, 3);
});
