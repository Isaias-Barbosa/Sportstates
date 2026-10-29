import { neon } from "@neondatabase/serverless";
import {
  saudiProfiles,
  saudiImportCandidates,
} from "../server/saudi-profiles.mjs";

// Existing profiles always win, including records created during a deployment.
if (
  process.env.VERCEL_ENV !== "production" &&
  !process.argv.includes("--apply")
) {
  console.log("Perfis sauditas: importação reservada à produção.");
} else {
  if (!process.env.DATABASE_URL)
    throw Error("Neon não configurado para importar os clubes sauditas.");
  const sql = neon(process.env.DATABASE_URL),
    { revision, clubs, expectedIds } = saudiProfiles;
  await sql`CREATE TABLE IF NOT EXISTS sport_profile_imports (revision text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  const done =
    await sql`SELECT revision FROM sport_profile_imports WHERE revision=${revision}`;
  if (done.length)
    console.log(
      "Liga Saudita: revisão já aplicada; mantendo edições do painel.",
    );
  else {
    const existing =
      await sql`SELECT id,sport,league FROM sport_teams WHERE id=ANY(${expectedIds}::text[])`;
    const candidates = saudiImportCandidates(existing);
    const queries = candidates.map(
      (c) => sql`
      INSERT INTO sport_teams (id,name,logo,description,city,stadium,stadium_image,website,sport,league,colors,honours)
      SELECT ${c.id},${c.name},${c.logo},${c.description},${c.city},${c.stadium},${c.stadium_image},${c.website},'soccer','ksa.1',${JSON.stringify(c.colors)}::jsonb,${JSON.stringify(c.honours)}::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM sport_profile_imports WHERE revision=${revision})
      ON CONFLICT (id) DO NOTHING
    `,
    );
    queries.push(
      sql`INSERT INTO sport_profile_imports (revision) VALUES (${revision}) ON CONFLICT DO NOTHING`,
    );
    await sql.transaction(queries);
    const check =
      await sql`SELECT id FROM sport_teams WHERE id=ANY(${expectedIds}::text[]) AND sport='soccer' AND league='ksa.1'`;
    if (check.length !== 18)
      throw Error("A conferência dos 18 clubes sauditas falhou.");
    console.log(
      "Liga Saudita: 18 perfis conferidos no Neon. Todos os cadastros existentes preservados.",
    );
  }
}
