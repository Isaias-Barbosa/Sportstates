import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { createCache } from "./cache.mjs";
import { leagueFor } from "./catalog.mjs";

const cached = createCache();
let schemaPromise;
let schemaUrl;

function validManualKey(key) {
  if (typeof key !== "string") return false;
  const [sport, league, id, ...extra] = key.split("/");
  return (
    extra.length === 0 &&
    !!leagueFor(sport, league) &&
    !!id &&
    id !== "." &&
    id !== ".." &&
    /^[a-zA-Z0-9._-]{1,80}$/.test(id)
  );
}

function validReviewDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function database() {
  if (!process.env.DATABASE_URL) throw new Error("Banco Neon não configurado.");
  if (schemaUrl !== process.env.DATABASE_URL) {
    schemaUrl = process.env.DATABASE_URL;
    schemaPromise = null;
  }
  const sql = neon(process.env.DATABASE_URL);
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS sport_admin_broadcasts (
        match_key text PRIMARY KEY,
        sport text NOT NULL,
        league text NOT NULL,
        match_id text NOT NULL,
        channel_name text NOT NULL,
        url text NOT NULL,
        reference_url text NOT NULL DEFAULT '',
        reviewed_on date NOT NULL DEFAULT current_date,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`ALTER TABLE sport_admin_broadcasts
        ADD COLUMN IF NOT EXISTS reference_url text NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE sport_admin_broadcasts
        ADD COLUMN IF NOT EXISTS reviewed_on date NOT NULL DEFAULT current_date`;
      await sql`CREATE TABLE IF NOT EXISTS sport_admin_activity (
        id text PRIMARY KEY,
        action text NOT NULL,
        summary text NOT NULL,
        match_key text,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      return sql;
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

export function validateManualBroadcast(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Transmissão inválida.");
  const { key, channel, url } = value;
  const referenceUrl = value.referenceUrl || "";
  const reviewedOn = value.reviewedOn;
  if (
    !validManualKey(key) ||
    typeof channel !== "string" ||
    !channel.trim() ||
    channel.trim().length > 80 ||
    typeof url !== "string" ||
    url.length > 500 ||
    typeof referenceUrl !== "string" ||
    referenceUrl.length > 500 ||
    !validReviewDate(reviewedOn)
  )
    throw new Error(
      "Informe a partida, a fonte, uma data de revisão e links HTTPS válidos.",
    );
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Informe a partida, a fonte e um link HTTPS válido.");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password)
    throw new Error("O link da transmissão deve usar HTTPS.");
  let parsedReference = null;
  if (referenceUrl) {
    try {
      parsedReference = new URL(referenceUrl);
    } catch {
      throw new Error("O link de confirmação deve usar HTTPS.");
    }
    if (
      parsedReference.protocol !== "https:" ||
      parsedReference.username ||
      parsedReference.password
    )
      throw new Error("O link de confirmação deve usar HTTPS.");
  }
  return {
    key,
    channel: channel.trim(),
    url: parsed.toString(),
    referenceUrl: parsedReference?.toString() || "",
    reviewedOn,
  };
}

export function applyManualBroadcasts(matches, records) {
  const byKey = new Map(records.map((record) => [record.match_key, record]));
  return matches.map((match) => {
    const key = `${match.sport}/${match.league}/${match.id}`;
    const record = byKey.get(key);
    if (!record || match.state === "finished") return match;
    const existing = match.watch;
    if (
      existing?.confirmedForMatch &&
      !existing.links.some((link) => link.id === "admin-manual")
    )
      return match;
    const reviewedOn = String(record.reviewed_on).slice(0, 10);
    const reviewedAt = new Date(`${reviewedOn}T12:00:00-03:00`).toISOString();
    const link = {
      id: "admin-manual",
      badge: "TV",
      name: record.channel_name,
      url: record.url,
      access: "check",
      kind: "platform",
      note: `Transmissão informada manualmente e revisada em ${new Date(reviewedAt).toLocaleDateString("pt-BR")}.`,
      sourceUrl: record.reference_url || record.url,
    };
    return {
      ...match,
      watch: {
        ...(existing || {}),
        country: "BR",
        regionLabel: "Brasil",
        scope: "match",
        confirmedForMatch: true,
        reviewedAt,
        links: [link],
        message:
          "Transmissão informada manualmente para esta partida. A programação pode mudar.",
      },
    };
  });
}

export async function enrichManualBroadcasts(matches) {
  if (!process.env.DATABASE_URL || !matches.length)
    return { matches, warning: null };
  try {
    const keys = matches
      .filter((match) => match.state !== "finished")
      .map((match) => `${match.sport}/${match.league}/${match.id}`);
    if (!keys.length) return { matches, warning: null };
    const result = await cached(
      `admin-broadcasts:${keys.join(",")}`,
      30000,
      async () => {
        const sql = await database();
        return sql`SELECT match_key, channel_name, url, reference_url, reviewed_on
          FROM sport_admin_broadcasts WHERE match_key = ANY(${keys}::text[])`;
      },
    );
    return {
      matches: applyManualBroadcasts(matches, result.value),
      warning: null,
    };
  } catch (error) {
    console.error("Falha ao carregar transmissões administrativas:", error);
    return {
      matches,
      warning: "Transmissões informadas pela administração indisponíveis.",
    };
  }
}

export async function listManualBroadcasts(matches) {
  const keys = [
    ...new Set(
      matches.map((match) => `${match.sport}/${match.league}/${match.id}`),
    ),
  ];
  if (!keys.length) return [];
  const sql = await database();
  return sql`SELECT match_key, channel_name, url, reference_url, reviewed_on
    FROM sport_admin_broadcasts WHERE match_key = ANY(${keys}::text[])`;
}

export async function saveManualBroadcast(match, value) {
  const { key, channel, url, referenceUrl, reviewedOn } =
    validateManualBroadcast(value);
  const matchKey = `${match.sport}/${match.league}/${match.id}`;
  if (key !== matchKey) throw new Error("A partida selecionada é inválida.");
  const sql = await database();
  await sql`INSERT INTO sport_admin_broadcasts
      (match_key, sport, league, match_id, channel_name, url, reference_url, reviewed_on, updated_at)
    VALUES (${matchKey}, ${match.sport}, ${match.league}, ${match.id}, ${channel}, ${url}, ${referenceUrl}, ${reviewedOn}, now())
    ON CONFLICT (match_key) DO UPDATE SET
      channel_name = EXCLUDED.channel_name,
      url = EXCLUDED.url,
      reference_url = EXCLUDED.reference_url,
      reviewed_on = EXCLUDED.reviewed_on,
      updated_at = now()`;
  return recordAdminActivitySafely(
    "transmission_saved",
    `Transmissão atualizada: ${channel}`,
    matchKey,
  );
}

export async function removeManualBroadcast(key) {
  if (!validManualKey(key)) throw new Error("Partida inválida.");
  const sql = await database();
  await sql`DELETE FROM sport_admin_broadcasts WHERE match_key = ${key}`;
  return recordAdminActivitySafely(
    "transmission_removed",
    "Transmissão manual removida.",
    key,
  );
}

export async function recordAdminActivity(action, summary, matchKey = null) {
  const sql = await database();
  const id = randomUUID();
  await sql`INSERT INTO sport_admin_activity (id, action, summary, match_key)
    VALUES (${id}, ${action}, ${summary}, ${matchKey})`;
}

export async function recordAdminActivitySafely(
  action,
  summary,
  matchKey = null,
) {
  try {
    await recordAdminActivity(action, summary, matchKey);
    return null;
  } catch (error) {
    console.error("Falha ao registrar ação administrativa:", error);
    return "A alteração foi concluída, mas não foi possível registrá-la no histórico.";
  }
}

export async function listAdminActivity(limit = 20) {
  const sql = await database();
  return sql`SELECT id, action, summary, match_key, created_at
    FROM sport_admin_activity ORDER BY created_at DESC LIMIT ${limit}`;
}
