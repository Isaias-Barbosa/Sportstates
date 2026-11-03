import { neon } from "@neondatabase/serverless";
import { SPORTS } from "./catalog.mjs";

const sqlClient = () => {
  if (!process.env.DATABASE_URL) throw new Error("Banco Neon não configurado.");
  return neon(process.env.DATABASE_URL);
};
const nativeLeagues = SPORTS.flatMap((sport) =>
  sport.leagues.map(([id, name]) => ({ id, name, sport: sport.id, native: true })),
);
const validId = (id) => typeof id === "string" && /^[a-z0-9][a-z0-9._-]{0,79}$/i.test(id);
const key = (sport, id) => `${sport}:${id}`;
const isNative = (sport, id) => nativeLeagues.some((item) => item.sport === sport && item.id === id);
const imagePath = (sport, id) => `/api/league-logo?sport=${encodeURIComponent(sport)}&id=${encodeURIComponent(id)}`;
function safeUrl(value) {
  if (!value) return "";
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || value.length > 1000)
    throw new Error("A URL da logo deve usar HTTPS e ter até 1000 caracteres.");
  return value;
}
export async function leagueOverrides() {
  if (!process.env.DATABASE_URL) return [];
  try {
    const sql = sqlClient();
    return await sql`SELECT sport,id,name,logo_url,(logo_data IS NOT NULL) AS has_upload FROM sport_leagues ORDER BY sport,name`;
  } catch (error) {
    if (/relation "sport_leagues" does not exist/.test(String(error.message))) return [];
    throw error;
  }
}
export async function leagueList() {
  const overrides = await leagueOverrides();
  const all = new Map(nativeLeagues.map((item) => [key(item.sport,item.id), { ...item, logo: imagePath(item.sport,item.id), source: "catalog" }]));
  for (const item of overrides) {
    const k = key(item.sport,item.id);
    all.set(k, {
      ...all.get(k), sport: item.sport, id: item.id, name: item.name,
      native: isNative(item.sport,item.id),
      logo: item.has_upload ? imagePath(item.sport,item.id) : item.logo_url || imagePath(item.sport,item.id),
      logo_url: item.logo_url || "", has_upload: item.has_upload,
      source: "neon",
    });
  }
  return [...all.values()].sort((a,b) => a.sport.localeCompare(b.sport) || a.name.localeCompare(b.name,"pt-BR"));
}
export async function saveLeague(payload) {
  const sport = String(payload.sport || "");
  const id = String(payload.id || "");
  const name = String(payload.name || "").trim();
  if (!SPORTS.some((item) => item.id === sport) || !validId(id) || !name || name.length > 120)
    throw new Error("Confira esporte, ID e nome da liga.");
  const logoUrl = safeUrl(String(payload.logo_url || "").trim());
  const upload = payload.upload || null;
  if (upload && (typeof upload !== "object" || !["image/png","image/jpeg","image/webp"].includes(upload.mime) || typeof upload.base64 !== "string" || upload.base64.length > 350000 || !/^[a-zA-Z0-9+/]+={0,2}$/.test(upload.base64)))
    throw new Error("Envie uma imagem PNG, JPEG ou WebP de até 256 KB.");
  const sql = sqlClient();
  if (upload) {
    const mime = upload.mime;
    const bytes = upload.base64;
    await sql`INSERT INTO sport_leagues(sport,id,name,logo_url,logo_data,logo_mime)
      VALUES (${sport},${id},${name},${logoUrl},decode(${bytes},'base64'),${mime})
      ON CONFLICT (sport,id) DO UPDATE SET name=EXCLUDED.name,logo_url=EXCLUDED.logo_url,logo_data=EXCLUDED.logo_data,logo_mime=EXCLUDED.logo_mime,updated_at=now()`;
  } else {
    await sql`INSERT INTO sport_leagues(sport,id,name,logo_url)
      VALUES (${sport},${id},${name},${logoUrl})
      ON CONFLICT (sport,id) DO UPDATE SET name=EXCLUDED.name,logo_url=EXCLUDED.logo_url,updated_at=now()`;
  }
  return { sport, id };
}
export async function removeLeague(sport,id) {
  if (!validId(id) || !SPORTS.some((item) => item.id === sport)) throw new Error("Liga inválida.");
  if (isNative(sport,id)) throw new Error("Ligas nativas não podem ser excluídas. Edite a personalização.");
  const sql = sqlClient();
  const used = await sql`SELECT 1 FROM sport_teams WHERE sport=${sport} AND league=${id} LIMIT 1`;
  if (used.length) throw new Error("Esta liga possui times vinculados e não pode ser excluída.");
  const deleted = await sql`DELETE FROM sport_leagues WHERE sport=${sport} AND id=${id} RETURNING id`;
  return !!deleted.length;
}
export async function leagueLogo(sport,id) {
  if (!validId(id)) return null;
  const sql = sqlClient();
  const rows = await sql`SELECT encode(logo_data,'base64') AS data,logo_mime AS mime FROM sport_leagues WHERE sport=${sport} AND id=${id} AND logo_data IS NOT NULL`;
  return rows[0] || null;
}
