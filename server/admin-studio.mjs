import { neon } from "@neondatabase/serverless";
import { createCache } from "./cache.mjs";
import { leagueFor } from "./catalog.mjs";

const cached = createCache({ shared: false, max: 300 });
export const defaultAppearance = Object.freeze({
  light: "",
  dark: "",
  home: [],
  standings: [],
});
const idPattern = /^[a-z0-9][a-z0-9-]{0,39}$/;
const playerIdPattern = /^(?:espn-|cbf-)?\d{1,12}$/;
const color = /^#[a-f\d]{6}$/i;
const fieldPath = /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+){0,7}$/;
const secretName = /^SPORTSTATES_SOURCE_[A-Z0-9_]+_TOKEN$/;
const string = (value, max) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port
      ? url
      : null;
  } catch {
    return null;
  }
}

export function validateAppearance(input) {
  const { light, dark, home, standings } = input;
  if (
    ![light, dark].every(
      (c) => c === "" || (typeof c === "string" && color.test(c)),
    )
  )
    throw Error("Informe cores no formato #RRGGBB ou deixe em branco.");
  for (const order of [home, standings]) {
    if (
      !Array.isArray(order) ||
      order.length > 100 ||
      new Set(order).size !== order.length ||
      order.some((key) => {
        if (typeof key !== "string") return true;
        const [sport, league, extra] = key.split("/");
        return extra !== undefined || !leagueFor(sport, league);
      })
    )
      throw Error(
        "A ordem precisa conter competições válidas e sem duplicatas.",
      );
  }
  return { light, dark, home, standings };
}

export function validateSources(input) {
  const sources = input.sources;
  if (!Array.isArray(sources) || sources.length > 8)
    throw Error("Cadastre até oito fontes.");
  const items = sources.map((item) => {
    const { id, enabled, target } = item ?? {};
    const name = string(item?.name, 80);
    const url = httpsUrl(item?.url);
    const token = string(item?.token, 100);
    const listPath = string(item?.listPath, 150);
    const titlePath = string(item?.titlePath, 150);
    const valuePath = string(item?.valuePath, 150);
    const linkPath = string(item?.linkPath, 150);
    const ttl = Number(item?.ttl);
    const league = string(item?.league, 100);
    if (
      typeof id !== "string" ||
      !idPattern.test(id) ||
      !name ||
      !url ||
      url.hash ||
      typeof enabled !== "boolean" ||
      !["home", "standings"].includes(target) ||
      (token && !secretName.test(token)) ||
      !fieldPath.test(titlePath) ||
      [listPath, valuePath, linkPath].some(
        (path) => path && !fieldPath.test(path),
      ) ||
      !Number.isInteger(ttl) ||
      ttl < 5 ||
      ttl > 1440
    )
      throw Error(
        "Confira o identificador, URL HTTPS, campos JSON e cache de 5 a 1440 minutos.",
      );
    if (target === "standings") {
      const [sport, code, extra] = league.split("/");
      if (extra !== undefined || !leagueFor(sport, code))
        throw Error("Selecione a competição de destino.");
    }
    return {
      id,
      name,
      enabled,
      target,
      url: url.href,
      token,
      listPath,
      titlePath,
      valuePath,
      linkPath,
      ttl,
      league: target === "standings" ? league : "",
    };
  });
  if (new Set(items.map((item) => item.id)).size !== items.length)
    throw Error("Cada fonte precisa de um identificador único.");
  return items;
}

let tableReady;
async function database() {
  const sql = neon(process.env.DATABASE_URL);
  tableReady ??= sql`CREATE TABLE IF NOT EXISTS sport_admin_studio (
    key text PRIMARY KEY, settings jsonb NOT NULL
  )`;
  return sql;
}
export async function studioSetting(key, fallback, fresh = false) {
  if (!process.env.DATABASE_URL) return fallback;
  const read = async () => {
    const sql = await database();
    const [row] =
      await sql`SELECT settings FROM sport_admin_studio WHERE key = ${key}`;
    return row?.settings ?? fallback;
  };
  return fresh
    ? read()
    : (await cached("setting:" + key, 30_000, read, 300_000)).value;
}
export async function saveStudioSetting(key, settings) {
  const sql = await database();
  await sql`INSERT INTO sport_admin_studio (key, settings) VALUES (${key}, ${JSON.stringify(settings)}::jsonb)
    ON CONFLICT (key) DO UPDATE SET settings = EXCLUDED.settings`;
  cached.clear();
  return settings;
}

function field(object, path) {
  return path
    .split(".")
    .reduce(
      (value, key) =>
        value && typeof value === "object" && Object.hasOwn(value, key)
          ? value[key]
          : undefined,
      object,
    );
}

export function mapSourceItems(payload, config) {
  const list = config.listPath ? field(payload, config.listPath) : payload;
  if (!Array.isArray(list))
    throw Error("O caminho da lista precisa apontar para um array JSON.");
  if (!list.length) return [];
  const items = list.slice(0, 24).flatMap((row) => {
    const title = string(field(row, config.titlePath), 160);
    if (!title) return [];
    const raw = config.valuePath ? field(row, config.valuePath) : undefined;
    const value = typeof raw === "number" ? String(raw) : string(raw, 160);
    const link = config.linkPath
      ? httpsUrl(field(row, config.linkPath))?.href
      : undefined;
    return [{ title, value, link }];
  });
  if (!items.length)
    throw Error("O campo do título não foi encontrado nos itens da lista.");
  return items;
}

export function sourceRequest(config) {
  const url = httpsUrl(config.url);
  const origins = new Set(
    (process.env.SPORTSTATES_SOURCE_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim()),
  );
  if (!url || !origins.has(url.origin))
    throw Error("Autorize a origem HTTPS em SPORTSTATES_SOURCE_ORIGINS.");
  const headers = { Accept: "application/json" };
  if (config.token) {
    const token = secretName.test(config.token) && process.env[config.token];
    const tokenOrigin = process.env[config.token.replace(/_TOKEN$/, "_ORIGIN")];
    if (!token || tokenOrigin !== url.origin)
      throw Error("Configure o token e sua origem HTTPS no servidor.");
    headers.Authorization = "Bearer " + token;
  }
  return { url, headers };
}

const sourceCache = createCache({ shared: false, max: 24 });
const retry = new Map();
export async function readCustomSource(config, test = false) {
  const { url, headers } = sourceRequest(config);
  const key = JSON.stringify(config);
  const load = async () => {
    if (!test && (retry.get(key) ?? 0) > Date.now())
      throw Error("Fonte em espera após uma falha.");
    try {
      const res = await fetch(url, {
        headers,
        redirect: "error",
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) throw Error("A fonte retornou HTTP " + res.status + ".");
      const reader = res.body?.getReader();
      if (!reader) throw Error("Resposta da fonte vazia.");
      const chunks = [];
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 512_000) {
          await reader.cancel();
          throw Error("A resposta ultrapassou 512 KB.");
        }
        chunks.push(value);
      }
      const items = mapSourceItems(
        JSON.parse(Buffer.concat(chunks).toString("utf8")),
        config,
      );
      retry.delete(key);
      return items;
    } catch (error) {
      if (retry.size >= 32) retry.delete(retry.keys().next().value);
      retry.set(key, Date.now() + 60_000);
      throw error;
    }
  };
  if (test) return { items: await load(), stale: false };
  const result = await sourceCache(key, config.ttl * 60_000, load, 3600_000);
  return { items: result.value, stale: result.stale };
}

export function validatePlayerEdit(input) {
  const { id } = input;
  const espnId = string(input.espnId, 30);
  if (
    typeof id !== "string" ||
    !playerIdPattern.test(id) ||
    (espnId && !/^\d{1,12}$/.test(espnId))
  )
    throw Error(
      "Informe o identificador do Sportstates e um código ESPN válido.",
    );
  const entries = (key) => {
    const rows = input[key];
    if (!Array.isArray(rows) || rows.length > 30)
      throw Error("Use até 30 registros por seção.");
    return rows.map((row) => {
      const name = string(row?.name, 140);
      const source = httpsUrl(row?.source);
      if (!name || !source)
        throw Error("Informe o nome e a referência HTTPS de cada registro.");
      return { name, source: source.href };
    });
  };
  return {
    espnId,
    previousClubs: entries("previousClubs"),
    awards: entries("awards"),
  };
}

export async function withPlayerEdit(player, id) {
  const edit = await studioSetting("player:" + id, null).catch(() => null);
  if (!edit && !player && !id.startsWith("espn-")) return null;
  const espnId = edit?.espnId || (id.startsWith("espn-") ? id.slice(5) : "");
  if (!edit && player && !espnId) return player;
  const needsEnrichment =
    !player?.nationality || !player?.position || !player?.currentClub;
  const espn =
    espnId && needsEnrichment
      ? (edit?.espnProfile ?? (await espnPlayer(espnId).catch(() => null)))
      : null;
  if (!player && !espn) return null;
  const base = player || {
    memberships: [],
    clubs: [],
    competitions: [],
    awards: [],
    previousClubs: [],
    image: null,
    marketValue: null,
  };
  const merged = { ...base };
  for (const field of [
    "name",
    "fullName",
    "nationality",
    "flag",
    "position",
    "currentClub",
    "profileAsOf",
  ])
    if ((!base[field] || !player) && espn?.[field]) merged[field] = espn[field];
  return {
    ...merged,
    espnId,
    previousClubs: edit?.previousClubs ?? base.previousClubs,
    awards: edit?.awards ?? base.awards,
  };
}

const espnCache = createCache({ shared: false, max: 160 });
const clubHost = "https://sports.core.api.espn.com/v2/sports/soccer/";
const espnImage = (value) =>
  httpsUrl(value)?.hostname === "a.espncdn.com" ? value : null;
async function espnJson(url) {
  const r = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(6000),
    headers: { Accept: "application/json" },
  });
  if (!r.ok)
    throw Error("Não foi possível consultar a ESPN (HTTP " + r.status + ").");
  return r.json();
}

export async function espnPlayer(id) {
  if (!/^\d{1,12}$/.test(id)) throw Error("Código ESPN inválido.");
  return (
    await espnCache(
      "player:" + id,
      3600_000,
      async () => {
        const athlete = await espnJson(clubHost + "athletes/" + id);
        if (String(athlete.id) !== id || !athlete.displayName)
          throw Error("Atleta não encontrado na ESPN.");
        const clubId = athlete.defaultTeam?.$ref?.match(
          /\/teams\/(\d+)(?:\?|$)/,
        )?.[1];
        const team = clubId
          ? await espnJson(clubHost + "teams/" + clubId).catch(() => null)
          : null;
        const positions = {
          G: "Goleiro",
          D: "Defensor",
          M: "Meio-campista",
          F: "Atacante",
        };
        return {
          name: athlete.displayName,
          fullName: athlete.fullName,
          nationality: athlete.citizenship,
          flag: espnImage(athlete.flag?.href),
          position:
            positions[athlete.position?.abbreviation] ||
            athlete.position?.displayName,
          profileAsOf: new Date().toISOString().slice(0, 10),
          currentClub:
            String(team?.id) === clubId &&
            team?.displayName &&
            team.isNational === false
              ? {
                  id: clubId,
                  name: team.displayName,
                  logo: espnImage(team.logos?.[0]?.href),
                  url: "https://www.espn.com.br/futebol/time/_/id/" + clubId,
                }
              : null,
        };
      },
      86400_000,
    )
  ).value;
}

export async function searchEspnPlayers(query) {
  const q = string(query, 80);
  if (q.length < 3) return [];
  const id = q.match(/^(?:espn-)?(\d{1,12})$/)?.[1];
  if (id) {
    const player = await espnPlayer(id);
    return [{ id, name: player.name, team: player.currentClub?.name }];
  }
  return (
    await espnCache(
      "search:" + q.toLowerCase(),
      900_000,
      async () => {
        const url = new URL("https://site.web.api.espn.com/apis/search/v2");
        url.search = new URLSearchParams({ query: q, limit: "12" });
        const data = await espnJson(url);
        return (data.results ?? [])
          .filter((group) => group.type === "player")
          .flatMap((group) => group.contents ?? [])
          .flatMap((entry) => {
            const id = entry.uid?.match(/^s:600~a:(\d{1,12})$/)?.[1];
            return id && entry.sport === "soccer" && entry.displayName
              ? [{ id, name: entry.displayName, team: entry.subtitle }]
              : [];
          });
      },
      3600_000,
    )
  ).value;
}
