import { readFileSync } from "node:fs";
import { teamProfileId } from "./team-identity.mjs";
export const nhlProfiles = JSON.parse(
  readFileSync(
    new URL("../data/nhl-profiles-2026.json", import.meta.url),
    "utf8",
  ),
);
const { clubs } = nhlProfiles;
if (clubs.length !== 32 || new Set(clubs.map((c) => c.id)).size !== 32)
  throw new Error("Catálogo da NHL incompleto.");
for (const c of clubs) {
  if (
    c.sport !== "hockey" ||
    c.league !== "nhl" ||
    c.id !== teamProfileId(c.espnId, c.sport, c.league) ||
    !c.name ||
    !c.city ||
    !c.stadium ||
    !c.logo ||
    !c.website ||
    c.description.length > 2000 ||
    c.colors.some((v) => !/^#[0-9a-f]{6}$/i.test(v))
  )
    throw new Error("Perfil de NHL inválido.");
  for (const url of [c.logo, c.website, ...c.references.map((r) => r.url)])
    if (new URL(url).protocol !== "https:")
      throw new Error("Fonte de NHL inválida.");
}
export function nhlProfileReferences(id) {
  return clubs.find((c) => c.id === id)?.references || [];
}
