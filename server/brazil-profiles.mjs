import manifest from "../data/brazil-serie-a-2026.json" with { type: "json" };

export const BRAZIL_PROFILE_FIELDS = [
  "description",
  "city",
  "stadium",
  "stadium_image",
  "website",
  "colors",
  "honours",
];
const https = (value) => {
  const u = new URL(value);
  if (u.protocol !== "https:" || u.username || u.password)
    throw new Error("URL de perfil inválida.");
};
export function validateBrazilProfiles(data = manifest) {
  if (
    !data.revision ||
    data.expectedIds?.length !== 20 ||
    new Set(data.expectedIds).size !== 20 ||
    data.clubs?.length !== 18 ||
    data.preservedIds?.length !== 2 ||
    new Set([...data.clubs.map((c) => c.id), ...data.preservedIds]).size !==
      20 ||
    [...data.clubs.map((c) => c.id), ...data.preservedIds].some(
      (id) => !data.expectedIds.includes(id),
    )
  )
    throw new Error(
      "A revisão deve cobrir os 20 times da Série A, preservando os dois perfis completos.",
    );
  for (const club of data.clubs) {
    if (
      !/^\d{1,12}$/.test(club.id) ||
      club.sport !== "soccer" ||
      club.league !== "bra.1" ||
      !club.name ||
      !club.city?.trim() ||
      !club.stadium?.trim() ||
      !club.description?.trim() ||
      club.description.length > 2000 ||
      club.city.length > 120 ||
      club.stadium.length > 120 ||
      !club.stadium_image ||
      club.stadium_image.length > 500 ||
      !Array.isArray(club.colors) ||
      !club.colors.length ||
      club.colors.length > 5 ||
      club.colors.some((c) => !/^#[\da-f]{6}$/i.test(c)) ||
      !Array.isArray(club.honours) ||
      !club.honours.length ||
      club.honours.length > 50 ||
      club.honours.some(
        (h) =>
          typeof h !== "string" || h.length > 3000 || !/^.+ - \d{4}/.test(h),
      ) ||
      club.honours.join("").length > 20000 ||
      !club.sources?.length
    )
      throw new Error(`Perfil da Série A inválido: ${club.id}`);
    for (const url of [
      club.website,
      club.logo,
      club.stadium_image,
      ...club.sources.map((s) => s.url),
    ])
      https(url);
    const photo = club.stadiumPhoto;
    if (
      photo?.url !== club.stadium_image ||
      !photo.author ||
      !/^CC(?: |0)/.test(photo.license) ||
      !["upload.wikimedia.org", "thumb.wikimedia.org"].includes(
        new URL(photo.url).hostname,
      ) ||
      new URL(photo.page).hostname !== "commons.wikimedia.org"
    )
      throw new Error(`Crédito da foto inválido: ${club.id}`);
    https(photo.page);
    https(photo.licenseUrl);
  }
  return data;
}
export const brazilProfiles = validateBrazilProfiles();

// Used to review exactly which blanks the one-time SQL import will fill.
export function completeBrazilProfile(current, seed) {
  if (
    current.id !== seed.id ||
    current.sport !== "soccer" ||
    current.league !== "bra.1"
  )
    return { ...current };
  const result = { ...current };
  for (const field of BRAZIL_PROFILE_FIELDS) {
    const value = current[field];
    if (
      value == null ||
      (typeof value === "string" && !value.trim()) ||
      (Array.isArray(value) && value.length === 0)
    )
      result[field] = structuredClone(seed[field]);
  }
  return result;
}
export function brazilProfileReferences(id, league) {
  if (league !== "bra.1") return [];
  return brazilProfiles.clubs.find((c) => c.id === String(id))?.sources || [];
}
export function brazilStadiumCredit(team) {
  const seed =
    team.sport === "soccer" && team.league === "bra.1"
      ? brazilProfiles.clubs.find((c) => c.id === String(team.id))
      : null;
  return seed && team.stadium_image === seed.stadium_image
    ? seed.stadiumPhoto
    : null;
}
