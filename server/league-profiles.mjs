import manifest from "../data/league-profiles-2026-27.json" with { type: "json" };
import { leagueFor, SOCCER_TEAM_LEAGUES } from "./catalog.mjs";

export const PROFILE_LEAGUE_COUNTS = Object.freeze({
  "bra.2": 20,
  "ita.1": 20,
  "esp.1": 20,
  "por.1": 18,
  "fra.1": 18,
  "ger.1": 18,
});

export function validateLeagueProfiles(data = manifest) {
  if (
    !data.revision ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.reviewedAt || "") ||
    !Array.isArray(data.clubs) ||
    data.clubs.length !== 114 ||
    new Set(data.clubs.map((c) => c.id)).size !== 114
  )
    throw new Error("A revisão deve conter 114 clubes distintos.");
  for (const [league, count] of Object.entries(PROFILE_LEAGUE_COUNTS)) {
    if (
      !leagueFor("soccer", league) ||
      !SOCCER_TEAM_LEAGUES.has(league) ||
      data.expectedCounts?.[league] !== count ||
      data.clubs.filter((c) => c.league === league).length !== count
    )
      throw new Error(`Quantidade ou liga inválida: ${league}`);
  }
  for (const c of data.clubs) {
    if (
      !/^\d{1,12}$/.test(c.id) ||
      c.sport !== "soccer" ||
      !PROFILE_LEAGUE_COUNTS[c.league] ||
      !c.name ||
      /\bTBD\b/i.test(c.name) ||
      c.name.length > 120 ||
      !c.city ||
      c.city.length > 120 ||
      !c.stadium ||
      c.stadium.length > 120 ||
      !c.description ||
      c.description.length > 2000 ||
      !Array.isArray(c.colors) ||
      c.colors.length > 5 ||
      c.colors.some((v) => !/^#[\da-f]{6}$/i.test(v)) ||
      !Array.isArray(c.sources) ||
      c.sources.length < 2
    )
      throw new Error(`Perfil inválido: ${c.id}`);
    for (const url of [c.website, c.logo, ...c.sources.map((s) => s.url)]) {
      const u = new URL(url);
      if (u.protocol !== "https:" || u.username || u.password)
        throw new Error(`Link inválido: ${c.id}`);
    }
    if (
      !Array.isArray(c.honours) ||
      c.honours.length > 50 ||
      c.honours.some(
        (h) =>
          typeof h !== "string" || h.length > 3000 || !/^.+ - \d{4}/.test(h),
      ) ||
      c.honours.reduce((n, h) => n + h.length, 0) > 20000
    )
      throw new Error(`Conquistas inválidas: ${c.id}`);
  }
  return data;
}

export const leagueProfiles = validateLeagueProfiles();
export function leagueProfileReferences(id, league) {
  return (
    leagueProfiles.clubs.find((c) => c.id === String(id) && c.league === league)
      ?.sources || []
  );
}
