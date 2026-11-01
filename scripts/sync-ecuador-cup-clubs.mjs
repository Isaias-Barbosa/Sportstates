import { neon } from "@neondatabase/serverless";
import {
  ecuadorCupClubProfiles,
  validateEcuadorCupClubProfiles,
} from "../server/ecuador-cup-club-profiles.mjs";

validateEcuadorCupClubProfiles();

if (process.argv.includes("--apply")) {
  if (!process.env.DATABASE_URL)
    throw new Error("Neon não configurado para importar os clubes FEF.");

  const sql = neon(process.env.DATABASE_URL);
  const { revision, clubs } = ecuadorCupClubProfiles;
  await sql`CREATE TABLE IF NOT EXISTS sport_profile_imports (revision text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  const done =
    await sql`SELECT revision FROM sport_profile_imports WHERE revision=${revision}`;
  if (done.length) {
    console.log("Clubes adicionais da Copa Ecuador: revisão já aplicada.");
  } else {
    const ids = clubs.map((club) => club.id);
    const collisions =
      await sql`SELECT id FROM sport_teams WHERE id=ANY(${ids}::text[]) AND sport <> 'soccer'`;
    if (collisions.length)
      throw new Error(
        "ID de outro esporte encontrado; importação da Copa Ecuador interrompida.",
      );

    const queries = clubs.map(
      (club) => sql`
        INSERT INTO sport_teams
          (id,name,logo,description,city,stadium,stadium_image,website,sport,league,colors,honours)
        SELECT
          ${club.id},${club.name},${club.logo},${club.description},${club.city},
          ${club.stadium},${club.stadium_image},${club.website},'soccer',${club.league},
          ${JSON.stringify(club.colors)}::jsonb,${JSON.stringify(club.honours)}::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM sport_profile_imports WHERE revision=${revision})
        ON CONFLICT (id) DO UPDATE SET
          league=EXCLUDED.league,
          city=CASE WHEN btrim(sport_teams.city)='' THEN EXCLUDED.city ELSE sport_teams.city END,
          stadium=CASE WHEN btrim(sport_teams.stadium)='' THEN EXCLUDED.stadium ELSE sport_teams.stadium END,
          logo=CASE WHEN btrim(sport_teams.logo)='' THEN EXCLUDED.logo ELSE sport_teams.logo END,
          description=CASE WHEN btrim(sport_teams.description)='' THEN EXCLUDED.description ELSE sport_teams.description END,
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
    if (
      result.length !== clubs.length ||
      result.some((club) => club.league !== "ecu.copa_2026")
    )
      throw new Error("A conferência dos perfis da Copa Ecuador falhou.");
    console.log(
      `Importação concluída: ${clubs.length} clubes exclusivos da Copa Ecuador, incluindo estádios e referências públicas quando disponíveis.`,
    );
  }
} else {
  console.log(
    "Use --apply para importar os clubes exclusivos da Copa Ecuador.",
  );
}
