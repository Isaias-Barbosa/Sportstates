import { readFileSync } from "node:fs";
import { teamProfileId } from "./team-identity.mjs";
export const nflProfiles = JSON.parse(
  readFileSync(
    new URL("../data/nfl-profiles-2026.json", import.meta.url),
    "utf8",
  ),
);
const { clubs } = nflProfiles;
if (clubs.length !== 32 || new Set(clubs.map((c) => c.id)).size !== 32)
  throw new Error("Catálogo da NFL incompleto.");
for (const c of clubs) {
  if (
    c.sport !== "football" ||
    c.league !== "nfl" ||
    c.id !== teamProfileId(c.espnId, c.sport, c.league) ||
    !c.name ||
    !c.city ||
    !c.stadium ||
    !c.logo ||
    !c.website ||
    c.description.length > 2000 ||
    c.colors.some((v) => !/^#[0-9a-f]{6}$/i.test(v))
  )
    throw new Error("Perfil de NFL inválido.");
  for (const url of [c.logo, c.website, ...c.references.map((r) => r.url)])
    if (new URL(url).protocol !== "https:")
      throw new Error("Fonte de NFL inválida.");
}
export function nflProfileReferences(id) {
  return clubs.find((c) => c.id === id)?.references || [];
}
