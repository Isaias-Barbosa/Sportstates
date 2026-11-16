import test from "node:test";
import assert from "node:assert/strict";
import {
  curatedPlayerProfile,
  transfermarktPlayerId,
  validCuratedPlayerId,
} from "../server/players.mjs";

test("player ids accept ESPN, Transfermarkt and local records only", () => {
  for (const id of ["espn-296395", "tm-568177", "local-abc123"]) {
    assert.equal(validCuratedPlayerId(id), true);
  }
  for (const id of ["", "296395", "espn-", "local-a", "cbf-1", "espn-1x"]) {
    assert.equal(validCuratedPlayerId(id), false);
  }
});

test("Transfermarkt identifiers come from a numeric id or profile link", () => {
  assert.equal(transfermarktPlayerId("568177"), "568177");
  assert.equal(
    transfermarktPlayerId(
      "https://www.transfermarkt.com.br/cole-palmer/profil/spieler/568177",
    ),
    "568177",
  );
  assert.equal(transfermarktPlayerId("568177/leistungsdaten"), "568177");
  assert.equal(transfermarktPlayerId("cole-palmer"), "");
  assert.equal(transfermarktPlayerId(""), "");
});

test("curated profile converts stored rows into the public player shape", () => {
  const source = "https://www.espn.com.br/futebol/jogador/_/id/296395";
  const row = {
    id: "espn-296395",
    espn_id: "296395",
    transfermarkt_id: "568177",
    transfermarkt_url:
      "https://www.transfermarkt.com.br/cole-palmer/profil/spieler/568177",
    name: "Cole Palmer",
    full_name: "Cole Jermaine Palmer",
    team_id: "363",
    team_name: "Chelsea",
    team_logo: "https://a.espncdn.com/i/teamlogos/soccer/500/363.png",
    position: "Meio-campista",
    nationality: "Inglaterra",
    flag_url: "",
    photo_url:
      "https://img.a.transfermarkt.technology/portrait/header/568177.jpg",
    jersey: "10",
    birth_date: "2002-05-06",
    height: "1,85 m",
    weight: "",
    league: "eng.1",
    bio: "Meia ofensivo do Chelsea.",
    market_value: {
      amount: 110000000,
      currency: "EUR",
      date: "2026-11-15",
      source:
        "https://www.transfermarkt.com.br/cole-palmer/profil/spieler/568177",
    },
    profile_url: source,
    source: "espn+transfermarkt",
    source_url: source,
    stats: {
      season: 2026,
      seasonLabel: "2026-27 Premier League",
      current: {
        appearances: 10,
        goals: 3,
        assists: 3,
        yellows: 2,
        reds: 1,
      },
      splits: [
        {
          name: "2026-27 English Premier League",
          teamId: "363",
          teamName: "Chelsea",
          league: "eng.1",
          stats: { appearances: 10, totalGoals: 3, goalAssists: 3 },
        },
      ],
    },
    career: [],
    transfers: [
      {
        date: "2023-09-01",
        from: "Manchester City",
        to: "Chelsea",
        kind: "transfer",
      },
    ],
    awards: [],
    previous_clubs: [
      {
        name: "Manchester City",
        source: "https://www.espn.com.br/futebol/time/_/id/382",
      },
    ],
    created_at: new Date("2026-11-15T10:00:00.000Z"),
    updated_at: new Date("2026-11-15T12:00:00.000Z"),
  };

  const profile = curatedPlayerProfile(row);
  assert.equal(profile.id, "espn-296395");
  assert.equal(profile.name, "Cole Palmer");
  assert.equal(profile.currentClub.id, "363");
  assert.equal(profile.currentClub.name, "Chelsea");
  assert.equal(profile.image, row.photo_url);
  assert.equal(profile.marketValue.amount, 110000000);
  assert.equal(profile.previousClubs.length, 1);
  assert.equal(profile.transfers.length, 1);
  assert.equal(profile.profileAsOf, "2026-11-15");
  assert.deepEqual(profile.competitions[0], {
    league: "eng.1",
    name: "Premier League",
    season: 2026,
    seasonLabel: "2026-27 English Premier League",
    stats: {
      games: 10,
      goals: 3,
      assists: 3,
      yellows: null,
      reds: null,
      saves: null,
    },
    team: "Chelsea",
    source,
  });

  const camel = curatedPlayerProfile({
    id: row.id,
    espnId: row.espn_id,
    name: row.name,
    teamId: row.team_id,
    teamName: row.team_name,
    league: row.league,
    photo: row.photo_url,
    source: row.source,
    stats: row.stats,
    transfers: row.transfers,
    awards: [],
    previousClubs: row.previous_clubs,
    updatedAt: "2026-11-15T12:00:00.000Z",
  });
  assert.equal(camel.name, "Cole Palmer");
  assert.equal(camel.currentClub.name, "Chelsea");
  assert.equal(camel.previousClubs.length, 1);
});
