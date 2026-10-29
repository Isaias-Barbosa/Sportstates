import { mlbProfileReferences } from "./mlb-profiles.mjs";
import {
  brazilProfileReferences,
  brazilStadiumCredit,
} from "./brazil-profiles.mjs";
import {
  footballRosterPosition,
  footballRosterGroup,
} from "./american-football.mjs";
import { nflProfileReferences } from "./nfl-profiles.mjs";
import { basketballProfileReferences } from "./basketball-profiles.mjs";
import {
  validProfileId,
  providerTeamId,
  teamProfileId,
} from "./team-identity.mjs";
import { mlsProfileReferences } from "./mls-profiles.mjs";
import { leagueProfileReferences } from "./league-profiles.mjs";
import { premierLeagueReferences } from "./premier-league-profiles.mjs";
import { neon } from "@neondatabase/serverless";
import { normalizeEvent, normalizeSummary } from "./data.mjs";
import { leagueFor } from "./catalog.mjs";
import { parseTeamLeaders } from "./team-leaders.mjs";
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";
const getSql = () => {
  if (!process.env.DATABASE_URL) throw new Error("Banco Neon não configurado.");
  return neon(process.env.DATABASE_URL);
};
const validId = validProfileId;
export function validateHonours(honours) {
  if (
    !Array.isArray(honours) ||
    honours.length > 50 ||
    honours.some(
      (h) => typeof h !== "string" || !h.trim() || h.length > 3000,
    ) ||
    honours.reduce((n, h) => n + h.length, 0) > 20000
  )
    throw new Error(
      "Confira os títulos: até 50 linhas, com até 3.000 caracteres por linha e 20.000 no total.",
    );
  return honours.map((h) => h.trim());
}
export async function listTeams() {
  const sql = getSql();
  return sql`SELECT id, name, logo, description, city, stadium, stadium_image, website, sport, league, colors, honours FROM sport_teams ORDER BY name`;
}
export async function getTeam(id) {
  if (!validId(id)) return null;
  const sql = getSql();
  const rows =
    await sql`SELECT id, name, logo, description, city, stadium, stadium_image, website, sport, league, colors, honours FROM sport_teams WHERE id=${id}`;
  return rows[0] || null;
}
export async function saveTeam(p) {
  const sport = String(p.sport || "soccer"),
    league = String(p.league || "");
  const colors = Array.isArray(p.colors) ? p.colors : [],
    honours = validateHonours(Array.isArray(p.honours) ? p.honours : []);
  if (
    !leagueFor(sport, league) ||
    colors.length > 5 ||
    colors.some((c) => typeof c !== "string" || !/^#[0-9a-f]{6}$/i.test(c))
  )
    throw new Error("Liga, cores ou títulos inválidos.");
  const id = teamProfileId(p.id, sport, league);
  const name = String(p.name || "").trim(),
    city = String(p.city || "").trim(),
    stadium = String(p.stadium || "").trim(),
    description = String(p.description || "").trim(),
    website = String(p.website || "").trim(),
    stadiumImage = String(p.stadium_image || "").trim(),
    logo = String(p.logo || "").trim();
  if (
    !validId(id) ||
    !name ||
    name.length > 120 ||
    city.length > 120 ||
    stadium.length > 120 ||
    description.length > 2000 ||
    website.length > 500 ||
    logo.length > 500 ||
    stadiumImage.length > 500
  )
    throw new Error("Confira os campos do time.");
  for (const url of [website, logo, stadiumImage]) {
    if (url) {
      let u;
      try {
        u = new URL(url);
      } catch {
        throw new Error("Informe URLs válidas.");
      }
      if (u.protocol !== "https:" || u.username || u.password)
        throw new Error("Os links devem usar HTTPS.");
    }
  }
  const sql = getSql();
  const saved =
    await sql`INSERT INTO sport_teams (id,name,logo,description,city,stadium,stadium_image,website,sport,league,colors,honours) VALUES (${id},${name},${logo},${description},${city},${stadium},${stadiumImage},${website},${sport},${league},${JSON.stringify(colors)}::jsonb,${JSON.stringify(honours.map((h) => h.trim()))}::jsonb) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,logo=EXCLUDED.logo,description=EXCLUDED.description,city=EXCLUDED.city,stadium=EXCLUDED.stadium,stadium_image=EXCLUDED.stadium_image,website=EXCLUDED.website,sport=EXCLUDED.sport,league=EXCLUDED.league,colors=EXCLUDED.colors,honours=EXCLUDED.honours,updated_at=now() WHERE sport_teams.sport=EXCLUDED.sport RETURNING id`;
  if (!saved.length)
    throw new Error("Este ID já pertence a um time de outro esporte.");
}
async function getJSON(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Fonte esportiva indisponível.");
  return response.json();
}
export function normalizeTeamSchedule(
  events,
  id,
  sport = "soccer",
  defaultLeague = "bra.1",
) {
  return [
    ...new Map(
      events
        .map((e) => {
          const slug = e.league?.slug || defaultLeague;
          const name =
            e.league?.name || leagueFor(sport, slug)?.name || "Competição";
          const match = normalizeEvent(e, sport, slug, name);
          return [match?.id, match];
        })
        .filter(([, m]) => m && [m.home.id, m.away.id].includes(String(id))),
    ).values(),
  ];
}
export async function teamDetails(id) {
  const team = await getTeam(id);
  if (!team) return null;
  const config = leagueFor(team.sport, team.league);
  if (!config)
    return {
      team,
      athletes: [],
      leaders: null,
      upcoming: [],
      recent: [],
      lineup: null,
      articles: [],
      coverage: { roster: false, schedule: false, news: false, next: false },
      source: "ESPN · feed público não oficial",
    };
  const ESPN = `${ESPN_BASE}/${config.sport}/${config.league}`;
  const providerId = providerTeamId(team.id);
  const [roster, schedule, news, next, fixtures] = await Promise.allSettled(
    ["roster", "schedule", "news", "next", "fixtures"].map((part) =>
      getJSON(
        part === "fixtures"
          ? `${ESPN}/teams/${providerId}/schedule?fixture=true&lang=pt&region=br`
          : part === "news"
            ? `${ESPN}/news?team=${providerId}&lang=pt&region=br&limit=12`
            : part === "next"
              ? `${ESPN}/teams/${providerId}?enable=event&lang=pt&region=br`
              : `${ESPN}/teams/${providerId}/${part}?lang=pt&region=br`,
      ),
    ),
  );
  const rawRoster =
    roster.status === "fulfilled" ? roster.value.athletes || [] : [];
  const athletes = rawRoster
    .flatMap((a) =>
      Array.isArray(a.items)
        ? a.items.map((p) => ({ ...p, rosterUnit: a.position }))
        : [a],
    )
    .map((a) => ({
      id: String(a.id || ""),
      name: a.displayName || a.fullName || "Jogador",
      number: a.jersey || "",
      position:
        config.sport === "football"
          ? footballRosterPosition(a)
          : a.position?.displayName || a.position?.name || "",
      ...(config.sport === "football"
        ? { group: footballRosterGroup(a.rosterUnit) }
        : {}),
      image: a.headshot?.href || null,
    }))
    .filter((a) => a.id);
  const season =
    roster.status === "fulfilled" ? Number(roster.value.season?.year) : NaN;
  let leaders = null;
  if (
    config.sport === "soccer" &&
    Number.isInteger(season) &&
    season >= 1900 &&
    season <= 2100
  ) {
    try {
      const raw = await getJSON(
        `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${config.league}/seasons/${season}/types/1/teams/${id}/leaders?lang=pt&region=br`,
      );
      leaders = { season, ...parseTeamLeaders(raw, athletes) };
    } catch {
      /* Statistics may be unavailable independently of the roster. */
    }
  }
  const rawEvents =
    schedule.status === "fulfilled" ? schedule.value.events || [] : [];
  const fixtureEvents =
    fixtures.status === "fulfilled" ? fixtures.value.events || [] : [];
  const nextEvents =
    next.status === "fulfilled" ? next.value.team?.nextEvent || [] : [];
  const matches = normalizeTeamSchedule(
    [...rawEvents, ...fixtureEvents, ...nextEvents],
    providerId,
    config.sport,
    config.league,
  );
  const upcoming = matches
    .filter(
      (m) =>
        m.state === "scheduled" && new Date(m.date).getTime() >= Date.now(),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);
  const recent = matches
    .filter((m) => m.state === "finished")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);
  const last = recent[0];
  let lineup = null;
  if (
    last &&
    config.sport !== "football" &&
    leagueFor(config.sport, last.league)
  ) {
    try {
      const raw = await getJSON(
        `https://site.api.espn.com/apis/site/v2/sports/${config.sport}/${last.league}/summary?event=${last.id}&lang=pt&region=br`,
      );
      const detail = normalizeSummary(
        raw,
        config.sport,
        last.league,
        last.leagueName,
      );
      lineup =
        detail.lineups.find(
          (l) => l.homeAway === (last.home.id === providerId ? "home" : "away"),
        ) ||
        detail.lineups.find((l) => l.team === team.name) ||
        null;
      if (lineup) lineup = { ...lineup, match: last.name, date: last.date };
    } catch {}
  }
  const articles =
    news.status === "fulfilled"
      ? (news.value.articles || [])
          .filter(
            (a) =>
              (a.categories || []).some(
                (c) => String(c.teamId || c.team?.id || "") === providerId,
              ) ||
              (a.headline || "")
                .toLocaleLowerCase("pt-BR")
                .includes(team.name.toLocaleLowerCase("pt-BR")),
          )
          .map((a) => ({
            title: a.headline || "",
            description: a.description || "",
            url: a.links?.web?.href || "",
            date: a.published || "",
            source: "ESPN",
          }))
          .filter(
            (a) =>
              a.title && /^https:\/\/(www\.)?espn\.com(\.br)?\//i.test(a.url),
          )
          .slice(0, 8)
      : [];
  return {
    team,
    stadiumImageCredit: brazilStadiumCredit(team),
    profileReferences:
      team.sport === "baseball"
        ? mlbProfileReferences(team.id)
        : team.sport === "football"
          ? nflProfileReferences(team.id)
          : team.sport === "basketball"
            ? basketballProfileReferences(team.id)
            : team.league === "eng.1"
              ? premierLeagueReferences(team.id)
              : [
                  ...brazilProfileReferences(team.id, team.league),
                  ...leagueProfileReferences(team.id, team.league),
                  ...mlsProfileReferences(team.id, team.league),
                ],
    athletes,
    leaders,
    upcoming,
    recent,
    lineup,
    articles,
    coverage: {
      next: next.status === "fulfilled",
      roster: roster.status === "fulfilled",
      schedule: schedule.status === "fulfilled",
      news: news.status === "fulfilled",
    },
    source: "ESPN · feed público não oficial",
  };
}
