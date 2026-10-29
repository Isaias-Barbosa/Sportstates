import { neon } from "@neondatabase/serverless";
import { SPORTS, leagueFor } from "./catalog.mjs";
import { validProfileId } from "./team-identity.mjs";
export const DEFAULT_NOTIFICATIONS = Object.freeze({
  mode: "important",
  score: true,
  red: true,
  phase: true,
  start: true,
  finish: true,
  period: true,
  sound: false,
  tone: "stadium",
  volume: 0.45,
});
export const emptyPreferences = () => ({
  matches: [],
  teams: [],
  sports: [],
  leagues: [],
  notifications: { ...DEFAULT_NOTIFICATIONS },
});
export function validatePreferenceAction(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Preferências inválidas.");
  if (value.action === "favorite") {
    if (
      !["match", "team"].includes(value.kind) ||
      typeof value.id !== "string" ||
      typeof value.selected !== "boolean"
    )
      throw Error("Favorito inválido.");
    if (value.kind === "team" && !validProfileId(value.id))
      throw Error("Time inválido.");
    if (value.kind === "match") {
      const [sport, league, id, ...extra] = value.id.split("/");
      if (
        extra.length ||
        !leagueFor(sport, league) ||
        !/^\d{1,15}$/.test(id || "")
      )
        throw Error("Partida inválida.");
    }
    return {
      action: "favorite",
      kind: value.kind,
      id: value.id,
      selected: value.selected,
    };
  }
  if (value.action === "interests") {
    const sports = validatePreferenceAction({
      action: "sports",
      sports: value.sports,
    });
    const leagues = validatePreferenceAction({
      action: "leagues",
      leagues: value.leagues,
    });
    return {
      action: "interests",
      sports: sports.sports,
      leagues: leagues.leagues,
    };
  }
  if (value.action === "sports") {
    if (
      !Array.isArray(value.sports) ||
      value.sports.length > SPORTS.length ||
      value.sports.some((s) => !SPORTS.some((v) => v.id === s))
    )
      throw Error("Esportes inválidos.");
    return { action: "sports", sports: [...new Set(value.sports)] };
  }
  if (value.action === "leagues") {
    if (
      !Array.isArray(value.leagues) ||
      value.leagues.length > 150 ||
      value.leagues.some((key) => {
        if (typeof key !== "string") return true;
        const [sport, league, ...extra] = key.split("/");
        return extra.length || !leagueFor(sport, league);
      })
    )
      throw Error("Ligas inválidas.");
    return { action: "leagues", leagues: [...new Set(value.leagues)] };
  }
  if (value.action === "notifications") {
    const n = value.notifications;
    if (
      !n ||
      typeof n !== "object" ||
      Array.isArray(n) ||
      !["all", "important", "results"].includes(n.mode) ||
      !["stadium", "whistle", "soft"].includes(n.tone) ||
      typeof n.volume !== "number" ||
      !Number.isFinite(n.volume) ||
      n.volume < 0 ||
      n.volume > 1 ||
      ["score", "red", "phase", "start", "finish", "period", "sound"].some(
        (k) => typeof n[k] !== "boolean",
      )
    )
      throw Error("Configuração de alertas inválida.");
    return {
      action: "notifications",
      notifications: Object.fromEntries(
        Object.keys(DEFAULT_NOTIFICATIONS).map((k) => [k, n[k]]),
      ),
    };
  }
  throw Error("Ação inválida.");
}
export function applyPreferenceAction(current, action) {
  const next = structuredClone(current || emptyPreferences());
  if (action.action === "favorite") {
    const field = action.kind === "team" ? "teams" : "matches";
    const values = new Set(
      (next[field] || []).filter(
        (id) => !action.selected || !action.replaceTeamIds?.includes(id),
      ),
    );
    if (action.selected) values.add(action.id);
    else values.delete(action.id);
    if (values.size > (field === "teams" ? 50 : 200))
      throw Error("Limite de favoritos atingido.");
    next[field] = [...values];
  } else if (action.action === "interests") {
    next.sports = action.sports;
    next.leagues = action.leagues;
  } else if (action.action === "sports") next.sports = action.sports;
  else if (action.action === "leagues") next.leagues = action.leagues;
  else next.notifications = action.notifications;
  return next;
}
const sqlClient = () => {
  if (!process.env.DATABASE_URL) throw Error("Banco indisponível.");
  return neon(process.env.DATABASE_URL);
};
export async function getPreferences(userId) {
  const sql = sqlClient();
  const rows =
    await sql`SELECT preferences,version FROM sport_user_preferences WHERE user_id=${userId}`;
  const row = rows[0] || { preferences: emptyPreferences(), version: 0 };
  row.preferences = { ...emptyPreferences(), ...row.preferences };
  if (row.preferences.teams.length > 1)
    row.preferences = normalizeTeamFavorites(
      row.preferences,
      await favoriteTeams(row.preferences),
    );
  return row;
}
export async function mutateVersionedPreferences(
  userId,
  action,
  { read, write, resolve = async (action) => action },
) {
  for (let retry = 0; retry < 4; retry++) {
    const row = await read(userId);
    const next = applyPreferenceAction(
      row.preferences,
      await resolve(action, row.preferences),
    );
    const written = await write(userId, next, row.version);
    if (written) return written;
  }
  throw Error("Conflito ao salvar. Tente novamente.");
}
export async function mutatePreferences(userId, action) {
  const sql = sqlClient();
  return mutateVersionedPreferences(userId, action, {
    read: getPreferences,
    resolve: async (action, current) =>
      action.action === "favorite" &&
      action.kind === "team" &&
      action.selected &&
      action.teamScope
        ? {
            ...action,
            replaceTeamIds: (await favoriteTeams(current))
              .filter((t) => `${t.sport}/${t.league}` === action.teamScope)
              .map((t) => t.id),
          }
        : action,
    write: async (id, next, version) => {
      const rows =
        await sql`INSERT INTO sport_user_preferences(user_id,preferences,version) VALUES(${id},${JSON.stringify(next)}::jsonb,1) ON CONFLICT(user_id) DO UPDATE SET preferences=EXCLUDED.preferences,version=sport_user_preferences.version+1,updated_at=now() WHERE sport_user_preferences.version=${version} RETURNING preferences,version`;
      return rows[0] || null;
    },
  });
}
export async function favoriteTeams(preferences) {
  if (!preferences.teams?.length) return [];
  const sql = sqlClient();
  return sql`SELECT id,name,logo,sport,league FROM sport_teams WHERE id=ANY(${preferences.teams}::text[]) ORDER BY name`;
}

// Older accounts may have followed several teams in the same league. Keep the latest choice.
export function normalizeTeamFavorites(preferences, teams) {
  const byId = new Map(teams.map((t) => [t.id, t]));
  const seen = new Set();
  const ids = [...preferences.teams]
    .reverse()
    .filter((id) => {
      const team = byId.get(id);
      if (!team) return false;
      const key = `${team.sport}/${team.league}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .reverse();
  return { ...preferences, teams: ids };
}
