import { neon } from "@neondatabase/serverless";
import { getLancePermission } from "./lance-permissions.mjs";

const MAX_FILE = 2_500_000;
const MAX_BODY = 3_600_000;
const TYPES = new Set(["goal", "penalty", "red_card", "save", "chance", "other"]);
const MIME = { gif: "image/gif", webp: "image/webp", mp4: "video/mp4" };

function database() {
  if (!process.env.DATABASE_URL) throw Error("Banco Neon não configurado.");
  return neon(process.env.DATABASE_URL);
}

function reply(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vercel-CDN-Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
}

function matchKey(value) {
  if (typeof value !== "string" ||
      !/^[a-z][a-z-]*\/[a-zA-Z0-9._-]{1,60}\/[0-9]{1,15}$/.test(value))
    throw Error("Identificador de partida inválido.");
  return value;
}

function mediaFromInput(body) {
  if (!["url", "upload"].includes(body.mediaSource))
    throw Error("Origem da mídia inválida.");
  if (body.mediaSource === "url") {
    if (typeof body.mediaUrl !== "string" || body.mediaUrl.length > 2000)
      throw Error("URL inválida.");
    let parsed;
    try { parsed = new URL(body.mediaUrl); } catch { throw Error("URL inválida."); }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password ||
        !parsed.hostname.includes(".") || parsed.hostname === "localhost")
      throw Error("Use um link HTTPS público e válido.");
    const match = /\.([a-z0-9]+)$/i.exec(parsed.pathname);
    const ext = match?.[1]?.toLowerCase();
    if (!MIME[ext])
      throw Error("Use um link direto terminado em .gif, .webp ou .mp4.");
    return { source: "url", type: ext, url: parsed.toString(), data: null };
  }
  if (typeof body.mediaBase64 !== "string" ||
      body.mediaBase64.length > Math.ceil(MAX_FILE * 4 / 3) + 12 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(body.mediaBase64))
    throw Error("Arquivo inválido ou maior que 2,5 MB.");
  const bytes = Buffer.from(body.mediaBase64, "base64");
  if (!bytes.length || bytes.length > MAX_FILE) throw Error("Arquivo excede 2,5 MB.");
  let type = null;
  if (bytes.subarray(0, 6).toString("ascii") === "GIF87a" ||
      bytes.subarray(0, 6).toString("ascii") === "GIF89a") type = "gif";
  else if (bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
           bytes.subarray(8, 12).toString("ascii") === "WEBP") type = "webp";
  else if (bytes.subarray(4, 8).toString("ascii") === "ftyp") type = "mp4";
  if (!type || body.mediaType !== MIME[type])
    throw Error("Formato do arquivo não corresponde a GIF, WebP ou MP4.");
  return { source: "upload", type, url: null, data: bytes.toString("base64") };
}

async function bodyJson(req) {
  let value = req.body;
  if (value == null) {
    let text = "";
    for await (const chunk of req) {
      text += chunk.toString();
      if (Buffer.byteLength(text) > MAX_BODY) throw Error("Arquivo muito grande.");
    }
    value = text;
  }
  if (typeof value === "string") {
    if (Buffer.byteLength(value) > MAX_BODY) throw Error("Arquivo muito grande.");
    value = JSON.parse(value);
  }
  if (!value || Array.isArray(value) || typeof value !== "object" ||
      Buffer.byteLength(JSON.stringify(value)) > MAX_BODY)
    throw Error("Dados inválidos ou muito grandes.");
  return value;
}

function normalizedMinute(value) {
  const clean = String(value || "").trim().replace(/[’′]/g, "'").replace(/\s+/g, "");
  const parsed = /^(\d{1,3})(?:\+(\d{1,2}))?'?(?::[0-5]\d)?$/.exec(clean);
  return parsed
    ? parsed[1] + (parsed[2] ? "+" + parsed[2] : "")
    : "";
}

async function validateEntry(body, getMatch) {
  const key = matchKey(body.matchId);
  if (!TYPES.has(body.lanceType)) throw Error("Categoria inválida.");
  if (typeof body.description !== "string" || body.description.length > 500)
    throw Error("Descrição inválida.");
  const media = mediaFromInput(body);
  let minute = String(body.minute || "").trim();
  let eventId = null;
  let eventSource = null;
  if (body.eventId != null && body.eventId !== "") {
    if (body.lanceType !== "goal" || typeof body.eventId !== "string" ||
        body.eventId.length > 150)
      throw Error("Evento selecionado inválido.");
    const [status, detail] = await getMatch(key);
    if (status !== 200 || !detail?.match) throw Error("Partida indisponível para validar o gol.");
    const goals = [
      ...(detail.highlights?.home || []),
      ...(detail.highlights?.away || []),
    ];
    const selected = goals.find((goal) =>
      goal.kind === "goal" && String(goal.id) === body.eventId
    );
    if (!selected) throw Error("O gol não pertence aos eventos da partida.");
    eventId = String(selected.id);
    minute = String(selected.minute || "").trim();
    eventSource = detail.match.source === "365scores" ? "365scores" : "espn";
  }
  minute = normalizedMinute(minute);
  if (!minute)
    throw Error("Minuto inválido. Use 87 ou 90+3.");
  return {
    key, minute, eventId, eventSource, media,
    type: body.lanceType,
    description: body.description.trim(),
  };
}

const record = (r) => ({
  id: r.id, matchId: r.match_id, eventId: r.event_id,
  eventSource: r.event_source, lanceType: r.lance_type,
  minute: r.minute, description: r.description || "",
  mediaType: r.media_type, mediaSource: r.media_source,
  mediaUrl: r.media_source === "upload"
    ? "/api/lances/media?id=" + r.id : r.media_url,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

export async function handleManualLances(req, res, url, getMatch) {
  const pathname = url.pathname;
  const sql = database();

  if (pathname === "/api/lances/media") {
    if (req.method !== "GET") return reply(res, 405, { error: "Use GET." });
    const id = url.searchParams.get("id") || "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) return reply(res, 400, { error: "ID inválido." });
    const rows = await sql`SELECT media_type, media_data FROM match_manual_lances
      WHERE id = ${id}::uuid AND media_source = 'upload' LIMIT 1`;
    if (!rows.length || !rows[0].media_data)
      return reply(res, 404, { error: "Arquivo não encontrado." });
    let bytes = rows[0].media_data;
    if (typeof bytes === "string" && bytes.startsWith("\\x"))
      bytes = Buffer.from(bytes.slice(2), "hex");
    else bytes = Buffer.from(bytes);
    res.statusCode = 200;
    res.setHeader("Content-Type", MIME[rows[0].media_type] || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("Content-Length", String(bytes.length));
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.end(bytes);
  }

  if (pathname === "/api/lances" && req.method === "GET") {
    let key;
    try { key = matchKey(url.searchParams.get("match_id")); }
    catch (error) { return reply(res, 400, { error: error.message }); }
    const rows = await sql`SELECT id,match_id,event_id,event_source,lance_type,
      minute,description,media_type,media_source,media_url,created_at,updated_at
      FROM match_manual_lances WHERE match_id=${key}
      ORDER BY created_at DESC LIMIT 100`;
    return reply(res, 200, { lances: rows.map(record) });
  }

  if (!["POST", "PUT", "DELETE"].includes(req.method))
    return reply(res, 405, { error: "Método não permitido." });

  const permission = await getLancePermission(req.headers?.authorization);
  if (!permission.canManageLances)
    return reply(res, 403, { error: "Administrador ou moderador necessário." });

  let body;
  try { body = await bodyJson(req); }
  catch (error) { return reply(res, 400, { error: error.message }); }

  if (req.method === "DELETE") {
    if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id))
      return reply(res, 400, { error: "ID inválido." });
    const deleted = await sql`DELETE FROM match_manual_lances WHERE id=${body.id}::uuid RETURNING id`;
    return reply(res, deleted.length ? 200 : 404, {
      ok: !!deleted.length, error: deleted.length ? undefined : "Lance não encontrado.",
    });
  }

  let item;
  try { item = await validateEntry(body, getMatch); }
  catch (error) { return reply(res, 400, { error: error.message }); }

  const { media } = item;
  const data = media.data;
  let rows;
  if (req.method === "POST") {
    // Linking an existing goal replaces its prior manual media rather than duplicating it.
    rows = await sql`INSERT INTO match_manual_lances
      (match_id,event_id,event_source,lance_type,minute,description,
       media_type,media_source,media_url,media_data,created_by)
      VALUES (${item.key},${item.eventId},${item.eventSource},${item.type},
        ${item.minute},${item.description},${media.type},${media.source},
        ${media.url},CASE WHEN ${data}::text IS NULL THEN NULL
          ELSE decode(${data},'base64') END,${permission.userId})
      ON CONFLICT (match_id,event_id) WHERE event_id IS NOT NULL DO UPDATE SET
        media_type=EXCLUDED.media_type, media_source=EXCLUDED.media_source,
        media_url=EXCLUDED.media_url, media_data=EXCLUDED.media_data,
        description=EXCLUDED.description, updated_at=NOW()
      RETURNING id,match_id,event_id,event_source,lance_type,minute,description,
        media_type,media_source,media_url,created_at,updated_at`;
  } else {
    if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id))
      return reply(res, 400, { error: "ID inválido." });
    rows = await sql`UPDATE match_manual_lances SET
      media_type=${media.type},media_source=${media.source},
      media_url=${media.url},media_data=CASE WHEN ${data}::text IS NULL
        THEN NULL ELSE decode(${data},'base64') END,
      description=${item.description},updated_at=NOW()
      WHERE id=${body.id}::uuid AND match_id=${item.key}
      AND lance_type=${item.type} AND
      event_id IS NOT DISTINCT FROM ${item.eventId}::text
      RETURNING id,match_id,event_id,event_source,lance_type,minute,description,
        media_type,media_source,media_url,created_at,updated_at`;
  }
  return reply(res, rows.length ? 200 : 404, {
    ok: !!rows.length,
    lance: rows[0] ? record(rows[0]) : undefined,
    error: rows.length ? undefined : "Lance não encontrado.",
  });
}