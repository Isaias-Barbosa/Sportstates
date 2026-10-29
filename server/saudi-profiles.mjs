import manifest from "../data/saudi-profiles-2026.json" with { type: "json" };
export const SAUDI_IDS = Object.freeze([
  "21833",
  "8346",
  "131746",
  "8363",
  "21446",
  "13033",
  "21827",
  "21964",
  "929",
  "2276",
  "21829",
  "22028",
  "817",
  "22022",
  "21965",
  "793",
  "18459",
  "130899",
]);
function https(value) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      (!u.port || u.port === "443")
    );
  } catch {
    return false;
  }
}
export function validateSaudiProfiles(data = manifest) {
  if (
    !data.revision ||
    data.season !== "2026/27" ||
    !Array.isArray(data.clubs) ||
    data.clubs.length !== 18 ||
    new Set(data.clubs.map((c) => c.id)).size !== 18 ||
    !Array.isArray(data.expectedIds) ||
    data.expectedIds.length !== 18 ||
    new Set(data.expectedIds).size !== 18 ||
    SAUDI_IDS.some(
      (id) =>
        !data.expectedIds.includes(id) || !data.clubs.some((c) => c.id === id),
    )
  )
    throw Error(
      "O catálogo saudita deve conter os 18 clubes da temporada 2026/27.",
    );
  for (const c of data.clubs) {
    if (
      !/^\d{1,12}$/.test(c.id) ||
      c.sport !== "soccer" ||
      c.league !== "ksa.1" ||
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
      !c.colors.length ||
      c.colors.length > 5 ||
      c.colors.some((v) => !/^#[\da-f]{6}$/i.test(v)) ||
      !Array.isArray(c.sources) ||
      c.sources.length < 3 ||
      !c.sources.some((s) =>
        s.url.startsWith("https://www.spl.com.sa/en/teams/"),
      ) ||
      !c.sources.some((s) => s.url === c.website)
    )
      throw Error(`Perfil saudita inválido: ${c.id}`);
    if (
      ![c.website, c.logo, ...c.sources.map((s) => s.url)].every(https) ||
      (c.stadium_image && !https(c.stadium_image))
    )
      throw Error(`Links sauditas inválidos: ${c.id}`);
    if (
      !Array.isArray(c.honours) ||
      c.honours.length > 50 ||
      c.honours.some(
        (h) =>
          typeof h !== "string" || h.length > 3000 || !/^.+ - \d{4}/.test(h),
      ) ||
      c.honours.reduce((n, h) => n + h.length, 0) > 20000
    )
      throw Error(`Conquistas sauditas inválidas: ${c.id}`);
  }
  return data;
}
export const saudiProfiles = validateSaudiProfiles();
export const saudiProfileReferences = (id, league) =>
  league === "ksa.1"
    ? saudiProfiles.clubs.find((c) => c.id === String(id))?.sources || []
    : [];

export function saudiImportCandidates(existing, data = saudiProfiles) {
  const ids = new Set(data.expectedIds);
  if (
    existing.some(
      (c) => ids.has(c.id) && (c.sport !== "soccer" || c.league !== "ksa.1"),
    )
  )
    throw Error("Conflito de IDs na importação da Liga Saudita.");
  const saved = new Set(existing.map((c) => c.id));
  return data.clubs.filter((c) => !saved.has(c.id));
}
