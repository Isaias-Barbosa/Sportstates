import { readFileSync } from "node:fs";
import { teamProfileId } from "./team-identity.mjs";
const nbaWnbaProfiles = JSON.parse(
  readFileSync(
    new URL("../data/basketball-profiles-2026.json", import.meta.url),
    "utf8",
  ),
);
const nbbProfiles = JSON.parse(
  readFileSync(
    new URL("../data/nbb-profiles-2026.json", import.meta.url),
    "utf8",
  ),
);
export const basketballProfiles = {
  revision: "basketball-profiles-2026-v3-nbb-18",
  clubs: [...nbaWnbaProfiles.clubs, ...nbbProfiles.clubs],
};
const { clubs } = basketballProfiles;
if (
  clubs.length !== 63 ||
  new Set(clubs.map((c) => c.id)).size !== 63 ||
  clubs.filter((c) => c.league === "nba").length !== 30 ||
  clubs.filter((c) => c.league === "wnba").length !== 15 ||
  clubs.filter((c) => c.league === "nbb").length !== 18
)
  throw new Error("Catálogo de basquete incompleto.");
for (const c of clubs) {
  if (
    c.sport !== "basketball" ||
    c.id !== teamProfileId(c.espnId, c.sport, c.league) ||
    !c.name ||
    (c.league !== "nbb" && (!c.city || !c.stadium || !c.logo || !c.website)) ||
    c.description.length > 2000 ||
    c.colors.some((v) => !/^#[0-9a-f]{6}$/i.test(v))
  )
    throw new Error("Perfil de basquete inválido.");
  for (const url of [
    c.logo,
    c.website,
    ...c.references.map((r) => r.url),
  ].filter(Boolean))
    if (new URL(url).protocol !== "https:")
      throw new Error("Fonte de basquete inválida.");
}
export function basketballProfileReferences(id) {
  return clubs.find((c) => c.id === id)?.references || [];
}
