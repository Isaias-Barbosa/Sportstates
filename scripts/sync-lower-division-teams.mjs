import { neon } from "@neondatabase/serverless";
import { cbfLowerDivisionClubs } from "../server/cbf-lower-divisions.mjs";

if (
  process.env.VERCEL_ENV !== "production" &&
  !process.argv.includes("--apply")
) {
  console.log("Clubes das Séries C e D: cadastro reservado à produção.");
} else {
  if (!process.env.DATABASE_URL) throw new Error("Neon não configurado.");
  const sql = neon(process.env.DATABASE_URL);
  const clubs = cbfLowerDivisionClubs();
  if (
    clubs.length !== 116 ||
    new Set(clubs.map((club) => club.id)).size !== 116
  )
    throw new Error("Cadastro incompleto das Séries C e D.");
  const existing =
    await sql`SELECT id,sport,league FROM sport_teams WHERE id=ANY(${clubs.map((club) => club.id)}::text[])`;
  if (
    existing.some(
      (row) =>
        row.sport !== "soccer" ||
        row.league !== clubs.find((club) => club.id === row.id)?.league,
    )
  )
    throw new Error(
      "Um ID de clube já pertence a outro cadastro; importação interrompida.",
    );
  const results = await sql.transaction(
    clubs.map(
      (club) => sql`
    INSERT INTO sport_teams (id,name,logo,description,city,stadium,stadium_image,website,sport,league,colors,honours)
    VALUES (${club.id},${club.name},${club.logo},${club.description},${club.city},${club.stadium},
      '','','soccer',${club.league},'[]'::jsonb,'[]'::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      description=CASE WHEN btrim(COALESCE(sport_teams.description,''))='' THEN EXCLUDED.description ELSE sport_teams.description END,
      city=CASE WHEN btrim(COALESCE(sport_teams.city,''))='' THEN EXCLUDED.city ELSE sport_teams.city END,
      stadium=CASE WHEN btrim(COALESCE(sport_teams.stadium,''))='' THEN EXCLUDED.stadium ELSE sport_teams.stadium END,
      logo=CASE WHEN btrim(COALESCE(sport_teams.logo,''))='' THEN EXCLUDED.logo ELSE sport_teams.logo END
    WHERE sport_teams.sport='soccer' AND sport_teams.league=EXCLUDED.league
    RETURNING id`,
    ),
  );
  if (results.flat().length !== 116)
    throw new Error(
      "Um ID de clube já pertence a outro cadastro. Confira o relatório.",
    );
  console.log("116 clubes das Séries C e D cadastrados.");
}
