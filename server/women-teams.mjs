import manifest from "../data/women-teams-2026.json" with { type: "json" };
import {
  WOMEN_SOCCER_LEAGUES,
  SOCCER_TEAM_LEAGUES,
  leagueFor,
} from "./catalog.mjs";
import { validProfileId } from "./team-identity.mjs";

const LOGO_HOSTS = new Set(["a.espncdn.com", "imagecache.365scores.com"]);

export function validateWomenTeams(data = manifest) {
  if (
    !data.revision ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.reviewedAt || "") ||
    !Array.isArray(data.clubs) ||
    !data.clubs.length ||
    new Set(data.clubs.map((c) => c.id)).size !== data.clubs.length
  )
    throw new Error("Revisão de times femininos inválida ou com IDs repetidos.");

  for (const c of data.clubs) {
    if (
      !validProfileId(c.id) ||
      !/^\d{1,12}$/.test(c.id) ||
      c.sport !== "soccer" ||
      c.gender !== "women" ||
      !c.name ||
      c.name.length > 120 ||
      /\bTBD\b/i.test(c.name) ||
      !WOMEN_SOCCER_LEAGUES.has(c.league) ||
      !SOCCER_TEAM_LEAGUES.has(c.league) ||
      !leagueFor("soccer", c.league) ||
      !["espn", "365"].includes(c.provider) ||
      !Array.isArray(c.sources) ||
      !c.sources.length
    )
      throw new Error(`Time feminino inválido: ${c.id}`);
    let logo;
    try {
      logo = new URL(c.logo);
    } catch {
      throw new Error(`Logo inválido: ${c.id}`);
    }
    if (logo.protocol !== "https:" || !LOGO_HOSTS.has(logo.hostname))
      throw new Error(`Logo de fonte desconhecida: ${c.id}`);
    for (const source of c.sources) {
      let url;
      try {
        url = new URL(source.url);
      } catch {
        throw new Error(`Fonte inválida: ${c.id}`);
      }
      if (url.protocol !== "https:" || url.username || url.password)
        throw new Error(`Fonte inválida: ${c.id}`);
    }
  }

  const counts = {};
  for (const c of data.clubs) counts[c.league] = (counts[c.league] || 0) + 1;
  for (const [league, count] of Object.entries(data.expectedCounts || {})) {
    if (counts[league] !== count)
      throw new Error(`Quantidade inválida de times femininos: ${league}`);
  }
  if (Object.keys(counts).some((league) => data.expectedCounts?.[league] !== counts[league]))
    throw new Error("Liga feminina ausente da revisão.");
  return data;
}

export const womenTeams = validateWomenTeams();
