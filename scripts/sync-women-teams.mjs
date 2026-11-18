import { neon } from "@neondatabase/serverless";
import { womenTeams } from "../server/women-teams.mjs";

// Reviewed, one-time import of women's soccer clubs. No publisher request is
// made here and an applied revision is never re-run after admin edits.
if (process.env.VERCEL_ENV !== "production" && !process.argv.includes("--apply")) {
  console.log("Times femininos: importação reservada à produção.");
} else {
  if (!process.env.DATABASE_URL)
    throw new Error("Neon não configurado para importar os times femininos.");
  const sql = neon(process.env.DATABASE_URL);
  const { revision, clubs } = womenTeams;
  await sql`CREATE TABLE IF NOT EXISTS sport_profile_imports (revision text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  const done =
    await sql`SELECT revision FROM sport_profile_imports WHERE revision=${revision}`;
  if (done.length) {
    console.log("Times femininos: revisão já aplicada; mantendo edições do painel.");
  } else {
    const ids = clubs.map((c) => c.id);
    const collisions =
      await sql`SELECT id FROM sport_teams WHERE id=ANY(${ids}::text[]) AND sport <> 'soccer'`;
    if (collisions.length)
      throw new Error("ID de outro esporte encontrado; importação interrompida.");
    const queries = clubs.map(
      (c) => sql`
        INSERT INTO sport_teams (id,name,logo,description,city,stadium,website,sport,league,colors,honours)
        SELECT ${c.id},${c.name},${c.logo},${c.description},${c.city},${c.stadium},${c.website},'soccer',${c.league},${JSON.stringify(c.colors)}::jsonb,${JSON.stringify(c.honours)}::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM sport_profile_imports WHERE revision=${revision})
        ON CONFLICT (id) DO UPDATE SET
          name=EXCLUDED.name,league=EXCLUDED.league,
          logo=CASE WHEN btrim(sport_teams.logo)='' THEN EXCLUDED.logo ELSE sport_teams.logo END,
          description=CASE WHEN btrim(sport_teams.description)='' THEN EXCLUDED.description ELSE sport_teams.description END,
          colors=CASE WHEN jsonb_array_length(sport_teams.colors)=0 THEN EXCLUDED.colors ELSE sport_teams.colors END,
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
    for (const [league, count] of Object.entries(womenTeams.expectedCounts)) {
      if (result.filter((c) => c.league === league).length !== count)
        throw new Error(`A conferência dos times femininos falhou: ${league}.`);
    }
    console.log(
      `Futebol feminino: ${clubs.length} times conferidos no Neon.`,
    );
  }
}
