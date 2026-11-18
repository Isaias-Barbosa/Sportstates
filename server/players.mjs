import { neon } from "@neondatabase/serverless";
import { httpsUrl } from "./admin-studio.mjs";
import { playerLeagues } from "./brazil-players.mjs";

// Registro curado de jogadores. É separado dos elencos importados para os
// perfis brasileiros (`sport_brazil_*`): aqui o admin escolhe quem aparece na
// tabela e na página pública, com dados de ESPN e Transfermarkt.

const emptyPlayer = () => ({
  id: "",
  espnId: "",
  transfermarktId: "",
  transfermarktUrl: "",
  name: "",
  fullName: "",
  teamId: "",
  teamName: "",
  teamLogo: "",
  position: "",
  nationality: "",
  flag: "",
  photo: "",
  jersey: "",
  birthDate: "",
  height: "",
  weight: "",
  league: "",
  bio: "",
  marketValue: null,
  profileUrl: "",
  source: "manual",
  sourceUrl: "",
  stats: {},
  career: [],
  transfers: [],
  awards: [],
  previousClubs: [],
  createdAt: "",
  updatedAt: "",
});

const store = () => {
  if (!process.env.DATABASE_URL)
    throw Error("Banco Neon não configurado.");
  return neon(process.env.DATABASE_URL);
};

const text = (value, max) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const numberOrNull = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const safeUrl = (value, hosts) => {
  const url = httpsUrl(value);
  if (!url) return "";
  if (hosts && !hosts.some((host) => url.hostname === host || url.hostname.endsWith("." + host)))
    return "";
  return url.href;
};
const safeImage = (value) =>
  safeUrl(value, ["a.espncdn.com", "img.a.transfermarkt.technology"]);

const playerIdPattern = /^(?:espn-\d{1,12}|tm-\d{1,12}|local-[a-z0-9-]{4,60})$/;

function invalid(message) {
  const error = Error(message);
  error.validation = true;
  return error;
}

export function validCuratedPlayerId(id) {
  return typeof id === "string" && playerIdPattern.test(id);
}

export function transfermarktPlayerId(value) {
  const raw = text(value, 300);
  if (!raw) return "";
  if (/^\d{1,12}$/.test(raw)) return raw;
  const match =
    raw.match(/spieler\/(\d{1,12})(?:[/?#]|$)/i) ??
    raw.match(/^(\d{1,12})(?:[/?#]|$)/) ??
    raw.match(/\/(\d{1,12})(?:[/?#]|$)/);
  return match?.[1] ?? "";
}

function fromRow(row) {
  return {
    id: row.id,
    espnId: row.espn_id ?? "",
    transfermarktId: row.transfermarkt_id ?? "",
    transfermarktUrl: row.transfermarkt_url ?? "",
    name: row.name ?? "",
    fullName: row.full_name ?? "",
    teamId: row.team_id ?? "",
    teamName: row.team_name ?? "",
    teamLogo: row.team_logo ?? "",
    position: row.position ?? "",
    nationality: row.nationality ?? "",
    flag: row.flag_url ?? "",
    photo: row.photo_url ?? "",
    jersey: row.jersey ?? "",
    birthDate: row.birth_date ?? "",
    height: row.height ?? "",
    weight: row.weight ?? "",
    league: row.league ?? "",
    bio: row.bio ?? "",
    marketValue: row.market_value ?? null,
    profileUrl: row.profile_url ?? "",
    source: row.source ?? "manual",
    sourceUrl: row.source_url ?? "",
    stats: row.stats && typeof row.stats === "object" ? row.stats : {},
    career: Array.isArray(row.career) ? row.career : [],
    transfers: Array.isArray(row.transfers) ? row.transfers : [],
    awards: Array.isArray(row.awards) ? row.awards : [],
    previousClubs: Array.isArray(row.previous_clubs) ? row.previous_clubs : [],
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? ""),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at ?? ""),
  };
}

function cleanRecord(input) {
  const record = emptyPlayer();
  for (const key of [
    "espnId",
    "transfermarktId",
    "transfermarktUrl",
    "name",
    "fullName",
    "teamId",
    "teamName",
    "teamLogo",
    "position",
    "nationality",
    "flag",
    "photo",
    "jersey",
    "birthDate",
    "height",
    "weight",
    "league",
    "bio",
    "profileUrl",
    "source",
    "sourceUrl",
  ]) {
    if (input[key] === undefined) continue;
    record[key] = text(input[key], key === "bio" ? 4000 : key === "fullName" ? 180 : 300);
  }
  record.espnId = /^\d{1,12}$/.test(record.espnId) ? record.espnId : "";
  record.transfermarktId = /^\d{1,12}$/.test(record.transfermarktId)
    ? record.transfermarktId
    : "";
  record.transfermarktUrl = safeUrl(record.transfermarktUrl, [
    "transfermarkt.com.br",
    "transfermarkt.com",
  ]);
  record.teamLogo = safeImage(record.teamLogo);
  record.flag = safeImage(record.flag);
  record.photo = safeImage(record.photo);
  record.profileUrl = safeUrl(record.profileUrl, [
    "espn.com.br",
    "espn.com",
    "transfermarkt.com.br",
    "transfermarkt.com",
  ]);
  record.sourceUrl = safeUrl(record.sourceUrl, [
    "espn.com.br",
    "espn.com",
    "transfermarkt.com.br",
    "transfermarkt.com",
  ]);
  if (input.marketValue !== undefined)
    record.marketValue = validMarketValue(input.marketValue)
      ? input.marketValue
      : null;
  if (input.stats !== undefined && input.stats && typeof input.stats === "object")
    record.stats = input.stats;
  if (Array.isArray(input.career)) record.career = input.career.slice(0, 40);
  if (Array.isArray(input.transfers))
    record.transfers = input.transfers.slice(0, 60);
  if (Array.isArray(input.awards)) record.awards = cleanEntries(input.awards, 40);
  if (Array.isArray(input.previousClubs))
    record.previousClubs = cleanEntries(input.previousClubs, 40);
  return record;
}

function cleanEntries(rows, max) {
  return rows.slice(0, max).flatMap((row) => {
    const name = text(row?.name, 140);
    const source = safeUrl(row?.source);
    return name && source ? [{ name, source }] : [];
  });
}

function validMarketValue(value) {
  return Boolean(
    value &&
      Number.isSafeInteger(value.amount) &&
      value.amount > 0 &&
      ["EUR", "BRL", "USD"].includes(value.currency) &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
      safeUrl(value.source),
  );
}

function mergeRecords(base, incoming) {
  if (!base) return { ...incoming };
  const result = { ...base };
  for (const [key, value] of Object.entries(incoming)) {
    if (value == null) continue;
    if (typeof value === "string" && !value) {
      if (!result[key]) result[key] = value;
      continue;
    }
    if (Array.isArray(value) && !value.length) {
      if (!Array.isArray(result[key]) || !result[key].length) result[key] = value;
      continue;
    }
    if (key === "stats" && typeof value === "object" && !Array.isArray(value)) {
      result[key] = { ...(result[key] ?? {}), ...value };
      continue;
    }
    result[key] = value;
  }
  return result;
}

export async function readCuratedPlayerRow(id) {
  if (!validCuratedPlayerId(id)) return null;
  const sql = store();
  const rows = await sql`SELECT * FROM sport_players WHERE id=${id}`;
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function readCuratedPlayerProfile(id) {
  const row = await readCuratedPlayerRow(id);
  return row ? curatedPlayerProfile(row) : null;
}

export async function listCuratedPlayers({ team = "", q = "" } = {}) {
  const sql = store();
  const teamPattern = text(team, 80)
    ? "%" + text(team, 80) + "%"
    : "%";
  const queryPattern = text(q, 80)
    ? "%" + text(q, 80) + "%"
    : "%";
  const rows = await sql`SELECT * FROM sport_players
    WHERE team_name ILIKE ${teamPattern}
      AND (name ILIKE ${queryPattern}
        OR team_name ILIKE ${queryPattern}
        OR nationality ILIKE ${queryPattern})
    ORDER BY name ASC`;
  return rows
    .map(fromRow)
    .sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
    );
}

// Liga o elenco da ESPN ao cadastro curado. A chave é o código ESPN do atleta
// (o mesmo devolvido pelo elenco) e o valor é o ID público do cadastro, que
// reúne os dados revisados e tem prioridade sobre o vínculo do elenco.
export async function curatedPlayerIdsForTeam(teamId) {
  const providerId = text(teamId, 20);
  if (!/^\d{1,12}$/.test(providerId)) return new Map();
  const sql = store();
  const rows = await sql`SELECT id, espn_id, team_id FROM sport_players
    WHERE espn_id ~ '^[0-9]{1,12}$' AND team_id <> ''`;
  const ids = new Map();
  for (const row of rows) {
    if (!validCuratedPlayerId(row.id)) continue;
    // Aceita tanto o ID numérico da ESPN quanto o perfil prefixado pela liga.
    if (String(row.team_id).replace(/^.*-/, "") !== providerId) continue;
    ids.set(String(row.espn_id), row.id);
  }
  return ids;
}

export async function deleteCuratedPlayer(id) {
  if (!validCuratedPlayerId(id))
    throw invalid("Identificador do jogador inválido.");
  const sql = store();
  const rows = await sql`DELETE FROM sport_players WHERE id=${id}
    RETURNING id, name`;
  return rows[0] ?? null;
}

async function findCuratedPlayer(espnId, transfermarktId) {
  if (!espnId && !transfermarktId) return null;
  const sql = store();
  const [byEspn, byTm] = await Promise.all([
    espnId
      ? sql`SELECT * FROM sport_players WHERE espn_id=${espnId}`
      : Promise.resolve([]),
    transfermarktId
      ? sql`SELECT * FROM sport_players WHERE transfermarkt_id=${transfermarktId}`
      : Promise.resolve([]),
  ]);
  return byEspn[0] ? fromRow(byEspn[0]) : byTm[0] ? fromRow(byTm[0]) : null;
}

function canonicalId(input, espnId, transfermarktId) {
  if (espnId) return "espn-" + espnId;
  if (transfermarktId) return "tm-" + transfermarktId;
  const given = text(input?.id, 60);
  if (validCuratedPlayerId(given)) return given;
  return (
    "local-" +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

function validateRecord(record) {
  if (!record.name) throw invalid("Informe o nome do jogador.");
  if (record.name.length > 140)
    throw invalid("O nome do jogador é muito longo.");
  if (record.bio.length > 4000) throw invalid("A biografia é muito longa.");
  if (record.marketValue && !validMarketValue(record.marketValue))
    throw invalid("Valor de mercado inválido.");
  if (record.espnId && !/^\d{1,12}$/.test(record.espnId))
    throw invalid("Código ESPN inválido.");
  if (record.transfermarktId && !/^\d{1,12}$/.test(record.transfermarktId))
    throw invalid("ID do Transfermarkt inválido.");
}

async function writeRecord(record) {
  const sql = store();
  await sql`INSERT INTO sport_players (
      id, espn_id, transfermarkt_id, transfermarkt_url, name, full_name,
      team_id, team_name, team_logo, position, nationality, flag_url,
      photo_url, jersey, birth_date, height, weight, league, bio,
      market_value, profile_url, source, source_url, stats, career,
      transfers, awards, previous_clubs, updated_at
    ) VALUES (
      ${record.id}, ${record.espnId || null}, ${record.transfermarktId || null},
      ${record.transfermarktUrl}, ${record.name}, ${record.fullName},
      ${record.teamId}, ${record.teamName}, ${record.teamLogo},
      ${record.position}, ${record.nationality}, ${record.flag},
      ${record.photo}, ${record.jersey}, ${record.birthDate},
      ${record.height}, ${record.weight}, ${record.league}, ${record.bio},
      ${record.marketValue ? JSON.stringify(record.marketValue) : null}::jsonb,
      ${record.profileUrl}, ${record.source}, ${record.sourceUrl},
      ${JSON.stringify(record.stats)}::jsonb, ${JSON.stringify(record.career)}::jsonb,
      ${JSON.stringify(record.transfers)}::jsonb, ${JSON.stringify(record.awards)}::jsonb,
      ${JSON.stringify(record.previousClubs)}::jsonb, now()
    )
    ON CONFLICT (id) DO UPDATE SET
      espn_id=EXCLUDED.espn_id,
      transfermarkt_id=EXCLUDED.transfermarkt_id,
      transfermarkt_url=EXCLUDED.transfermarkt_url,
      name=EXCLUDED.name,
      full_name=EXCLUDED.full_name,
      team_id=EXCLUDED.team_id,
      team_name=EXCLUDED.team_name,
      team_logo=EXCLUDED.team_logo,
      position=EXCLUDED.position,
      nationality=EXCLUDED.nationality,
      flag_url=EXCLUDED.flag_url,
      photo_url=EXCLUDED.photo_url,
      jersey=EXCLUDED.jersey,
      birth_date=EXCLUDED.birth_date,
      height=EXCLUDED.height,
      weight=EXCLUDED.weight,
      league=EXCLUDED.league,
      bio=EXCLUDED.bio,
      market_value=EXCLUDED.market_value,
      profile_url=EXCLUDED.profile_url,
      source=EXCLUDED.source,
      source_url=EXCLUDED.source_url,
      stats=EXCLUDED.stats,
      career=EXCLUDED.career,
      transfers=EXCLUDED.transfers,
      awards=EXCLUDED.awards,
      previous_clubs=EXCLUDED.previous_clubs,
      updated_at=now()`;
  return readCuratedPlayerRow(record.id);
}

export async function saveCuratedPlayer(input, { replace = false } = {}) {
  const espnId = /^\d{1,12}$/.test(text(input?.espnId, 12))
    ? text(input?.espnId, 12)
    : "";
  const transfermarktId = /^\d{1,12}$/.test(text(input?.transfermarktId, 12))
    ? text(input?.transfermarktId, 12)
    : transfermarktPlayerId(input?.transfermarkt);
  const id = canonicalId(input, espnId, transfermarktId);
  const existing = await readCuratedPlayerRow(id);
  // O editor do admin envia o formulário completo, inclusive campos vazios:
  // nesse caso o valor vazio apaga o dado anterior. A importação de elenco usa
  // a mesclagem conservadora para não perder o que já foi curado.
  const record = cleanRecord(
    replace && existing
      ? { ...existing, ...input }
      : mergeRecords(existing, input),
  );
  record.id = id;
  record.espnId = espnId || record.espnId;
  record.transfermarktId = transfermarktId || record.transfermarktId;
  validateRecord(record);
  return writeRecord(record);
}

const ESPN_CORE = "https://sports.core.api.espn.com/v2/sports/soccer/athletes/";
const ESPN_WEB = "https://site.web.api.espn.com/apis/common/v3/sports/soccer/";
const TM_BASE = "https://www.transfermarkt.com.br";

async function fetchJson(url, { timeout = 12000, headers } = {}) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeout),
    headers: headers ?? { Accept: "application/json" },
  });
  if (!response.ok) {
    const error = Error(`Fonte respondeu HTTP ${response.status}.`);
    error.provider = true;
    throw error;
  }
  return response.json();
}

const positions = {
  G: "Goleiro",
  D: "Defensor",
  M: "Meio-campista",
  F: "Atacante",
};

function espnImage(value) {
  return safeImage(value);
}

function espnTeamFromCore(core) {
  const id = core.defaultTeam?.$ref?.match(/\/teams\/(\d+)(?:\?|$)/)?.[1] ?? "";
  return id ? { id } : null;
}

async function espnTeam(teamId) {
  if (!/^\d{1,12}$/.test(teamId || "")) return null;
  return fetchJson(
    "https://sports.core.api.espn.com/v2/sports/soccer/teams/" +
      teamId +
      "?lang=pt&region=br",
  ).catch(() => null);
}

function splitStats(names, values) {
  const stats = {};
  names.forEach((name, index) => {
    const value = Number(values?.[index]);
    stats[name] = Number.isFinite(value) ? value : null;
  });
  return stats;
}

function summaryStats(summary) {
  const stats = {
    appearances: null,
    games: null,
    goals: null,
    assists: null,
    yellows: null,
    reds: null,
  };
  for (const entry of summary ?? []) {
    const value = numberOrNull(entry.value);
    if (entry.name === "starts-subIns") {
      const display = typeof entry.display === "string" ? entry.display : "";
      const match = display.match(/(\d+)\s*\(\s*(\d+)\s*\)/);
      if (match) {
        stats.appearances = Number(match[1]) + Number(match[2]);
        stats.games = stats.appearances;
      } else if (value != null) {
        stats.appearances = value;
        stats.games = value;
      }
    }
    if (entry.name === "totalGoals") stats.goals = value;
    if (entry.name === "goalAssists") stats.assists = value;
    if (entry.name === "yellowCards") stats.yellows = value;
    if (entry.name === "redCards") stats.reds = value;
  }
  return stats;
}

export async function fetchEspnPlayer(espnId) {
  if (!/^\d{1,12}$/.test(espnId || ""))
    throw invalid("Código ESPN inválido.");
  let core;
  try {
    core = await fetchJson(ESPN_CORE + espnId + "?lang=pt&region=br");
  } catch (error) {
    error.message = "Atleta não encontrado na ESPN. " + error.message;
    throw error;
  }
  if (String(core.id) !== espnId || !core.displayName)
    throw Error("Atleta não encontrado na ESPN.");
  const league =
    core.defaultLeague?.$ref?.match(/\/leagues\/([^?]+)/)?.[1] ?? "";
  const webBase = league ? ESPN_WEB + league + "/athletes/" + espnId : "";
  const [common, bio, overview] = await Promise.all([
    webBase
      ? fetchJson(webBase + "?lang=pt&region=br").catch(() => null)
      : null,
    webBase
      ? fetchJson(webBase + "/bio?lang=pt&region=br").catch(() => null)
      : null,
    webBase
      ? fetchJson(webBase + "/overview?lang=pt&region=br").catch(() => null)
      : null,
  ]);
  const athlete = common?.athlete ?? core;
  let team = athlete.team ?? null;
  if (!team?.id) {
    const fallbackTeam = espnTeamFromCore(core);
    if (fallbackTeam?.id) team = await espnTeam(fallbackTeam.id);
  }
  const teamIsNational = team?.isNational === true;
  const profileUrl = "https://www.espn.com.br/futebol/jogador/_/id/" + espnId;
  const summary = (athlete.statsSummary?.statistics ?? []).map((entry) => ({
    name: text(entry.name, 60),
    label: text(entry.displayName, 80),
    value: numberOrNull(entry.value),
    display: text(entry.displayValue, 40),
  }));
  const current = summaryStats(summary);
  const labels = overview?.statistics?.names ?? [];
  const teamNames = new Map();
  for (const filter of overview?.statistics?.filters ?? []) {
    if (filter?.name !== "team") continue;
    for (const option of filter.options ?? [])
      teamNames.set(String(option.value), text(option.displayValue, 140));
  }
  const splits = (overview?.statistics?.splits ?? []).slice(0, 12).map((split) => {
    const teamId = text(split.teamId, 12);
    return {
      name: text(split.displayName, 140),
      teamId,
      teamName:
        teamId === String(team?.id)
          ? text(team?.displayName, 140)
          : teamNames.get(teamId) ?? "",
      league: text(split.leagueSlug, 40) || league,
      stats: splitStats(labels, split.stats),
    };
  });
  const year = Number(common?.season?.year ?? overview?.season?.year);
  const season = Number.isFinite(year) && year > 1900 ? year : 0;
  const seasonLabel =
    text(common?.season?.displayName, 80) ||
    text(splits[0]?.name, 140) ||
    (season ? String(season) : "");
  // O resumo da temporada é a única fonte de aparições; ele pertence à
  // competição principal do atleta.
  for (const split of splits) {
    if (!split.league || split.league === league) {
      split.stats.appearances ??= current.appearances;
      split.stats.games ??= current.games;
      split.stats.totalGoals ??= current.goals;
      split.stats.goalAssists ??= current.assists;
      split.stats.yellowCards ??= current.yellows;
      split.stats.redCards ??= current.reds;
    }
  }
  const career = (bio?.teamHistory ?? []).slice(0, 30).flatMap((item) => {
    const id = String(item.id ?? "");
    if (!id || !item.displayName) return [];
    return [
      {
        id,
        name: text(item.displayName, 140),
        logo: espnImage(item.logo),
        seasons: text(item.seasons, 60),
        url: "https://www.espn.com.br/futebol/time/_/id/" + id,
      },
    ];
  });
  const previousClubs = career
    .filter((club) => String(club.id) !== String(team?.id))
    .map((club) => ({ name: club.name, source: club.url }));
  return {
    id: "espn-" + espnId,
    espnId,
    name: text(athlete.displayName, 140),
    fullName: text(athlete.fullName, 180),
    teamId: !teamIsNational ? text(team?.id, 12) : "",
    teamName: !teamIsNational ? text(team?.displayName, 140) : "",
    teamLogo: !teamIsNational ? espnImage(team?.logos?.[0]?.href) : "",
    position:
      positions[athlete.position?.abbreviation] ||
      text(athlete.position?.displayName, 80),
    nationality: text(athlete.citizenship, 80),
    flag: espnImage(athlete.flag?.href ?? core.flag?.href),
    photo: "",
    jersey: text(athlete.jersey ?? core.jersey, 4),
    birthDate: text(
      athlete.displayDOB === "" ? "" : core.dateOfBirth?.slice(0, 10),
      10,
    ),
    height: text(athlete.displayHeight ?? core.displayHeight, 20),
    weight: text(athlete.displayWeight ?? core.displayWeight, 20),
    league,
    profileUrl,
    source: "espn",
    sourceUrl: profileUrl,
    stats: {
      season,
      seasonLabel,
      league,
      summary,
      current,
      splits,
    },
    career,
    previousClubs,
  };
}

function decodeEntities(value) {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, decimal) =>
      String.fromCodePoint(Number(decimal)),
    )
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, entity) =>
      ({
        amp: "&",
        lt: "<",
        gt: ">",
        quot: '"',
        apos: "'",
        nbsp: " ",
      })[entity],
    );
}

const plainText = (value) =>
  decodeEntities(String(value).replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

function parseMarketValue(value) {
  const clean = plainText(value).replace(/\s+/g, "").replace(",", ".");
  const match = clean.match(/€([\d.]+)(mil|mi|bi|m|bn)?/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = (match[2] ?? "").toLowerCase();
  const factor = unit === "mil" ? 1e3 : unit === "bi" || unit === "bn" ? 1e9 : unit ? 1e6 : 1;
  return Math.round(amount * factor);
}

function parseDate(value) {
  const match = String(value ?? "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

function transfermarktProfileUrl(input, id) {
  const url = httpsUrl(input);
  if (
    url &&
    ["transfermarkt.com.br", "transfermarkt.com"].some(
      (host) => url.hostname === host || url.hostname.endsWith("." + host),
    )
  )
    return url.href;
  return TM_BASE + "/-/profil/spieler/" + id;
}

function parseTransfermarktHeader(html, profileUrl) {
  const h1 = plainText(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
  const jersey = h1.match(/^#(\d{1,3})\s+/)?.[1] ?? "";
  const name = h1.replace(/^#\d{1,3}\s+/, "").trim();
  const detailsStart = html.search(/class="data-header__details"/i);
  const detailsEnd = html.search(/class="data-header__box--small"/i);
  const details =
    detailsStart < 0
      ? ""
      : html.slice(
          detailsStart,
          detailsEnd > detailsStart ? detailsEnd : detailsStart + 9000,
        );
  const fields = {};
  for (const item of details.matchAll(
    /<li[^>]*class="data-header__label"[^>]*>([\s\S]*?)<\/li>/gi,
  )) {
    const label = plainText(item[1]);
    const separator = label.indexOf(":");
    if (separator < 0) continue;
    fields[label.slice(0, separator).trim().toLowerCase()] = label
      .slice(separator + 1)
      .trim();
  }
  const photoTag =
    html.match(
      /<img[^>]*class="[^"]*data-header__profile-image[^"]*"[^>]*>/i,
    )?.[0] ?? "";
  const photo = safeImage(
    photoTag.match(/\b(?:data-src|src)="([^"]+)"/i)?.[1],
  );
  const flag = safeImage(
    details
      .match(/Nacionalidade:[\s\S]*?<img[^>]*src="([^"]+)"/i)?.[1],
  );
  const clubBlock =
    html.match(/class="data-header__club"[\s\S]{0,700}?<\/span>/i)?.[0] ?? "";
  const clubAnchor = clubBlock.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
  const clubHref = clubBlock.match(/<a[^>]*href="([^"]+)"/i)?.[1] ?? "";
  const leagueBlock =
    html.match(/class="data-header__league-link"[\s\S]{0,500}?<\/a>/i)?.[0] ??
    "";
  const marketAnchor = html.match(
    /data-header__market-value-wrapper[^>]*>([\s\S]*?)<\/a>/i,
  )?.[1];
  return {
    name: plainText(name),
    photo,
    flag,
    jersey,
    teamName: plainText(clubAnchor?.[1] ?? ""),
    teamUrl: clubHref ? "https://www.transfermarkt.com.br" + clubHref : "",
    league: plainText(leagueBlock),
    position: fields["posição"] ?? fields["posicao"] ?? "",
    nationality: fields["nacionalidade"] ?? "",
    birthPlace: fields["local de nascimento"] ?? "",
    height: fields["altura"] ?? "",
    birthDate: parseDate(fields["nasc./idade"] ?? ""),
    contract: fields["contrato até"] ?? "",
    marketValue: parseMarketValue(marketAnchor ?? ""),
    profileUrl,
  };
}

async function fetchTransfermarktTransfers(id, profileUrl) {
  try {
    const data = await fetchJson(TM_BASE + "/ceapi/transferHistory/list/" + id, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "pt-BR,pt;q=0.9",
        Referer: profileUrl,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
      },
    });
    return (data.transfers ?? []).slice(0, 40).flatMap((transfer) => {
      const date = text(transfer.dateUnformatted, 10);
      const from = text(transfer.from?.clubName, 140);
      const to = text(transfer.to?.clubName, 140);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !from || !to) return [];
      const fee = text(transfer.fee, 40);
      const loan = /empr[eé]stimo|loan/i.test(fee);
      return [
        {
          date,
          from,
          to,
          kind: loan ? "loan" : "transfer",
          source: profileUrl,
        },
      ];
    });
  } catch {
    return [];
  }
}

function transfermarktBio(header) {
  const parts = [];
  const birth = header.birthDate
    ? header.birthDate.split("-").reverse().join("/")
    : "";
  const place = [header.birthPlace, header.nationality]
    .filter(Boolean)
    .join(", ");
  if (birth || place) {
    parts.push(
      `${header.name}${birth ? ` nasceu em ${birth}` : ""}${
        place ? `, em ${place}` : ""
      }.`,
    );
  }
  if (header.position && header.teamName)
    parts.push(`Atua como ${header.position} no ${header.teamName}.`);
  else if (header.position) parts.push(`Atua como ${header.position}.`);
  if (header.height) parts.push(`Altura: ${header.height}.`);
  return parts.join(" ").slice(0, 4000);
}

export async function fetchTransfermarktPlayer(input) {
  const id = transfermarktPlayerId(input);
  if (!id) throw invalid("Informe o ID ou o link do perfil no Transfermarkt.");
  const profileUrl = transfermarktProfileUrl(input, id);
  let response;
  try {
    response = await fetch(profileUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
      },
    });
  } catch (error) {
    const failure = Error(
      "Transfermarkt indisponível no momento. Use o código ESPN ou preencha manualmente.",
    );
    failure.provider = true;
    failure.cause = error;
    throw failure;
  }
  if (!response.ok) {
    const failure = Error(
      `Transfermarkt respondeu HTTP ${response.status}. Use o código ESPN ou preencha manualmente.`,
    );
    failure.provider = true;
    throw failure;
  }
  const html = await response.text();
  if (/captcha|cloudflare|access denied|zugriff/i.test(html)) {
    const failure = Error(
      "O Transfermarkt bloqueou a consulta. Use o código ESPN ou preencha manualmente.",
    );
    failure.provider = true;
    throw failure;
  }
  const finalUrl = response.url || profileUrl;
  const header = parseTransfermarktHeader(html, finalUrl);
  if (!header.name)
    throw Error("Não foi possível identificar o jogador no Transfermarkt.");
  const transfers = await fetchTransfermarktTransfers(id, finalUrl);
  return {
    id: "tm-" + id,
    transfermarktId: id,
    transfermarktUrl: finalUrl,
    name: header.name,
    fullName: header.name,
    teamName: header.teamName,
    teamLogo: "",
    position: header.position,
    nationality: header.nationality,
    flag: header.flag,
    photo: header.photo,
    jersey: header.jersey,
    birthDate: header.birthDate,
    height: header.height,
    league: "",
    bio: transfermarktBio(header),
    marketValue: header.marketValue
      ? {
          amount: header.marketValue,
          currency: "EUR",
          date: new Date().toISOString().slice(0, 10),
          source: finalUrl,
        }
      : null,
    profileUrl: finalUrl,
    source: "transfermarkt",
    sourceUrl: finalUrl,
    transfers,
  };
}

export async function importCuratedPlayer(input) {
  const espnId = /^\d{1,12}$/.test(text(input?.espnId, 12))
    ? text(input?.espnId, 12)
    : "";
  const transfermarktRaw =
    text(input?.transfermarkt, 300) || text(input?.transfermarktUrl, 300) ||
    text(input?.transfermarktId, 12);
  const transfermarktId = transfermarktPlayerId(transfermarktRaw);
  if (!espnId && !transfermarktId)
    throw invalid("Informe o código ESPN ou o ID/link do Transfermarkt.");
  const warnings = [];
  let espn = null;
  let transfermarkt = null;
  if (espnId) {
    try {
      espn = await fetchEspnPlayer(espnId);
    } catch (error) {
      warnings.push("ESPN: " + error.message);
    }
  }
  if (transfermarktId) {
    try {
      transfermarkt = await fetchTransfermarktPlayer(
        input?.transfermarkt || input?.transfermarktUrl || transfermarktId,
      );
    } catch (error) {
      warnings.push("Transfermarkt: " + error.message);
    }
  }
  if (!espn && !transfermarkt) {
    const failure = Error(warnings.join(" "));
    failure.provider = true;
    throw failure;
  }
  const manual = cleanRecord({
    name: text(input?.name, 140),
    teamId: text(input?.teamId, 12),
    teamName: text(input?.teamName, 140),
    position: text(input?.position, 80),
    nationality: text(input?.nationality, 80),
    bio: text(input?.bio, 4000),
  });
  const combined = mergeRecords(manual, {
    ...(transfermarkt ?? {}),
    ...(espn ?? {}),
    photo: espn?.photo || transfermarkt?.photo || "",
    marketValue: transfermarkt?.marketValue ?? null,
    transfermarktId: transfermarktId || "",
    transfermarktUrl: transfermarkt?.transfermarktUrl ?? "",
    source: [espn && "espn", transfermarkt && "transfermarkt"]
      .filter(Boolean)
      .join("+"),
    sourceUrl: espn?.sourceUrl || transfermarkt?.sourceUrl || "",
  });
  const existing = await findCuratedPlayer(espnId, transfermarktId);
  const targetId = espnId
    ? "espn-" + espnId
    : existing?.id ?? "tm-" + transfermarktId;
  const record = cleanRecord(
    mergeRecords(existing ?? manual, { ...combined, id: targetId }),
  );
  record.id = targetId;
  record.espnId = espnId || record.espnId;
  record.transfermarktId = transfermarktId || record.transfermarktId;
  validateRecord(record);
  const saved = await writeRecord(record);
  if (existing && existing.id !== targetId)
    await deleteCuratedPlayer(existing.id);
  return { player: saved, warnings };
}

function rosterAthleteRecord(athlete, team, league) {
  const id = text(athlete.id, 12);
  if (!/^\d{1,12}$/.test(id) || !athlete.displayName) return null;
  return {
    id: "espn-" + id,
    espnId: id,
    name: text(athlete.displayName, 140),
    fullName: text(athlete.fullName, 180),
    teamId: text(team.id, 12),
    teamName: text(team.displayName, 140),
    teamLogo: espnImage(team.logos?.[0]?.href),
    position:
      positions[athlete.position?.abbreviation] ||
      text(athlete.position?.displayName, 80),
    nationality: text(athlete.citizenship, 80),
    flag: espnImage(athlete.flag?.href),
    jersey: text(athlete.jersey, 4),
    birthDate: text(athlete.dateOfBirth?.slice(0, 10), 10),
    height: text(athlete.displayHeight, 20),
    weight: text(athlete.displayWeight, 20),
    league: text(league, 40),
    profileUrl: "https://www.espn.com.br/futebol/jogador/_/id/" + id,
    source: "espn",
    sourceUrl: "https://www.espn.com.br/futebol/jogador/_/id/" + id,
  };
}

export async function importEspnRoster(teamId, league) {
  const id = text(teamId, 12);
  const slug = text(league, 40);
  if (!/^\d{1,12}$/.test(id))
    throw invalid("Informe o ID numérico do time na ESPN.");
  if (!/^[a-z0-9._-]{2,40}$/i.test(slug))
    throw invalid("Informe a liga da ESPN (ex.: eng.1).");
  const url =
    "https://site.api.espn.com/apis/site/v2/sports/soccer/" +
    slug +
    "/teams/" +
    id +
    "/roster?lang=pt&region=br";
  const roster = await fetchJson(url);
  if (String(roster.team?.id) !== id || !roster.team?.displayName) {
    const failure = Error("Elenco não encontrado na ESPN para este time e liga.");
    failure.provider = true;
    throw failure;
  }
  if (roster.team.isNational === true)
    throw invalid("Este identificador é de uma seleção, não de um clube.");
  const athletes = (roster.athletes ?? [])
    .flatMap((group) => group.items ?? [group])
    .slice(0, 80);
  const players = [];
  const warnings = [];
  for (let index = 0; index < athletes.length; index += 4) {
    const batch = athletes.slice(index, index + 4);
    const results = await Promise.allSettled(
      batch.map(async (athlete) => {
        const record = rosterAthleteRecord(athlete, roster.team, slug);
        if (!record) return null;
        return saveCuratedPlayer(record);
      }),
    );
    results.forEach((result, position) => {
      if (result.status === "fulfilled" && result.value)
        players.push(result.value);
      else if (result.status === "rejected")
        warnings.push(
          `${text(batch[position]?.displayName, 80) || "Atleta"}: ${result.reason?.message ?? "falha ao salvar"}`,
        );
    });
  }
  return {
    team: roster.team.displayName,
    imported: players.length,
    total: athletes.length,
    players,
    warnings,
  };
}

function splitCompetition(split, player, fallbackSeason, fallbackLabel) {
  const stats = split.stats ?? {};
  const current = player.stats?.current ?? {};
  const season = Number(split.season) || fallbackSeason;
  return {
    league: split.league || player.league || "all",
    name:
      playerLeagues[split.league] ||
      split.name?.replace(/^\d{4}(?:-\d{4})?\s+/, "") ||
      playerLeagues[player.league] ||
      "Futebol",
    season,
    seasonLabel: split.name || fallbackLabel,
    stats: {
      games: numberOrNull(
        stats.appearances ??
          stats.games ??
          (split.league === player.league
            ? current.appearances ?? current.games
            : null),
      ),
      goals: numberOrNull(stats.totalGoals ?? stats.goals),
      assists: numberOrNull(stats.goalAssists ?? stats.assists),
      yellows: numberOrNull(stats.yellowCards),
      reds: numberOrNull(stats.redCards),
      saves: numberOrNull(stats.saves),
    },
    team: split.teamName || undefined,
    source: player.profileUrl || player.sourceUrl || undefined,
  };
}

// Converte o registro curado para o mesmo formato consumido pela página
// pública de jogador. A rota pública combina este perfil com elenco/seleção.
export function curatedPlayerProfile(row) {
  const player =
    row && typeof row.teamName === "string" ? row : fromRow(row);
  const stats = player.stats ?? {};
  const season = Number(stats.season) || 0;
  const seasonLabel = text(stats.seasonLabel, 140);
  const splits = Array.isArray(stats.splits) ? stats.splits : [];
  const competitions = splits.length
    ? splits.map((split) =>
        splitCompetition(split, player, season, seasonLabel),
      )
    : (() => {
        const current = stats.current ?? {};
        if (!Object.values(current).some((value) => value != null)) return [];
        return [
          {
            league: player.league || "all",
            name: playerLeagues[player.league] || "Futebol",
            season,
            seasonLabel: seasonLabel || String(season),
            stats: {
              games: numberOrNull(current.appearances ?? current.games),
              goals: numberOrNull(current.goals),
              assists: numberOrNull(current.assists),
              yellows: numberOrNull(current.yellows),
              reds: numberOrNull(current.reds),
              saves: numberOrNull(current.saves),
            },
            team: player.teamName || undefined,
            source: player.profileUrl || player.sourceUrl || undefined,
          },
        ];
      })();
  const numericTeam = /^\d{1,12}$/.test(player.teamId);
  const leagueName = playerLeagues[player.league] || player.league || "Futebol";
  const memberships = numericTeam
    ? [
        {
          id: player.teamId,
          name: player.teamName,
          competition: leagueName,
          season,
          seasonLabel,
        },
      ]
    : [];
  const currentClub = player.teamName
    ? {
        id: numericTeam ? player.teamId : "tm-club-" + (player.transfermarktId || player.id),
        name: player.teamName,
        logo: player.teamLogo || null,
        url: numericTeam
          ? "https://www.espn.com.br/futebol/time/_/id/" + player.teamId
          : player.transfermarktUrl || player.profileUrl || player.sourceUrl,
        note: player.source.includes("espn")
          ? "Clube informado pela ESPN"
          : "Clube informado pelo Transfermarkt",
      }
    : null;
  return {
    id: player.id,
    espnId: player.espnId,
    transfermarktId: player.transfermarktId,
    name: player.name,
    fullName: player.fullName || undefined,
    nationality: player.nationality || undefined,
    flag: player.flag || undefined,
    position: player.position || undefined,
    image: player.photo || null,
    portrait: null,
    currentClub,
    profileAsOf: player.updatedAt ? player.updatedAt.slice(0, 10) : undefined,
    memberships,
    clubs: numericTeam ? [{ id: player.teamId, name: player.teamName }] : [],
    previousClubs: player.previousClubs,
    awards: player.awards,
    teamHonours: [],
    transfers: player.transfers,
    marketValue: player.marketValue,
    competitions,
    bio: player.bio || undefined,
    registrations: [],
  };
}
