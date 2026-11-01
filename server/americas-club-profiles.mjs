import manifest from "../data/americas-club-profiles-2026.json" with { type: "json" };
import { leagueFor } from "./catalog.mjs";

export const AMERICAS_LEAGUE_COUNTS = Object.freeze({
  "arg.1": 30,
  "mex.1": 18,
  "col.1": 20,
  "chi.1": 16,
  "uru.1": 16,
  "ecu.1": 16,
});

export function validateAmericasClubProfiles(data = manifest) {
  if (
    !data.revision ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.reviewedAt || "") ||
    !Array.isArray(data.clubs) ||
    data.clubs.length !== data.expectedTotal ||
    new Set(data.clubs.map((club) => club.id)).size !== data.clubs.length
  )
    throw new Error(
      "A revisão deve conter clubes distintos e uma data válida.",
    );

  for (const [league, count] of Object.entries(AMERICAS_LEAGUE_COUNTS)) {
    if (
      !leagueFor("soccer", league) ||
      data.expectedCounts?.[league] !== count ||
      data.clubs.filter((club) => club.league === league).length !== count
    )
      throw new Error(`Quantidade ou liga inválida: ${league}`);
  }

  for (const club of data.clubs) {
    if (
      !/^\d{1,12}$/.test(club.id) ||
      club.sport !== "soccer" ||
      !leagueFor(club.sport, club.league) ||
      !club.name ||
      /\bTBD\b/i.test(club.name) ||
      club.name.length > 120 ||
      !club.description ||
      club.description.length > 2000 ||
      !Array.isArray(club.colors) ||
      club.colors.length > 5 ||
      club.colors.some((color) => !/^#[\da-f]{6}$/i.test(color)) ||
      !Array.isArray(club.sources) ||
      club.sources.length < 2
    )
      throw new Error(`Perfil inválido: ${club.id}`);

    for (const source of club.sources) {
      const url = new URL(source.url);
      if (url.protocol !== "https:" || url.username || url.password)
        throw new Error(`Link inválido: ${club.id}`);
    }
  }
  return data;
}

export const americasClubProfiles = validateAmericasClubProfiles();

export function americasClubProfileReferences(id, league) {
  return (
    americasClubProfiles.clubs.find(
      (club) => club.id === String(id) && club.league === league,
    )?.sources || []
  );
}
