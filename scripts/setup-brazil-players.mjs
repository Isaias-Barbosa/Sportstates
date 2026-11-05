import { neon } from "@neondatabase/serverless";

if (!process.argv.includes("--apply")) {
  console.log("Use --apply para preparar o banco indicado em DATABASE_URL.");
  process.exit(0);
}
if (!process.env.DATABASE_URL) throw new Error("Neon não configurado.");
const sql = neon(process.env.DATABASE_URL);

await sql.transaction([
  sql`CREATE TABLE IF NOT EXISTS sport_brazil_rosters (
    league text NOT NULL, season int NOT NULL, team text NOT NULL, name text NOT NULL,
    players jsonb NOT NULL, PRIMARY KEY (league, season, team))`,
  sql`CREATE TABLE IF NOT EXISTS sport_brazil_player_matches (
    league text NOT NULL, season int NOT NULL, event text NOT NULL,
    kickoff timestamptz NOT NULL, teams jsonb NOT NULL, players jsonb NOT NULL,
    PRIMARY KEY (league, event))`,
  sql`CREATE TABLE IF NOT EXISTS sport_brazil_player_profiles (
    id text PRIMARY KEY, details jsonb NOT NULL)`,
  sql`CREATE INDEX IF NOT EXISTS sport_brazil_matches_players
    ON sport_brazil_player_matches USING gin (players)`,
  sql`CREATE INDEX IF NOT EXISTS sport_brazil_rosters_players
    ON sport_brazil_rosters USING gin (players)`,
  sql`ALTER TABLE sport_brazil_rosters ENABLE ROW LEVEL SECURITY`,
  sql`ALTER TABLE sport_brazil_player_matches ENABLE ROW LEVEL SECURITY`,
  sql`ALTER TABLE sport_brazil_player_profiles ENABLE ROW LEVEL SECURITY`,
]);
console.log("Tabelas e índices dos jogadores do Brasileirão preparados.");
