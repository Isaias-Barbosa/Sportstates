import { neon } from "@neondatabase/serverless";

const MIGRATION = "scripts/setup-other-sports.sql";
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,59}$/;
const NAME_LIMIT = 80;
const ICON_LIMIT = 16;
const DESCRIPTION_LIMIT = 600;
const URL_LIMIT = 1000;

const sqlClient = () => {
  if (!process.env.DATABASE_URL) throw new Error("Banco Neon não configurado.");
  return neon(process.env.DATABASE_URL);
};

function migrationError(error) {
  if (
    /relation "sport_other_sports" does not exist/.test(
      String(error?.message || ""),
    )
  ) {
    error.code = "OTHER_SPORTS_MIGRATION";
    error.message = `Execute a migração ${MIGRATION} no Neon antes de usar Outros esportes.`;
  }
  return error;
}

function invalid(message) {
  const error = new Error(message);
  error.validation = true;
  return error;
}

function text(value, label, limit) {
  const result = typeof value === "string" ? value.trim() : "";
  if (result.length > limit)
    throw invalid(`${label} deve ter até ${limit} caracteres.`);
  return result;
}

function httpsUrl(value, label) {
  const result = text(value, label, URL_LIMIT);
  if (!result) return "";
  let parsed;
  try {
    parsed = new URL(result);
  } catch {
    throw invalid(`${label} deve ser uma URL válida.`);
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password)
    throw invalid(`${label} deve usar HTTPS, sem usuário ou senha.`);
  return result;
}

function sortOrder(value) {
  const result = value == null || value === "" ? 0 : Number(value);
  if (!Number.isInteger(result) || Math.abs(result) > 9999)
    throw invalid(
      "A ordem de exibição deve ser um número inteiro entre -9999 e 9999.",
    );
  return result;
}

function slug(value) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "esporte"
  );
}

async function uniqueId(sql, name) {
  const base = slug(name);
  let id = base;
  for (let suffix = 2; suffix < 1000; suffix++) {
    const rows =
      await sql`SELECT 1 FROM sport_other_sports WHERE id = ${id} LIMIT 1`;
    if (!rows.length) return id;
    id = `${base}-${suffix}`;
  }
  throw new Error("Não foi possível gerar um identificador para este esporte.");
}

export async function listOtherSports({ publishedOnly = false } = {}) {
  const sql = sqlClient();
  try {
    const rows = publishedOnly
      ? await sql`SELECT id,name,icon,description,image_url,source_url,published,sort_order,updated_at
          FROM sport_other_sports WHERE published`
      : await sql`SELECT id,name,icon,description,image_url,source_url,published,sort_order,updated_at
          FROM sport_other_sports`;
    return [...rows].sort(
      (a, b) =>
        Number(a.sort_order) - Number(b.sort_order) ||
        String(a.name).localeCompare(String(b.name), "pt-BR"),
    );
  } catch (error) {
    throw migrationError(error);
  }
}

export async function saveOtherSport(payload) {
  const input = payload && typeof payload === "object" ? payload : {};
  const name = text(input.name, "O nome do esporte", NAME_LIMIT);
  if (!name) throw invalid("Informe o nome do esporte.");
  const icon = text(input.icon, "O ícone", ICON_LIMIT) || "🏅";
  const description = text(input.description, "A descrição", DESCRIPTION_LIMIT);
  const imageUrl = httpsUrl(
    input.image_url ?? input.imageUrl,
    "A URL da imagem",
  );
  const sourceUrl = httpsUrl(
    input.source_url ?? input.sourceUrl,
    "O link oficial ou fonte",
  );
  const published = input.published === true || input.published === "true";
  const order = sortOrder(input.sort_order ?? input.sortOrder);
  if (published && !description)
    throw invalid("Informe uma descrição antes de publicar o esporte.");
  if (published && !sourceUrl)
    throw invalid(
      "Informe o link oficial ou fonte antes de publicar o esporte.",
    );

  const requestedId =
    typeof input.id === "string" ? input.id.trim().toLowerCase() : "";
  if (requestedId && !ID_PATTERN.test(requestedId))
    throw invalid("O identificador do esporte é inválido.");

  const sql = sqlClient();
  try {
    const id = requestedId || (await uniqueId(sql, name));
    const rows = await sql`INSERT INTO sport_other_sports
        (id,name,icon,description,image_url,source_url,published,sort_order)
      VALUES (${id},${name},${icon},${description},${imageUrl},${sourceUrl},${published},${order})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        icon = EXCLUDED.icon,
        description = EXCLUDED.description,
        image_url = EXCLUDED.image_url,
        source_url = EXCLUDED.source_url,
        published = EXCLUDED.published,
        sort_order = EXCLUDED.sort_order,
        updated_at = now()
      RETURNING id,name,icon,description,image_url,source_url,published,sort_order,updated_at`;
    return rows[0];
  } catch (error) {
    throw migrationError(error);
  }
}

export async function removeOtherSport(id) {
  if (typeof id !== "string" || !ID_PATTERN.test(id))
    throw invalid("Esporte inválido.");
  const sql = sqlClient();
  try {
    const deleted =
      await sql`DELETE FROM sport_other_sports WHERE id = ${id} RETURNING id`;
    return Boolean(deleted.length);
  } catch (error) {
    throw migrationError(error);
  }
}
