import test from "node:test";
import assert from "node:assert/strict";
import {
  ecuadorCupClubProfileReferences,
  ecuadorCupClubProfiles,
  validateEcuadorCupClubProfiles,
} from "../server/ecuador-cup-club-profiles.mjs";
import {
  ecuadorCupHasStarted,
  fetchEcuadorCupStandings,
} from "../server/ecuador-cups.mjs";
import {
  providerTeamId,
  teamProfileId,
  validProfileId,
} from "../server/team-identity.mjs";

test("Copa Ecuador profiles are distinct, sourced, and linked to public maps", () => {
  assert.equal(ecuadorCupClubProfiles.clubs.length, 35);
  assert.equal(ecuadorCupClubProfiles.expectedTotal, 35);
  for (const club of ecuadorCupClubProfiles.clubs) {
    assert.ok(validProfileId(club.id));
    assert.equal(club.league, "ecu.copa_2026");
    assert.ok(club.logo.startsWith("https://"));
    assert.ok(
      club.sources.some((source) =>
        source.url.startsWith("https://www.google.com/maps/search/"),
      ),
    );
    assert.equal(ecuadorCupClubProfileReferences(club.id).length, 3);
  }
});

test("invalid FEF IDs and unsafe profile references fail validation", () => {
  assert.ok(validProfileId("fef-club-with-dashes"));
  assert.equal(providerTeamId("fef-club-with-dashes"), "fef-club-with-dashes");
  assert.throws(() =>
    teamProfileId("fef-club-with-dashes", "soccer", "ecu.copa_2026"),
  );
  const data = structuredClone(ecuadorCupClubProfiles);
  data.clubs[0].sources[0].url = "javascript:alert(1)";
  assert.throws(() => validateEcuadorCupClubProfiles(data));
});

test("FEF standings retain cup-only club IDs and are marked as official source data", async () => {
  const cupOnly = ecuadorCupClubProfiles.clubs[0];
  const fefClub = {
    name: cupOnly.name,
    slug: cupOnly.id.slice("fef-".length),
    logo_url: cupOnly.logo,
  };
  const mainLeagueClub = {
    name: "INDEPENDIENTE DEL VALLE",
    slug: "independiente-del-valle-0001",
    logo_url: "https://example.com/club.png",
  };
  const data = await fetchEcuadorCupStandings("ecu.copa_2026", async (url) => {
    if (url.includes("/teams?"))
      return {
        status_code: 200,
        success: true,
        data: {
          competition_name: "Copa Ecuador 2026",
          teams: [fefClub, mainLeagueClub],
        },
      };
    return {
      status_code: 200,
      success: true,
      data: {
        stages: [
          {
            stage_code: "quarterfinal",
            stage_name: "Cuartos de final",
            dates: [
              {
                groups: [
                  {
                    matches: [
                      {
                        match_id: "fef-match-1",
                        match_date: "2026-10-28",
                        home_team: cupOnly.name,
                        away_team: mainLeagueClub.name,
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
    };
  });
  const fixture = data.rounds[0].fixtures[0];
  assert.equal(data.provider, "fef");
  assert.equal(fixture.home.id, cupOnly.id);
  assert.equal(fixture.home.name, cupOnly.name);
  assert.match(fixture.away.id, /^\d+$/);
});

test("the FEF marks the cup started only after a result is published", async () => {
  const loadJson = async () => ({
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
                      match_date: "2026-10-28",
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
  });
  assert.equal(
    await ecuadorCupHasStarted(
      "ecu.copa_2026",
      loadJson,
      new Date("2026-10-29T12:00:00Z"),
    ),
    true,
  );
});
