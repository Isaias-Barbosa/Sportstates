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
        ...(existing?.confirmedForMatch ? {} : { reviewedAt }),
        links: existing?.confirmedForMatch
          ? [
              ...(existing.links || []).filter(
                (existingLink) => existingLink.id !== "admin-manual",
              ),
              link,
            ]
          : [link],
        message: existing?.confirmedForMatch
          ? `${existing.message || "Transmissão confirmada para esta partida."} Fonte manual complementar adicionada; os canais confirmados foram preservados.`
          : "Transmissão informada manualmente para esta partida. A programação pode mudar.",
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

const cbfDocumentUrl = /^https:\/\/stcbfsiteprdimgbrs\.blob\.core\.windows\.net\/img-site\/cdn\/[A-Za-z0-9_%-]+\.pdf$/;

export function validateCbfReview(input) {
  const { reference, file, url, sha256, publishedAt, confirmed } = input ?? {};
  if (
    confirmed !== true || !Number.isInteger(reference) || reference < 1 || reference > 380 ||
    typeof file !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,119}\.pdf$/i.test(file) ||
    typeof url !== "string" || url.length > 500 || !cbfDocumentUrl.test(url) ||
    typeof sha256 !== "string" || !/^[0-9a-f]{64}$/i.test(sha256) ||
    typeof publishedAt !== "string" ||
    !/^2026-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d-03:00$/.test(publishedAt) ||
    !validReviewDate(publishedAt.slice(0, 10))
  ) throw new Error("Confira a referência, a data da publicação, o PDF oficial, o SHA-256 e a confirmação.");
  return { kind: "postponement", reference, file, url, sha256: sha256.toLowerCase(),
    publishedAt: new Date(publishedAt).toISOString() };
}

function cbfReviewFromRow(row) {
  return { kind: "postponement", reference: row.reference, file: row.filename,
    url: row.url, sha256: row.sha256, publishedAt: new Date(row.published_at).toISOString() };
}

let cbfSchema;

function cbfDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Banco Neon não configurado.");
  if (cbfSchema?.url !== url) {
    const sql = neon(url);
    const ready = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS sport_admin_cbf_reviews (
        reference integer NOT NULL CHECK (reference BETWEEN 1 AND 380),
        published_at timestamptz NOT NULL,
        filename text NOT NULL,
        url text NOT NULL,
        sha256 text NOT NULL,
        reviewed_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (reference, published_at)
      )`;
      return sql;
    })();
    const schema = { url, ready };
    cbfSchema = schema;
    void ready.catch(() => {
      if (cbfSchema === schema) cbfSchema = undefined;
    });
  }
  return cbfSchema.ready;
}

export async function listCbfReviews(reference) {
  const sql = await cbfDatabase();
  const rows = await sql`SELECT reference, published_at, filename, url, sha256
    FROM sport_admin_cbf_reviews WHERE reference = ${reference}
    ORDER BY published_at DESC LIMIT 30`;
  return rows.map(cbfReviewFromRow);
}

export async function saveCbfReview(review) {
  const sql = await cbfDatabase();
  const rows = await sql`INSERT INTO sport_admin_cbf_reviews
    (reference, published_at, filename, url, sha256)
    VALUES (${review.reference}, ${review.publishedAt}, ${review.file}, ${review.url}, ${review.sha256})
    ON CONFLICT (reference, published_at) DO UPDATE SET filename = EXCLUDED.filename
    WHERE sport_admin_cbf_reviews.filename = EXCLUDED.filename
      AND sport_admin_cbf_reviews.url = EXCLUDED.url
      AND sport_admin_cbf_reviews.sha256 = EXCLUDED.sha256
    RETURNING reference, published_at, filename, url, sha256`;
  return rows.length ? cbfReviewFromRow(rows[0]) : null;
}
