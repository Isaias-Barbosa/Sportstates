import { neon } from "@neondatabase/serverless";
import {
  leagueProfiles,
  PROFILE_LEAGUE_COUNTS,
} from "../server/league-profiles.mjs";

// A reviewed, one-time import. Never make publisher requests or infer a new
// season at build time, and never reapply a revision after an admin edits it.
if (
  process.env.VERCEL_ENV !== "production" &&
  !process.argv.includes("--apply")
) {
  console.log("Perfis das seis ligas: importação reservada à produção.");
} else {
  if (!process.env.DATABASE_URL)
    throw new Error("Neon não configurado para importar os clubes.");
  const sql = neon(process.env.DATABASE_URL);
  const { revision, clubs } = leagueProfiles;
  await sql`CREATE TABLE IF NOT EXISTS sport_profile_imports (revision text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  const done =
    await sql`SELECT revision FROM sport_profile_imports WHERE revision=${revision}`;
  if (done.length) {
    console.log(
      "Perfis das seis ligas: revisão já aplicada; mantendo edições do painel.",
    );
  } else {
    const ids = clubs.map((c) => c.id);
    const collisions =
      await sql`SELECT id FROM sport_teams WHERE id=ANY(${ids}::text[]) AND sport <> 'soccer'`;
    if (collisions.length)
      throw new Error(
        "ID de outro esporte encontrado; importação interrompida.",
      );
    const queries = clubs.map(
      (c) => sql`
      INSERT INTO sport_teams (id,name,logo,description,city,stadium,website,sport,league,colors,honours)
      SELECT ${c.id},${c.name},${c.logo},${c.description},${c.city},${c.stadium},${c.website},'soccer',${c.league},${JSON.stringify(c.colors)}::jsonb,${JSON.stringify(c.honours)}::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM sport_profile_imports WHERE revision=${revision})
      ON CONFLICT (id) DO UPDATE SET
        city=EXCLUDED.city,stadium=EXCLUDED.stadium,website=EXCLUDED.website,league=EXCLUDED.league,
        logo=CASE WHEN btrim(sport_teams.logo)='' THEN EXCLUDED.logo ELSE sport_teams.logo END,
        colors=CASE WHEN jsonb_array_length(sport_teams.colors)=0 THEN EXCLUDED.colors ELSE sport_teams.colors END,
        description=CASE WHEN btrim(sport_teams.description)='' THEN EXCLUDED.description ELSE sport_teams.description END,
        honours=CASE WHEN jsonb_array_length(sport_teams.honours)=0 THEN EXCLUDED.honours ELSE sport_teams.honours END,
        updated_at=now()
      WHERE sport_teams.sport='soccer'
    `,
    );
    queries.push(
      sql`INSERT INTO sport_profile_imports (revision) VALUES (${revision}) ON CONFLICT DO NOTHING`,
    );
    await sql.transaction(queries);
    const result =
      await sql`SELECT id,league FROM sport_teams WHERE id=ANY(${ids}::text[]) AND sport='soccer'`;
    for (const [league, count] of Object.entries(PROFILE_LEAGUE_COUNTS)) {
      if (result.filter((c) => c.league === league).length !== count)
        throw new Error(`A conferência dos perfis falhou: ${league}.`);
    }
    console.log(
      "Seis ligas: 114 perfis conferidos no Neon. Textos, títulos, cores e imagens existentes preservados.",
    );
  }
}
