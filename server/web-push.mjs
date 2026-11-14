import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import webPush from "web-push";
import {
  allowAlert,
  configuredAlerts,
} from "../src/notifications/preferences.mjs";
import { leagueFor } from "./catalog.mjs";
import { validatePreferenceAction } from "./user-preferences.mjs";

const MINUTE = 60_000;
let schema;

export function pushConfig() {
  const {
    DATABASE_URL,
    PUSH_PUBLIC_KEY,
    PUSH_PRIVATE_KEY,
    PUSH_SUBJECT,
    CRON_SECRET,
  } = process.env;
  return DATABASE_URL &&
    PUSH_PUBLIC_KEY &&
    PUSH_PRIVATE_KEY &&
    /^mailto:[^\s@]+@[^\s@]+$/.test(PUSH_SUBJECT || "") &&
    CRON_SECRET?.length >= 32
    ? {
        publicKey: PUSH_PUBLIC_KEY,
        privateKey: PUSH_PRIVATE_KEY,
        subject: PUSH_SUBJECT,
      }
    : null;
}

export function pushCronAuthorized(authorization) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32 || typeof authorization !== "string")
    return false;
  const expected = Buffer.from("Bearer " + secret);
  const actual = Buffer.from(authorization);
  return actual.length === expected.length && timingSafeEqual(expected, actual);
}

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Banco indisponível.");
  if (schema?.url !== url) {
    const sql = neon(url);
    const ready = sql
      .transaction([
        sql`CREATE TABLE IF NOT EXISTS sport_push_devices (
        id text PRIMARY KEY, user_id text NOT NULL, subscription jsonb NOT NULL,
        games jsonb NOT NULL, preferences jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
        tested_at timestamptz
      )`,
        sql`CREATE TABLE IF NOT EXISTS sport_announcements (
          id uuid PRIMARY KEY, title text NOT NULL, body text NOT NULL, url text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )`,
        sql`CREATE INDEX IF NOT EXISTS sport_push_devices_owner ON sport_push_devices(user_id, updated_at)`,
        sql`CREATE TABLE IF NOT EXISTS sport_push_matches (
        key text PRIMARY KEY, snapshot jsonb, next_check timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(), finished boolean NOT NULL DEFAULT false
      )`,
        sql`CREATE TABLE IF NOT EXISTS sport_push_deliveries (
        device_id text NOT NULL REFERENCES sport_push_devices(id) ON DELETE CASCADE,
        alert_id text NOT NULL, match_key text NOT NULL, payload jsonb NOT NULL,
        attempts integer NOT NULL DEFAULT 0, due_at timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (device_id, alert_id)
      )`,
      ])
      .then(() => sql);
    const entry = { url, ready };
    schema = entry;
    void ready.catch(() => {
      if (schema === entry) schema = undefined;
    });
  }
  return schema.ready;
}

const deviceId = (endpoint) =>
  createHash("sha256").update(endpoint).digest("hex");

function pushEndpoint(value) {
  if (typeof value !== "string" || value.length > 1500) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.hash &&
      ([
        "fcm.googleapis.com",
        "updates.push.services.mozilla.com",
        "web.push.apple.com",
      ].includes(url.hostname) ||
        /\.(?:push\.apple\.com|notify\.windows\.com)$/.test(url.hostname))
    )
      return url.href;
  } catch {
    /* Invalid URL. */
  }
  return null;
}

export function validatePushDevice(body, now = Date.now()) {
  const endpoint = pushEndpoint(body?.subscription?.endpoint);
  const keys = body?.subscription?.keys;
  const p256dh = keys?.p256dh;
  const auth = keys?.auth;
  if (
    !endpoint ||
    typeof p256dh !== "string" ||
    !/^[A-Za-z0-9_-]{87}$/.test(p256dh) ||
    Buffer.from(p256dh, "base64url")[0] !== 4 ||
    typeof auth !== "string" ||
    !/^[A-Za-z0-9_-]{22}$/.test(auth)
  )
    throw new Error("Inscrição de notificações inválida.");
  if (!Array.isArray(body.games) || body.games.length > 30)
    throw new Error("Limite de 30 jogos por dispositivo.");
  const games = {};
  for (const game of body.games) {
    const key = game?.key;
    const [sport, league, id, ...extra] =
      typeof key === "string" ? key.split("/") : [];
    const date = Date.parse(game?.date);
    if (
      extra.length ||
      !leagueFor(sport, league) ||
      !/^(?:af-|fd-)?\d{1,15}$/.test(id || "") ||
      !Number.isFinite(date)
    )
      throw new Error("Partida inválida.");
    if (date >= now - 48 * 60 * MINUTE && date <= now + 30 * 24 * 60 * MINUTE)
      games[key] = new Date(date).toISOString();
  }
  const { notifications } = validatePreferenceAction({
    action: "notifications",
    notifications: body.preferences,
  });
  return {
    id: deviceId(endpoint),
    subscription: { endpoint, keys: { p256dh, auth } },
    games,
    preferences: notifications,
  };
}

export async function savePushDevice(user, device) {
  const sql = await database();
  const rows =
    await sql`INSERT INTO sport_push_devices (id, user_id, subscription, games, preferences)
    SELECT ${device.id}, ${user}, ${JSON.stringify(device.subscription)}::jsonb,
      ${JSON.stringify(device.games)}::jsonb, ${JSON.stringify(device.preferences)}::jsonb
    WHERE (SELECT count(*) FROM sport_push_devices WHERE user_id = ${user}
           AND updated_at > now() - interval '30 days' AND id <> ${device.id}) < 5
    ON CONFLICT (id) DO UPDATE SET games = EXCLUDED.games,
      subscription = EXCLUDED.subscription, preferences = EXCLUDED.preferences, updated_at = now()
    WHERE sport_push_devices.user_id = EXCLUDED.user_id
    RETURNING id`;
  return rows.length > 0;
}

export async function removePushDevice(user, value) {
  const endpoint = pushEndpoint(value);
  if (!endpoint) throw new Error("Inscrição inválida.");
  const sql = await database();
  await sql`DELETE FROM sport_push_devices WHERE user_id = ${user} AND id = ${deviceId(endpoint)}`;
}

async function send(subscription, alert, vapidDetails) {
  await webPush.sendNotification(subscription, JSON.stringify(alert), {
    TTL: 300,
    timeout: 4000,
    vapidDetails,
  });
}

export async function testPushDevice(user, value, config) {
  const endpoint = pushEndpoint(value);
  if (!endpoint) return false;
  const sql = await database();
  const [row] = await sql`UPDATE sport_push_devices SET tested_at = now()
    WHERE user_id = ${user} AND id = ${deviceId(endpoint)}
      AND (tested_at IS NULL OR tested_at < now() - interval '1 minute')
    RETURNING id, subscription`;
  if (!row) return false;
  try {
    await send(
      row.subscription,
      {
        id: "sportstates-test:" + randomUUID(),
        title: "Notificações do Sportstates",
        body: "Tudo pronto para receber alertas neste dispositivo.",
        url: "/",
      },
      config,
    );
  } catch (error) {
    if ([404, 410].includes(error.statusCode))
      await sql`DELETE FROM sport_push_devices WHERE id = ${row.id}`;
    throw error;
  }
  return true;
}

export function pushSnapshot(key, detail) {
  const match = detail?.match;
  if (
    !match ||
    detail.stale ||
    !Array.isArray(detail.events) ||
    [match.sport, match.league, match.id].join("/") !== key ||
    !Number.isFinite(Date.parse(detail.fetchedAt))
  )
    return null;
  return {
    fetchedAt: detail.fetchedAt,
    match: {
      id: match.id,
      sport: match.sport,
      league: match.league,
      state: match.state,
      statusName: match.statusName,
      soccerPhase: match.soccerPhase,
      period: match.period,
      home: {
        id: match.home.id,
        name: match.home.name,
        score: match.home.score,
      },
      away: {
        id: match.away.id,
        name: match.away.name,
        score: match.away.score,
      },
      setScores: match.setScores,
    },
    highlights: detail.highlights && {
      home: detail.highlights.home?.slice(0, 60),
      away: detail.highlights.away?.slice(0, 60),
    },
    events: detail.events
      .slice(0, 80)
      .map(({ id, scoring, scorer, scorerTeamId, points, score }) => ({
        id,
        scoring,
        scorer,
        scorerTeamId,
        points,
        score,
      })),
  };
}

export function backgroundAlerts(previous, current) {
  if (!previous || !current) return [];
  const age = Date.parse(current.fetchedAt) - Date.parse(previous.fetchedAt);
  return age > 0 && age <= 5 * MINUTE
    ? configuredAlerts(previous, current)
    : [];
}

export async function runPushMonitor(loadDetail, config) {
  const sql = await database();
  const due = await sql`SELECT DISTINCT watch.key, state.next_check
    FROM sport_push_devices d CROSS JOIN LATERAL jsonb_each_text(d.games) watch
    LEFT JOIN sport_push_matches state ON state.key = watch.key
    WHERE d.updated_at > now() - interval '30 days'
      AND watch.value::timestamptz BETWEEN now() - interval '48 hours' AND now() + interval '5 minutes'
      AND NOT coalesce(state.finished, false) AND (state.next_check IS NULL OR state.next_check <= now())
    ORDER BY state.next_check NULLS FIRST, watch.key LIMIT 12`;
  const checked = await Promise.allSettled(
    due.map(async ({ key }) => {
      const [claim] = await sql`INSERT INTO sport_push_matches (key, next_check)
      VALUES (${key}, now() + interval '55 seconds')
      ON CONFLICT (key) DO UPDATE SET next_check = EXCLUDED.next_check
      WHERE NOT sport_push_matches.finished AND sport_push_matches.next_check <= now()
      RETURNING snapshot, next_check::text AS lease`;
      if (!claim) return;
      const [status, detail] = await loadDetail(key);
      const current = status === 200 ? pushSnapshot(key, detail) : null;
      if (
        !current ||
        (claim.snapshot &&
          Date.parse(current.fetchedAt) <= Date.parse(claim.snapshot.fetchedAt))
      )
        return;
      const alerts = backgroundAlerts(claim.snapshot, current).slice(0, 8);
      const devices = alerts.length
        ? await sql`SELECT id, preferences FROM sport_push_devices
      WHERE games ? ${key} AND updated_at > now() - interval '30 days'`
        : [];
      const deliveries = devices.flatMap((device) =>
        alerts
          .filter((alert) =>
            allowAlert(alert, current.match.sport, device.preferences),
          )
          .map((alert) => ({
            device: device.id,
            id: alert.id,
            payload: {
              id: alert.id,
              title: alert.icon + " " + alert.title,
              body: alert.body,
              url: alert.url,
              silent: !device.preferences.sound,
            },
          })),
      );
      await sql`WITH updated AS (
      UPDATE sport_push_matches SET snapshot = ${JSON.stringify(current)}::jsonb,
        updated_at = now(), finished = ${current.match.state === "finished"}
      WHERE key = ${key} AND next_check = ${claim.lease}::timestamptz RETURNING key
    )
    INSERT INTO sport_push_deliveries (device_id, alert_id, match_key, payload)
    SELECT device.id, item->>'id', updated.key, item->'payload'
    FROM updated CROSS JOIN jsonb_array_elements(${JSON.stringify(deliveries)}::jsonb) item
    JOIN sport_push_devices device ON device.id = item->>'device' AND device.games ? updated.key
    ON CONFLICT DO NOTHING`;
    }),
  );
  const pending = await sql`WITH claimed AS (
    SELECT delivery.device_id, delivery.alert_id
    FROM sport_push_deliveries delivery JOIN sport_push_devices device ON device.id = delivery.device_id
    WHERE delivery.due_at <= now() AND delivery.attempts < 3
      AND ((delivery.match_key = '' AND delivery.created_at > now() - interval '1 day')
        OR (delivery.match_key <> '' AND device.games ? delivery.match_key AND delivery.created_at > now() - interval '5 minutes'))
      AND device.updated_at > now() - interval '30 days'
    ORDER BY delivery.due_at, delivery.device_id, delivery.alert_id LIMIT 30
    FOR UPDATE OF delivery SKIP LOCKED
  ), leased AS (
    UPDATE sport_push_deliveries delivery SET attempts = attempts + 1,
      due_at = now() + interval '1 minute' FROM claimed
    WHERE delivery.device_id = claimed.device_id AND delivery.alert_id = claimed.alert_id
    RETURNING delivery.device_id, delivery.alert_id, delivery.payload
  ) SELECT leased.*, device.subscription FROM leased JOIN sport_push_devices device ON device.id = leased.device_id`;
  for (let index = 0; index < pending.length; index += 10) {
    await Promise.allSettled(
      pending.slice(index, index + 10).map(async (item) => {
        try {
          await send(item.subscription, item.payload, config);
        } catch (error) {
          if ([404, 410].includes(error.statusCode))
            await sql`DELETE FROM sport_push_devices WHERE id = ${item.device_id}`;
          return;
        }
        await sql`UPDATE sport_push_deliveries SET attempts = 3 WHERE device_id = ${item.device_id} AND alert_id = ${item.alert_id}`;
      }),
    );
  }
  await sql.transaction([
    sql`DELETE FROM sport_push_deliveries WHERE created_at < now() - CASE WHEN match_key = '' THEN interval '1 day' ELSE interval '5 minutes' END`,
    sql`DELETE FROM sport_push_matches WHERE updated_at < now() - interval '3 days'`,
    sql`DELETE FROM sport_push_devices WHERE updated_at < now() - interval '30 days'`,
  ]);
  return {
    checked: due.length,
    failed: checked.filter((result) => result.status === "rejected").length,
    attemptedDeliveries: pending.length,
  };
}

export function validateAnnouncement(input) {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  const id = input.id;
  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    ) ||
    !title ||
    title.length > 80 ||
    !body ||
    body.length > 240 ||
    !Array.isArray(input.matches) ||
    input.matches.length > 10
  )
    throw new Error("Informe um título, uma mensagem e até dez partidas.");
  const matches = [...new Set(input.matches)];
  for (const key of matches) {
    const [sport, league, match, ...extra] =
      typeof key === "string" ? key.split("/") : [];
    if (
      extra.length ||
      !leagueFor(sport, league) ||
      !/^(?:af-|fd-)?\d{1,15}$/.test(match || "")
    )
      throw new Error("Partida inválida no informe.");
  }
  return {
    id,
    title,
    body,
    url: matches.length === 1 ? "/partida/" + matches[0] : "/",
  };
}

export async function publishAnnouncement(announcement) {
  const sql = await database();
  const { id, title, body, url } = announcement;
  const payload = JSON.stringify({
    id: "announcement:" + id,
    title,
    body,
    url,
  });
  const [result] = await sql`WITH published AS (
    INSERT INTO sport_announcements (id, title, body, url)
    VALUES (${id}::uuid, ${title}, ${body}, ${url})
    ON CONFLICT DO NOTHING RETURNING id
  ), enqueued AS (
    INSERT INTO sport_push_deliveries (device_id, alert_id, match_key, payload)
    SELECT device.id, ${"announcement:" + id}, '', ${payload}::jsonb
    FROM published CROSS JOIN sport_push_devices device
    WHERE device.updated_at > now() - interval '30 days'
    RETURNING device_id
  )
  SELECT EXISTS (SELECT 1 FROM published) AS created, (SELECT count(*)::integer FROM enqueued) AS queued`;
  return result;
}
