import { neon } from "@neondatabase/serverless";
import { brazilProfiles } from "../server/brazil-profiles.mjs";

// Reviewed, one-time completion of blanks. Never overwrite a user's existing
// profile values, including edits made while the deployment is building.
if (
  process.env.VERCEL_ENV !== "production" &&
  !process.argv.includes("--apply")
) {
  console.log("Perfis Série A: preenchimento reservado à produção.");
} else {
  if (!process.env.DATABASE_URL)
    throw new Error("Neon não configurado para completar a Série A.");
  const sql = neon(process.env.DATABASE_URL);
  const { revision, expectedIds, clubs } = brazilProfiles;
  await sql`CREATE TABLE IF NOT EXISTS sport_profile_imports (revision text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  const done =
    await sql`SELECT revision FROM sport_profile_imports WHERE revision=${revision}`;
  if (done.length)
    console.log(
      "Perfis Série A: revisão já aplicada; mantendo edições do painel.",
    );
  else {
    const existing =
      await sql`SELECT id,sport,league FROM sport_teams WHERE id=ANY(${expectedIds}::text[])`;
    if (
      existing.length !== 20 ||
      existing.some((c) => c.sport !== "soccer" || c.league !== "bra.1")
    )
      throw new Error(
        "Os 20 perfis da Série A não correspondem à revisão. Operação interrompida.",
      );
    const queries = clubs.map(
      (c) => sql`
      UPDATE sport_teams SET
        description=CASE WHEN btrim(COALESCE(description,''))='' THEN ${c.description} ELSE description END,
        city=CASE WHEN btrim(COALESCE(city,''))='' THEN ${c.city} ELSE city END,
        stadium=CASE WHEN btrim(COALESCE(stadium,''))='' THEN ${c.stadium} ELSE stadium END,
        stadium_image=CASE WHEN btrim(COALESCE(stadium_image,''))='' THEN ${c.stadium_image} ELSE stadium_image END,
        website=CASE WHEN btrim(COALESCE(website,''))='' THEN ${c.website} ELSE website END,
        colors=CASE WHEN jsonb_array_length(COALESCE(colors,'[]'::jsonb))=0 THEN ${JSON.stringify(c.colors)}::jsonb ELSE colors END,
        honours=CASE WHEN jsonb_array_length(COALESCE(honours,'[]'::jsonb))=0 THEN ${JSON.stringify(c.honours)}::jsonb ELSE honours END,
        updated_at=now()
      WHERE id=${c.id} AND sport='soccer' AND league='bra.1'
      AND (btrim(COALESCE(description,''))='' OR btrim(COALESCE(city,''))='' OR btrim(COALESCE(stadium,''))='' OR btrim(COALESCE(stadium_image,''))='' OR btrim(COALESCE(website,''))='' OR jsonb_array_length(COALESCE(colors,'[]'::jsonb))=0 OR jsonb_array_length(COALESCE(honours,'[]'::jsonb))=0)
      AND NOT EXISTS (SELECT 1 FROM sport_profile_imports WHERE revision=${revision})
    `,
    );
    queries.push(
      sql`INSERT INTO sport_profile_imports (revision) VALUES (${revision}) ON CONFLICT DO NOTHING`,
    );
    await sql.transaction(queries);
    console.log(
      "Perfis Série A: campos vazios de 18 clubes preenchidos; dados existentes preservados.",
    );
  }
}
