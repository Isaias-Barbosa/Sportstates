import { neon } from "@neondatabase/serverless";
import { premierLeagueProfiles } from "../server/premier-league-profiles.mjs";

// Production-only, reviewed snapshot. A revision runs once; later admin edits
// survive redeployments. No publisher/API request is made during the import.
if (
  process.env.VERCEL_ENV !== "production" &&
  !process.argv.includes("--apply")
) {
  console.log("Perfis da Premier League: importação reservada à produção.");
} else {
  if (!process.env.DATABASE_URL)
    throw new Error(
      "Neon não configurado para importar os perfis da Premier League.",
    );
  const sql = neon(process.env.DATABASE_URL),
    { revision, clubs } = premierLeagueProfiles;
  await sql`CREATE TABLE IF NOT EXISTS sport_profile_imports (revision text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  const done =
    await sql`SELECT revision FROM sport_profile_imports WHERE revision=${revision}`;
  if (done.length) {
    console.log(
      "Perfis da Premier League: revisão já aplicada; mantendo edições do painel.",
    );
  } else {
    const collisions =
      await sql`SELECT id FROM sport_teams WHERE id=ANY(${clubs.map((c) => c.id)}::text[]) AND sport <> 'soccer'`;
    if (collisions.length)
      throw new Error(
        "Há um ID de outro esporte entre os perfis; importação interrompida.",
      );
    const queries = clubs.map(
      (c) => sql`
      INSERT INTO sport_teams (id,name,logo,description,city,stadium,website,sport,league,colors,honours)
      SELECT ${c.id},${c.name},${c.logo},${c.description},${c.city},${c.stadium},${c.website},'soccer','eng.1',${JSON.stringify(c.colors)}::jsonb,${JSON.stringify(c.honours)}::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM sport_profile_imports WHERE revision=${revision})
      ON CONFLICT (id) DO UPDATE SET
        city=EXCLUDED.city,stadium=EXCLUDED.stadium,website=EXCLUDED.website,league='eng.1',
        logo=CASE WHEN btrim(sport_teams.logo)='' THEN EXCLUDED.logo ELSE sport_teams.logo END,
        colors=CASE WHEN jsonb_array_length(sport_teams.colors)=0 THEN EXCLUDED.colors ELSE sport_teams.colors END,
        description=CASE WHEN btrim(sport_teams.description)='' THEN EXCLUDED.description ELSE sport_teams.description END,
        honours=CASE WHEN jsonb_array_length(sport_teams.honours)=0 THEN EXCLUDED.honours ELSE sport_teams.honours END,
        updated_at=now()
      WHERE sport_teams.sport='soccer'`,
    );
    queries.push(
      sql`INSERT INTO sport_profile_imports (revision) VALUES (${revision}) ON CONFLICT DO NOTHING`,
    );
    await sql.transaction(queries);
    const result =
      await sql`SELECT id FROM sport_teams WHERE league='eng.1' AND id=ANY(${clubs.map((c) => c.id)}::text[])`;
    if (result.length !== 20)
      throw new Error("A verificação dos 20 perfis da Premier League falhou.");
    console.log(
      "Premier League: 20 perfis conferidos no Neon. Estádio, cidade e site atualizados; descrições e títulos existentes preservados.",
    );
  }
}
