import { readFileSync } from "node:fs";
import { teamProfileId } from "./team-identity.mjs";
export const mlbProfiles = JSON.parse(
  readFileSync(
    new URL("../data/mlb-profiles-2026.json", import.meta.url),
    "utf8",
  ),
);
const { clubs } = mlbProfiles;
if (clubs.length !== 30 || new Set(clubs.map((c) => c.id)).size !== 30)
  throw new Error("Catálogo da MLB incompleto.");
for (const c of clubs) {
  if (
    c.sport !== "baseball" ||
    c.league !== "mlb" ||
    c.id !== teamProfileId(c.espnId, c.sport, c.league) ||
    !c.name ||
    !c.city ||
    !c.stadium ||
    !c.logo ||
    !c.website ||
    c.description.length > 2000 ||
    c.colors.some((v) => !/^#[0-9a-f]{6}$/i.test(v))
  )
    throw new Error("Perfil de MLB inválido.");
  for (const url of [c.logo, c.website, ...c.references.map((r) => r.url)])
    if (new URL(url).protocol !== "https:")
      throw new Error("Fonte de MLB inválida.");
}
export function mlbProfileReferences(id) {
  return clubs.find((c) => c.id === id)?.references || [];
}
