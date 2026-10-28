const METRICS = {
  minutes: ["MIN", "Minutos"],
  points: ["PTS", "Pontos"],
  rebounds: ["REB", "Rebotes"],
  assists: ["AST", "Assistências"],
  "fieldGoalsMade-fieldGoalsAttempted": [
    "FG",
    "Arremessos convertidos/tentados",
  ],
  "threePointFieldGoalsMade-threePointFieldGoalsAttempted": [
    "3PT",
    "Bolas de três convertidas/tentadas",
  ],
  "freeThrowsMade-freeThrowsAttempted": [
    "LL",
    "Lances livres convertidos/tentados",
  ],
  steals: ["RB", "Roubos de bola"],
  blocks: ["TC", "Tocos"],
  turnovers: ["BP", "Bolas perdidas"],
  offensiveRebounds: ["RO", "Rebotes ofensivos"],
  defensiveRebounds: ["RD", "Rebotes defensivos"],
  fouls: ["FP", "Faltas pessoais"],
  plusMinus: ["+/-", "Saldo em quadra"],
};
const LABELS = {
  PTS: "points",
  REB: "rebounds",
  AST: "assists",
  MIN: "minutes",
  FG: "fieldGoalsMade-fieldGoalsAttempted",
  "3PT": "threePointFieldGoalsMade-threePointFieldGoalsAttempted",
  FT: "freeThrowsMade-freeThrowsAttempted",
  TO: "turnovers",
  STL: "steals",
  BLK: "blocks",
  OREB: "offensiveRebounds",
  DREB: "defensiveRebounds",
  PF: "fouls",
  "+/-": "plusMinus",
};
export const basketballStatName = (name, fallback) =>
  ({
    fieldGoalPct: "Aproveitamento de arremessos (%)",
    threePointFieldGoalPct: "Aproveitamento de três (%)",
    freeThrowPct: "Aproveitamento de lances livres (%)",
    totalRebounds: "Rebotes",
    teamTurnovers: "Bolas perdidas da equipe",
    totalTurnovers: "Bolas perdidas",
    pointsInPaint: "Pontos no garrafão",
    fastBreakPoints: "Pontos em contra-ataques",
    largestLead: "Maior vantagem",
    technicalFouls: "Faltas técnicas",
    flagrantFouls: "Faltas flagrantes",
  })[name] ||
  METRICS[name]?.[1] ||
  fallback ||
  name;
const safeImage = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && /(^|\.)espncdn\.com$/.test(u.hostname)
      ? u.href
      : null;
  } catch {
    return null;
  }
};
const scalar = (value) =>
  value == null || typeof value === "object" ? null : String(value);
export function normalizeBasketball(raw, match) {
  const competitors = raw.header?.competitions?.[0]?.competitors || [];
  const periods = Array.from(
    {
      length: Math.min(
        16,
        Math.max(
          4,
          match.period || 0,
          ...competitors.map((c) => c.linescores?.length || 0),
        ),
      ),
    },
    (_, i) => ({ number: i + 1, label: i < 4 ? `${i + 1}º Q` : `PR${i - 3}` }),
  ).slice(0, 16);
  const scores = [match.home, match.away].map((team) => {
    const c = competitors.find((c) => String(c.team?.id || c.id) === team.id);
    return {
      ...team,
      periods: periods.map((p, i) =>
        scalar(c?.linescores?.[i]?.displayValue ?? c?.linescores?.[i]?.value),
      ),
    };
  });
  const teams = (raw.boxscore?.players || [])
    .map((t) => {
      const columns = new Map(),
        players = new Map();
      for (const block of t.statistics || []) {
        const keys = (
          block.keys?.length ? block.keys : block.names || block.labels || []
        ).map((k) => LABELS[k] || k);
        keys.forEach((key, i) => {
          if (!columns.has(key))
            columns.set(key, {
              key,
              label: METRICS[key]?.[0] || block.labels?.[i] || key,
              description: METRICS[key]?.[1] || block.descriptions?.[i] || key,
            });
        });
        for (const row of block.athletes || []) {
          const a = row.athlete || {};
          if (!a.id || !a.displayName) continue;
          const existing = players.get(String(a.id));
          const stats = { ...(existing?.stats || {}) };
          keys.forEach((key, i) => {
            stats[key] = scalar(row.stats?.[i]);
          });
          players.set(String(a.id), {
            id: String(a.id),
            name: a.displayName,
            number: a.jersey || "",
            position: a.position?.abbreviation || "",
            image: safeImage(a.headshot?.href),
            starter: !!row.starter,
            didNotPlay: !!row.didNotPlay,
            reason: row.didNotPlay
              ? row.reason || "Não entrou em quadra"
              : null,
            stats,
          });
        }
      }
      return {
        id: String(t.team?.id || ""),
        name: t.team?.displayName || "",
        logo: safeImage(t.team?.logo),
        columns: [...columns.values()],
        players: [...players.values()],
      };
    })
    .filter((t) => [match.home.id, match.away.id].includes(t.id));
  const leaders = ["points", "rebounds", "assists"].map((key) => ({
    key,
    label: METRICS[key][1],
    teams: teams.map((t) => {
      const eligible = t.players.filter(
        (p) =>
          !p.didNotPlay &&
          p.stats[key] != null &&
          p.stats[key] !== "" &&
          Number.isFinite(Number(p.stats[key])),
      );
      const value = eligible.length
        ? Math.max(...eligible.map((p) => Number(p.stats[key])))
        : null;
      return {
        id: t.id,
        name: t.name,
        value,
        players:
          value === null
            ? []
            : eligible
                .filter((p) => Number(p.stats[key]) === value)
                .map((p) => ({ id: p.id, name: p.name, image: p.image })),
      };
    }),
  }));
  return { periods, scores, teams, leaders };
}
