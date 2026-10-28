import manifest from "../data/premier-league-2026-27.json" with { type: "json" };

export function validatePremierLeagueProfiles(data = manifest) {
  if (
    !data.revision ||
    !Array.isArray(data.clubs) ||
    data.clubs.length !== 20 ||
    new Set(data.clubs.map((c) => c.id)).size !== 20
  )
    throw new Error(
      "Importação da Premier League deve conter 20 IDs distintos.",
    );
  for (const c of data.clubs) {
    if (
      !/^\d{1,12}$/.test(c.id) ||
      c.sport !== "soccer" ||
      c.league !== "eng.1" ||
      !c.name ||
      !c.city ||
      !c.stadium ||
      !c.description ||
      c.description.length > 2000 ||
      c.city.length > 120 ||
      c.stadium.length > 120
    )
      throw new Error(`Perfil inválido: ${c.id}`);
    for (const url of [c.website, c.logo, ...c.sources.map((s) => s.url)]) {
      const u = new URL(url);
      if (u.protocol !== "https:" || u.username || u.password)
        throw new Error("Fonte ou link inválido.");
    }
    if (
      !c.honours.length ||
      c.honours.length > 50 ||
      c.honours.some((h) => h.length > 3000 || !/^.+ - \d{4}/.test(h))
    )
      throw new Error(`Títulos inválidos: ${c.id}`);
  }
  return data;
}
export const premierLeagueProfiles = validatePremierLeagueProfiles();
export function premierLeagueReferences(id) {
  return (
    premierLeagueProfiles.clubs.find((c) => c.id === String(id))?.sources || []
  );
}
