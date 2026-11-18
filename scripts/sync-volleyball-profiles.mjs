import { neon } from "@neondatabase/serverless";
import {
  volleyballProfiles,
  volleyballWomenProfiles,
} from "../server/volleyball-profiles.mjs";
if (
  process.env.VERCEL_ENV !== "production" &&
  !process.argv.includes("--apply")
) {
  console.log("Perfis das Superligas: importação reservada à produção.");
} else {
  if (!process.env.DATABASE_URL)
    throw new Error("Neon não configurado para importar os times de vôlei.");
  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS sport_profile_imports (revision text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  for (const { revision, clubs } of [volleyballProfiles, volleyballWomenProfiles]) {
    const label = clubs[0]?.league === "superliga-women"
      ? "Superliga Feminina"
      : "Superliga Masculina";
    const done =
      await sql`SELECT revision FROM sport_profile_imports WHERE revision=${revision}`;
    if (done.length) {
      console.log(`${label}: revisão já aplicada; mantendo edições do painel.`);
      continue;
    }
    const existing =
      await sql`SELECT id,sport,league FROM sport_teams WHERE id=ANY(${clubs.map((c) => c.id)}::text[])`;
    if (
      existing.some(
        (t) =>
          t.sport !== "volleyball" ||
          !clubs.some((c) => c.id === t.id && c.league === t.league),
      )
    )
      throw new Error(`Conflito de IDs na importação de ${label}.`);
    const queries = clubs.map(
      (c) => sql`INSERT INTO sport_teams (id,name,logo,description,city,stadium,stadium_image,website,sport,league,colors,honours)
   SELECT ${c.id},${c.name},${c.logo},${c.description},${c.city},${c.stadium},${c.stadium_image},${c.website},${c.sport},${c.league},${JSON.stringify(c.colors)}::jsonb,${JSON.stringify(c.honours)}::jsonb
   WHERE NOT EXISTS (SELECT 1 FROM sport_profile_imports WHERE revision=${revision}) ON CONFLICT (id) DO NOTHING`,
    );
    queries.push(
      sql`INSERT INTO sport_profile_imports (revision) VALUES (${revision}) ON CONFLICT DO NOTHING`,
    );
    await sql.transaction(queries);
    const check =
      await sql`SELECT id FROM sport_teams WHERE id=ANY(${clubs.map((c) => c.id)}::text[]) AND sport='volleyball'`;
    if (check.length !== clubs.length)
      throw new Error(`A conferência dos times de ${label} falhou.`);
    console.log(
      `${label}: ${clubs.length} perfis conferidos. Todos os cadastros existentes preservados.`,
    );
  }
}
