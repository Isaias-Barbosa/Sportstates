import assert from "node:assert/strict";
import test from "node:test";
import { route } from "../server/api.mjs";
import { dayInBrazil } from "../server/data.mjs";

test("F1 exposes the season calendar and race classification independently", async (t) => {
  const season = dayInBrazil(new Date()).slice(0, 4);
  const race = {
    season,
    round: "2",
    raceName: "Brazilian Grand Prix",
    date: season + "-11-08",
    time: "17:00:00Z",
    Circuit: {
      circuitName: "Interlagos",
      Location: { locality: "São Paulo", country: "Brazil" },
    },
  };
  const result = {
    ...race,
    Results: [
      {
        position: "1",
        positionText: "1",
        Driver: {
          driverId: "sample",
          givenName: "Sample",
          familyName: "Driver",
        },
        Constructor: { name: "Sample Team" },
        Time: { time: "1:30:00" },
        status: "Finished",
      },
    ],
  };
  const calls = [];
  t.mock.method(globalThis, "fetch", async (input) => {
    const url = new URL(input);
    calls.push(url.pathname);
    assert.equal(url.hostname, "api.jolpi.ca");
    const races = url.pathname.includes("/results/")
      ? [result]
      : [
          race,
          {
            ...race,
            round: "1",
            raceName: "Earlier Grand Prix",
            time: undefined,
          },
        ];
    return Response.json({ MRData: { RaceTable: { season, Races: races } } });
  });
  const endpoint = "https://sportstates.test/api/f1";
  assert.equal((await route(new URL(endpoint + "?round=../drivers")))[0], 400);
  assert.deepEqual(calls, []);
  const [[status, calendar], [, duplicate], [resultStatus, latest]] =
    await Promise.all([
      route(new URL(endpoint)),
      route(new URL(endpoint)),
      route(new URL(endpoint + "?round=last")),
    ]);
  assert.equal(status, 200);
  assert.deepEqual(duplicate.races, calendar.races);
  assert.deepEqual(
    calendar.races.map(({ round }) => round),
    [1, 2],
  );
  assert.equal(calendar.races[0].startsAt, null);
  assert.equal(calendar.races[1].startsAt, season + "-11-08T17:00:00Z");
  assert.equal(resultStatus, 200);
  assert.equal(latest.result.drivers[0].name, "Sample Driver");
  assert.equal(latest.result.race.round, 2);
  assert.equal(calls.length, 2);
});
