import { neon } from "@neondatabase/serverless";
if (
  process.env.VERCEL_ENV === "production" ||
  process.argv.includes("--apply")
) {
  if (!process.env.DATABASE_URL) throw Error("Neon não configurado.");
  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS sport_user_preferences(user_id text PRIMARY KEY,preferences jsonb NOT NULL DEFAULT '{}'::jsonb,version integer NOT NULL DEFAULT 0,updated_at timestamptz NOT NULL DEFAULT now())`;
  await sql`ALTER TABLE sport_user_preferences ENABLE ROW LEVEL SECURITY`;
  console.log(
    "Preferências de usuários: tabela preparada. Cadastros anteriores preservados.",
  );
} else console.log("Preferências: configuração reservada à produção.");
