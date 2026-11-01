import { neon } from "@neondatabase/serverless";
import { writeFile } from "node:fs/promises";
import {
  americasClubProfiles,
  validateAmericasClubProfiles,
} from "../server/americas-club-profiles.mjs";
import { AMERICAS_LEAGUE_COUNTS } from "../server/americas-club-profiles.mjs";
import { leagueFor } from "../server/catalog.mjs";

const year = 2026;
const leagues = Object.keys(AMERICAS_LEAGUE_COUNTS);
const cupLeagues = [
  "arg.copa",
  "arg.supercopa",
  "arg.supercopa.internacional",
  "mex.campeon",
  "col.copa",
  "col.superliga",
  "chi.copa_chi",
  "chi.super_cup",
];
const manifestPath = new URL(
  "../data/americas-club-profiles-2026.json",
  import.meta.url,
);
const json = async (url) => {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(`ESPN indisponível (HTTP ${response.status}).`);
  return response.json();
};

async function snapshot() {
  const leagueFeeds = await Promise.all(
    leagues.map(async (league) => {
      const [roster, schedule] = await Promise.all([
        json(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/teams?limit=1000&lang=pt&region=br`,
        ),
        json(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${year}&limit=1000&lang=pt&region=br`,
        ),
      ]);
      return { league, roster, schedule };
    }),
  );
  const cupFeeds = await Promise.all(
    cupLeagues.map(async (league) => {
      const [roster, schedule] = await Promise.all([
        json(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/teams?limit=1000&lang=pt&region=br`,
        ),
        json(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${year}&limit=1000&lang=pt&region=br`,
        ),
      ]);
      return { league, roster, schedule };
    }),
  );
  const venueCounts = new Map();
  for (const feed of [...leagueFeeds, ...cupFeeds]) {
    for (const event of feed.schedule.events || []) {
      const competition = event.competitions?.[0];
      if (!competition || competition.neutralSite) continue;
      const home = competition.competitors?.find(
        (competitor) => competitor.homeAway === "home",
      );
      const venue = competition.venue;
      if (!home?.team?.id || !venue?.fullName) continue;
      const venues = venueCounts.get(String(home.team.id)) || new Map();
      venues.set(venue.fullName, (venues.get(venue.fullName) || 0) + 1);
      venueCounts.set(String(home.team.id), venues);
    }
  }

  const clubs = new Map();
  for (const { league, roster } of leagueFeeds) {
    const teams = roster.sports?.[0]?.leagues?.[0]?.teams || [];
    if (teams.length !== AMERICAS_LEAGUE_COUNTS[league])
      throw new Error(
        `${league}: a ESPN retornou ${teams.length} times; esperado ${AMERICAS_LEAGUE_COUNTS[league]}.`,
      );
    for (const item of teams) {
      if (item.team?.id)
        clubs.set(String(item.team.id), {
          team: item.team,
          league,
        });
    }
  }
  for (const { league, roster } of cupFeeds) {
    const teams = roster.sports?.[0]?.leagues?.[0]?.teams || [];
    for (const item of teams) {
      const team = item.team;
      if (team?.id && !clubs.has(String(team.id)))
        clubs.set(String(team.id), { team, league });
    }
  }

  const data = {
    revision: `americas-clubs-${year}-v1`,
    reviewedAt: "2026-11-01",
    expectedTotal: 182,
    seasons: Object.fromEntries(
      [...leagues, ...cupLeagues].map((id) => [id, String(year)]),
    ),
    expectedCounts: AMERICAS_LEAGUE_COUNTS,
    clubs: [...clubs.entries()].map(([id, entry]) => {
      const team = entry.team;
      const stadium =
        [...(venueCounts.get(id) || new Map()).entries()].sort(
          (a, b) => b[1] - a[1],
        )[0]?.[0] || "";
      const name = team.displayName || team.name;
      const location = team.location || "";
      const normalize = (value) =>
        String(value)
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
      const city = normalize(location) === normalize(name) ? "" : location;
      const league = entry.league;
      const leagueName = leagueFor("soccer", league)?.name || league;
      const mapQuery = [...new Set([stadium, city, name].filter(Boolean))].join(
        ", ",
      );
      const slug = String(team.slug || team.name || id)
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      return {
        id,
        name,
        sport: "soccer",
        league,
        city,
        stadium,
        stadium_image: "",
        website: "",
        description: `${name} disputa ${leagueName} na temporada ${year}.${stadium ? ` O estádio mandante identificado nas partidas da ESPN é ${stadium}.` : ""}`,
        honours: [],
        colors: [team.color, team.alternateColor]
          .filter((color) => /^#?[\da-f]{6}$/i.test(color || ""))
          .map((color) => `#${color.replace(/^#/, "").toLowerCase()}`),
        logo: team.logo || team.logos?.find((logo) => logo.href)?.href || "",
        sources: [
          {
            label: "Elenco e escudo · ESPN",
            url: `https://www.espn.com.br/futebol/time/_/id/${id}/${slug}`,
          },
          {
            label: stadium
              ? "Estádio · localização pública"
              : "Clube · localização pública",
            url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery || name)}`,
          },
        ],
      };
    }),
  };
  validateAmericasClubProfiles(data);
  await writeFile(manifestPath, `${JSON.stringify(data, null, 2)}\n`);
  return data;
}

if (process.argv.includes("--snapshot")) {
  const data = await snapshot();
  console.log(
    `Snapshot salvo: ${data.clubs.length} clubes de seis ligas e copas nacionais ESPN.`,
  );
} else if (process.argv.includes("--apply")) {
  if (!process.env.DATABASE_URL)
    throw new Error("Neon não configurado para importar os clubes.");
  const sql = neon(process.env.DATABASE_URL);
  const { revision, clubs } = americasClubProfiles;
  await sql`CREATE TABLE IF NOT EXISTS sport_profile_imports (revision text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  const done =
    await sql`SELECT revision FROM sport_profile_imports WHERE revision=${revision}`;
  if (done.length) {
    console.log("Clubes das Américas: revisão já aplicada; sem alterações.");
  } else {
    const ids = clubs.map((club) => club.id);
    const collisions =
      await sql`SELECT id FROM sport_teams WHERE id=ANY(${ids}::text[]) AND sport <> 'soccer'`;
    if (collisions.length)
      throw new Error(
        "ID de outro esporte encontrado; importação interrompida.",
      );
    const queries = clubs.map(
      (club) => sql`
        INSERT INTO sport_teams
          (id,name,logo,description,city,stadium,stadium_image,website,sport,league,colors,honours)
        SELECT
          ${club.id},${club.name},${club.logo},${club.description},${club.city},
          ${club.stadium},${club.stadium_image},${club.website},'soccer',${club.league},
          ${JSON.stringify(club.colors)}::jsonb,${JSON.stringify(club.honours)}::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM sport_profile_imports WHERE revision=${revision})
        ON CONFLICT (id) DO UPDATE SET
          league=EXCLUDED.league,
          city=CASE WHEN btrim(sport_teams.city)='' THEN EXCLUDED.city ELSE sport_teams.city END,
          stadium=CASE WHEN btrim(sport_teams.stadium)='' THEN EXCLUDED.stadium ELSE sport_teams.stadium END,
          logo=CASE WHEN btrim(sport_teams.logo)='' THEN EXCLUDED.logo ELSE sport_teams.logo END,
          description=CASE WHEN btrim(sport_teams.description)='' THEN EXCLUDED.description ELSE sport_teams.description END,
          colors=CASE WHEN jsonb_array_length(sport_teams.colors)=0 THEN EXCLUDED.colors ELSE sport_teams.colors END,
          updated_at=now()
        WHERE sport_teams.sport='soccer'
      `,
    );
    queries.push(
      sql`INSERT INTO sport_profile_imports (revision) VALUES (${revision}) ON CONFLICT DO NOTHING`,
    );
    await sql.transaction(queries);
    const result =
      await sql`SELECT id,league FROM sport_teams WHERE id=ANY(${ids}::text[]) AND sport='soccer'`;
    for (const [league, count] of Object.entries(AMERICAS_LEAGUE_COUNTS)) {
      if (result.filter((club) => club.league === league).length !== count)
        throw new Error(`A conferência dos perfis falhou: ${league}.`);
    }
    console.log(
      `Importação concluída: ${clubs.length} clubes, com estádios e links públicos de localização.`,
    );
  }
} else {
  console.log(
    "Use --snapshot para atualizar a revisão ou --apply para importar.",
  );
}
