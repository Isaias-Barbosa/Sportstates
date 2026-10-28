import { neon } from "@neondatabase/serverless";
import { nflProfiles } from "../server/nfl-profiles.mjs";
if (
  process.env.VERCEL_ENV !== "production" &&
  !process.argv.includes("--apply")
) {
  console.log("Perfis NFL: importação reservada à produção.");
} else {
  if (!process.env.DATABASE_URL)
    throw new Error("Neon não configurado para importar os times de NFL.");
  const sql = neon(process.env.DATABASE_URL),
    { revision, clubs } = nflProfiles;
  await sql`CREATE TABLE IF NOT EXISTS sport_profile_imports (revision text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  const done =
    await sql`SELECT revision FROM sport_profile_imports WHERE revision=${revision}`;
  if (done.length) {
    console.log("NFL: revisão já aplicada; mantendo edições do painel.");
  } else {
    const existing =
      await sql`SELECT id,sport,league FROM sport_teams WHERE id=ANY(${clubs.map((c) => c.id)}::text[])`;
    if (
      existing.some(
        (t) =>
          t.sport !== "football" ||
          !clubs.some((c) => c.id === t.id && c.league === t.league),
      )
    )
      throw new Error("Conflito de IDs na importação de NFL.");
    const queries = clubs.map(
      (
        c,
      ) => sql`INSERT INTO sport_teams (id,name,logo,description,city,stadium,stadium_image,website,sport,league,colors,honours)
   SELECT ${c.id},${c.name},${c.logo},${c.description},${c.city},${c.stadium},${c.stadium_image},${c.website},${c.sport},${c.league},${JSON.stringify(c.colors)}::jsonb,${JSON.stringify(c.honours)}::jsonb
   WHERE NOT EXISTS (SELECT 1 FROM sport_profile_imports WHERE revision=${revision}) ON CONFLICT (id) DO NOTHING`,
    );
    // Correct only the erroneous city imported by revision v1. Keep every
    // manually edited field, including any description that differs from v1.
    for (const c of clubs.filter((c) =>
      ["football-nfl-19", "football-nfl-20"].includes(c.id),
    )) {
      const originalDescription = c.description.replace(
        "East Rutherford",
        "Duke University",
      );
      queries.push(
        sql`UPDATE sport_teams SET city=${c.city},description=CASE WHEN description=${originalDescription} THEN ${c.description} ELSE description END,updated_at=now() WHERE id=${c.id} AND sport='football' AND league='nfl' AND city='Duke University'`,
      );
    }
    queries.push(
      sql`INSERT INTO sport_profile_imports (revision) VALUES (${revision}) ON CONFLICT DO NOTHING`,
    );
    await sql.transaction(queries);
    const check =
      await sql`SELECT id FROM sport_teams WHERE id=ANY(${clubs.map((c) => c.id)}::text[]) AND sport='football'`;
    if (check.length !== 32)
      throw new Error("A conferência dos 32 times de NFL falhou.");
    console.log(
      "NFL: 32 perfis conferidos. Todos os cadastros existentes preservados.",
    );
  }
}
