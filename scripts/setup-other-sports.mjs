import { neon } from "@neondatabase/serverless";

if (
  process.env.VERCEL_ENV === "production" ||
  process.argv.includes("--apply")
) {
  if (!process.env.DATABASE_URL) throw new Error("Neon não configurado.");
  const sql = neon(process.env.DATABASE_URL);

  await sql.transaction([
    sql`CREATE TABLE IF NOT EXISTS sport_other_sports (
      id text PRIMARY KEY,
      name text NOT NULL,
      icon text NOT NULL DEFAULT '🏅',
      description text NOT NULL DEFAULT '',
      image_url text NOT NULL DEFAULT '',
      source_url text NOT NULL DEFAULT '',
      published boolean NOT NULL DEFAULT false,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT sport_other_sports_name_size CHECK (char_length(name) BETWEEN 1 AND 80),
      CONSTRAINT sport_other_sports_icon_size CHECK (char_length(icon) <= 16),
      CONSTRAINT sport_other_sports_description_size CHECK (char_length(description) <= 600),
      CONSTRAINT sport_other_sports_published_source CHECK (NOT published OR source_url <> '')
    )`,
    sql`CREATE INDEX IF NOT EXISTS sport_other_sports_published_idx
      ON sport_other_sports (published, sort_order, name)`,
    sql`ALTER TABLE sport_other_sports ENABLE ROW LEVEL SECURITY`,
  ]);

  console.log(
    "Tabela de outros esportes preparada. Cadastros anteriores preservados.",
  );
} else console.log("Outros esportes: configuração reservada à produção.");
