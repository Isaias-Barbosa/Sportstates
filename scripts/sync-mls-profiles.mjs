import { neon } from "@neondatabase/serverless";
import { mlsProfiles, MLS_PRESERVED_IDS } from "../server/mls-profiles.mjs";

// Only insert missing clubs. Even a profile created while this deployment is
// building wins over the reviewed seed. Existing user content is never updated.
if (
  process.env.VERCEL_ENV !== "production" &&
  !process.argv.includes("--apply")
) {
  console.log("Perfis MLS: importação reservada à produção.");
} else {
  if (!process.env.DATABASE_URL)
    throw new Error("Neon não configurado para importar os clubes da MLS.");
  const sql = neon(process.env.DATABASE_URL);
  const { revision, clubs, expectedIds } = mlsProfiles;
  await sql`CREATE TABLE IF NOT EXISTS sport_profile_imports (revision text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  const done =
    await sql`SELECT revision FROM sport_profile_imports WHERE revision=${revision}`;
  if (done.length) {
    console.log("Perfis MLS: revisão já aplicada; mantendo edições do painel.");
  } else {
    const existing =
      await sql`SELECT id,sport,league FROM sport_teams WHERE id=ANY(${expectedIds}::text[])`;
    if (existing.some((c) => c.sport !== "soccer" || c.league !== "usa.1"))
      throw new Error(
        "Um ID da MLS pertence a outro esporte ou liga; importação interrompida.",
      );
    if (MLS_PRESERVED_IDS.some((id) => !existing.some((c) => c.id === id)))
      throw new Error(
        "Os perfis existentes do Atlanta United e Inter Miami não foram encontrados.",
      );
    const queries = clubs.map(
      (c) => sql`
      INSERT INTO sport_teams (id,name,logo,description,city,stadium,website,sport,league,colors,honours)
      SELECT ${c.id},${c.name},${c.logo},${c.description},${c.city},${c.stadium},${c.website},'soccer','usa.1',${JSON.stringify(c.colors)}::jsonb,${JSON.stringify(c.honours)}::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM sport_profile_imports WHERE revision=${revision})
      ON CONFLICT (id) DO NOTHING
    `,
    );
    queries.push(
      sql`INSERT INTO sport_profile_imports (revision) VALUES (${revision}) ON CONFLICT DO NOTHING`,
    );
    await sql.transaction(queries);
    const result =
      await sql`SELECT id FROM sport_teams WHERE id=ANY(${expectedIds}::text[]) AND sport='soccer' AND league='usa.1'`;
    if (result.length !== 30)
      throw new Error("A conferência dos 30 clubes da MLS falhou.");
    console.log(
      "MLS: 30 perfis conferidos no Neon. Atlanta United, Inter Miami e todos os cadastros existentes preservados integralmente.",
    );
  }
}
