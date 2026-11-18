import { readFileSync } from "node:fs";
import { teamProfileId } from "./team-identity.mjs";
// Vercel's file tracer only detects literal paths inside new URL(...).
export const volleyballProfiles = JSON.parse(
  readFileSync(
    new URL("../data/volleyball-profiles-2026.json", import.meta.url),
    "utf8",
  ),
);
// The literal path stays visible to Vercel's tracer, but degrade gracefully if
// an older deployment still lacks the women's catalog: never take down every
// API route because one optional catalog is missing.
export const volleyballWomenProfiles = (() => {
  try {
    return JSON.parse(
      readFileSync(
        new URL("../data/volleyball-women-2026.json", import.meta.url),
        "utf8",
      ),
    );
  } catch {
    return { clubs: [] };
  }
})();
const { clubs } = volleyballProfiles;
if (clubs.length !== 12 || new Set(clubs.map((c) => c.id)).size !== 12)
  throw new Error("Catálogo da Superliga Masculina incompleto.");
const women = volleyballWomenProfiles.clubs;
if (women.length && (women.length !== 12 || new Set(women.map((c) => c.id)).size !== 12))
  throw new Error("Catálogo da Superliga Feminina incompleto.");
const validate = (c, league) => {
  if (
    c.sport !== "volleyball" ||
    c.league !== league ||
    c.id !== teamProfileId(c.cbvId, c.sport, c.league) ||
    !c.name ||
    !c.logo ||
    (league === "superliga-men" && (!c.city || !c.stadium || !c.website)) ||
    c.description.length > 2000 ||
    c.colors.some((v) => !/^#[0-9a-f]{6}$/i.test(v))
  )
    throw new Error(`Perfil de ${league} inválido.`);
  for (const url of [c.logo, c.website, ...c.references.map((r) => r.url)].filter(Boolean))
    if (new URL(url).protocol !== "https:")
      throw new Error(`Fonte de ${league} inválida.`);
};
for (const c of clubs) validate(c, "superliga-men");
for (const c of women) validate(c, "superliga-women");
export const allVolleyballProfiles = [...clubs, ...women];
export function volleyballProfileReferences(id) {
  return allVolleyballProfiles.find((c) => c.id === id)?.references || [];
}
