import { neon } from "@neondatabase/serverless";
import { createCache } from "./cache.mjs";

export const providerDefaults = Object.freeze({
  geFallback: true,
  nbb365: true,
  nbbLnb: true,
});
const cached = createCache({ shared: false, max: 2 });
const key = "provider-settings";

export function validateProviderSettings(input) {
  const keys = Object.keys(providerDefaults);
  if (
    !input ||
    typeof input !== "object" ||
    Object.keys(input).length !== keys.length ||
    keys.some((field) => typeof input[field] !== "boolean")
  )
    throw new Error("Selecione opções válidas para as fontes.");
  if (!input.nbb365 && !input.nbbLnb)
    throw new Error("Mantenha ao menos uma fonte do NBB ativa.");
  return Object.fromEntries(keys.map((field) => [field, input[field]]));
}

async function database() {
  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS sport_provider_settings (
    id integer PRIMARY KEY CHECK (id = 1),
    settings jsonb NOT NULL
  )`;
  return sql;
}

export async function getProviderSettings({ fresh = false } = {}) {
  if (!process.env.DATABASE_URL) return providerDefaults;
  const load = async () => {
    const sql = await database();
    const [row] =
      await sql`SELECT settings FROM sport_provider_settings WHERE id = 1`;
    return row ? validateProviderSettings(row.settings) : providerDefaults;
  };
  if (fresh) return load();
  return (await cached(key, 30_000, load, 300_000)).value;
}

export async function runtimeProviderSettings() {
  return getProviderSettings().catch(() => providerDefaults);
}

export async function saveProviderSettings(input) {
  const settings = validateProviderSettings(input);
  const sql = await database();
  await sql`INSERT INTO sport_provider_settings (id, settings)
    VALUES (1, ${JSON.stringify(settings)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET settings = EXCLUDED.settings`;
  cached.clear();
  return settings;
}
