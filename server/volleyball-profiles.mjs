import { readFileSync } from "node:fs";
import { teamProfileId } from "./team-identity.mjs";
export const volleyballProfiles = JSON.parse(
  readFileSync(
    new URL("../data/volleyball-profiles-2026.json", import.meta.url),
    "utf8",
  ),
);
const { clubs } = volleyballProfiles;
if (clubs.length !== 12 || new Set(clubs.map((c) => c.id)).size !== 12)
  throw new Error("Catálogo da Superliga Masculina incompleto.");
for (const c of clubs) {
  if (
    c.sport !== "volleyball" ||
    c.league !== "superliga-men" ||
    c.id !== teamProfileId(c.cbvId, c.sport, c.league) ||
    !c.name ||
    !c.city ||
    !c.stadium ||
    !c.logo ||
    !c.website ||
    c.description.length > 2000 ||
    c.colors.some((v) => !/^#[0-9a-f]{6}$/i.test(v))
  )
    throw new Error("Perfil de Superliga Masculina inválido.");
  for (const url of [c.logo, c.website, ...c.references.map((r) => r.url)])
    if (new URL(url).protocol !== "https:")
      throw new Error("Fonte de Superliga Masculina inválida.");
}
export function volleyballProfileReferences(id) {
  return clubs.find((c) => c.id === id)?.references || [];
}
