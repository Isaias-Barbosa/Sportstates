import manifest from "../data/mls-profiles-2026.json" with { type: "json" };

// These two user-created profiles must never be part of this import.
export const MLS_PRESERVED_IDS = Object.freeze(["18418", "20232"]);

export function validateMlsProfiles(data = manifest) {
  const ids = data.clubs?.map((c) => c.id) || [];
  if (
    !data.revision ||
    data.season !== "2026" ||
    !Array.isArray(data.clubs) ||
    ids.length !== 28 ||
    new Set(ids).size !== 28 ||
    !Array.isArray(data.expectedIds) ||
    data.expectedIds.length !== 30 ||
    new Set(data.expectedIds).size !== 30 ||
    MLS_PRESERVED_IDS.some(
      (id) => ids.includes(id) || !data.expectedIds.includes(id),
    ) ||
    ids.some((id) => !data.expectedIds.includes(id)) ||
    JSON.stringify(data.preservedIds) !== JSON.stringify(MLS_PRESERVED_IDS)
  )
    throw new Error(
      "A importação deve conter 28 clubes e preservar Atlanta United e Inter Miami.",
    );
  for (const c of data.clubs) {
    if (
      !/^\d{1,12}$/.test(c.id) ||
      c.sport !== "soccer" ||
      c.league !== "usa.1" ||
      !c.name ||
      c.name.length > 120 ||
      /\bTBD\b/i.test(c.name) ||
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
      throw new Error(`Perfil MLS inválido: ${c.id}`);
    for (const url of [c.website, c.logo, ...c.sources.map((s) => s.url)]) {
      const u = new URL(url);
      if (u.protocol !== "https:" || u.username || u.password)
        throw new Error(`Link MLS inválido: ${c.id}`);
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
      throw new Error(`Conquistas MLS inválidas: ${c.id}`);
  }
  return data;
}

export const mlsProfiles = validateMlsProfiles();
export function mlsProfileReferences(id, league) {
  if (league !== "usa.1") return [];
  return mlsProfiles.clubs.find((c) => c.id === String(id))?.sources || [];
}
