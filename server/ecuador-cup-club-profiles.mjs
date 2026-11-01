import manifest from "../data/ecuador-cup-clubs-2026.json" with { type: "json" };

export function validateEcuadorCupClubProfiles(data = manifest) {
  if (
    !data.revision ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.reviewedAt || "") ||
    !Array.isArray(data.clubs) ||
    data.clubs.length !== data.expectedTotal ||
    new Set(data.clubs.map((club) => club.id)).size !== data.clubs.length
  )
    throw new Error("A revisão da Copa Ecuador deve conter clubes distintos.");

  for (const club of data.clubs) {
    if (
      !/^fef-[a-z0-9-]{1,120}$/.test(club.id) ||
      club.sport !== "soccer" ||
      club.league !== "ecu.copa_2026" ||
      !club.name ||
      club.name.length > 120 ||
      !club.description ||
      club.description.length > 2000 ||
      !Array.isArray(club.colors) ||
      club.colors.length > 5 ||
      club.colors.some((color) => !/^#[\da-f]{6}$/i.test(color)) ||
      !Array.isArray(club.sources) ||
      club.sources.length < 2
    )
      throw new Error(`Perfil da Copa Ecuador inválido: ${club.id}`);

    for (const field of ["logo", "stadium_image", "website"]) {
      if (!club[field]) continue;
      const url = new URL(club[field]);
      if (url.protocol !== "https:" || url.username || url.password)
        throw new Error(`Link inválido no perfil ${club.id}.`);
    }

    for (const source of club.sources) {
      const url = new URL(source.url);
      if (url.protocol !== "https:" || url.username || url.password)
        throw new Error(`Referência inválida no perfil ${club.id}.`);
    }
  }
  return data;
}

export const ecuadorCupClubProfiles = validateEcuadorCupClubProfiles();

export function ecuadorCupClubProfile(id) {
  return ecuadorCupClubProfiles.clubs.find((club) => club.id === String(id));
}

export function ecuadorCupClubProfileReferences(id) {
  return ecuadorCupClubProfile(id)?.sources || [];
}
