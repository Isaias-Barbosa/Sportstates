import { neon } from "@neondatabase/serverless";

if (
  process.env.VERCEL_ENV === "production" ||
  process.argv.includes("--apply")
) {
  if (!process.env.DATABASE_URL) throw new Error("Neon não configurado.");
  const sql = neon(process.env.DATABASE_URL);

  await sql.transaction([
    sql`CREATE TABLE IF NOT EXISTS sport_players (
      id text PRIMARY KEY,
      espn_id text,
      transfermarkt_id text,
      transfermarkt_url text NOT NULL DEFAULT '',
      name text NOT NULL,
      full_name text NOT NULL DEFAULT '',
      team_id text NOT NULL DEFAULT '',
      team_name text NOT NULL DEFAULT '',
      team_logo text NOT NULL DEFAULT '',
      position text NOT NULL DEFAULT '',
      nationality text NOT NULL DEFAULT '',
      flag_url text NOT NULL DEFAULT '',
      photo_url text NOT NULL DEFAULT '',
      jersey text NOT NULL DEFAULT '',
      birth_date text NOT NULL DEFAULT '',
      height text NOT NULL DEFAULT '',
      weight text NOT NULL DEFAULT '',
      league text NOT NULL DEFAULT '',
      bio text NOT NULL DEFAULT '',
      market_value jsonb,
      profile_url text NOT NULL DEFAULT '',
      source text NOT NULL DEFAULT 'manual',
      source_url text NOT NULL DEFAULT '',
      stats jsonb NOT NULL DEFAULT '{}'::jsonb,
      career jsonb NOT NULL DEFAULT '[]'::jsonb,
      transfers jsonb NOT NULL DEFAULT '[]'::jsonb,
      awards jsonb NOT NULL DEFAULT '[]'::jsonb,
      previous_clubs jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT sport_players_id_size CHECK (char_length(id) BETWEEN 3 AND 60),
      CONSTRAINT sport_players_name_size CHECK (char_length(name) BETWEEN 1 AND 140),
      CONSTRAINT sport_players_full_name_size CHECK (char_length(full_name) <= 180),
      CONSTRAINT sport_players_team_size CHECK (char_length(team_name) <= 140),
      CONSTRAINT sport_players_position_size CHECK (char_length(position) <= 80),
      CONSTRAINT sport_players_nationality_size CHECK (char_length(nationality) <= 80),
      CONSTRAINT sport_players_league_size CHECK (char_length(league) <= 40),
      CONSTRAINT sport_players_bio_size CHECK (char_length(bio) <= 4000),
      CONSTRAINT sport_players_source_size CHECK (char_length(source) <= 40)
    )`,
    sql`CREATE UNIQUE INDEX IF NOT EXISTS sport_players_espn_idx
      ON sport_players (espn_id) WHERE espn_id IS NOT NULL`,
    sql`CREATE UNIQUE INDEX IF NOT EXISTS sport_players_transfermarkt_idx
      ON sport_players (transfermarkt_id) WHERE transfermarkt_id IS NOT NULL`,
    sql`CREATE INDEX IF NOT EXISTS sport_players_name_idx
      ON sport_players (lower(name))`,
    sql`CREATE INDEX IF NOT EXISTS sport_players_team_idx
      ON sport_players (lower(team_name))`,
    sql`ALTER TABLE sport_players ENABLE ROW LEVEL SECURITY`,
  ]);

  console.log(
    "Tabela de jogadores preparada. Cadastros anteriores preservados.",
  );
} else console.log("Jogadores: configuração reservada à produção.");
