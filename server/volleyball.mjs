import { createCache } from "./cache.mjs";
import { flightObjects } from "./public-flight.mjs";
import { getWatchOptions } from "./watch.mjs";
const cached = createCache();
export const CBV_URL =
  "https://cbv.com.br/volei-de-quadra/superliga-a-masculina";
const image = (v) => {
  try {
    const u = new URL(v);
    return u.protocol === "https:" &&
      u.hostname === "assets.volleystation.com" &&
      !u.username &&
      !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
};
export function parseCbvMatches(html) {
  const objects = flightObjects(html);
  if (!objects.some((o) => o.gender === "masculino"))
    throw Error("Programação masculina não confirmada.");
  const selected = new Map();
  const teamData = new Map(
    objects
      .filter((o) => o.Team_ID && Array.isArray(o.PlayerList))
      .map((o) => [String(o.Team_ID), o]),
  );
  const halls = new Map(
    objects
      .filter((o) => o.Hall_ID && o.Denomination)
      .map((o) => [String(o.Hall_ID), o]),
  );
  for (const m of objects.filter(
    (o) =>
      o.ChampionshipMatch_ID &&
      typeof o.isLive === "boolean" &&
      typeof o.isFinished === "boolean",
  )) {
    if (
      !/^\d{1,12}$/.test(String(m.ChampionshipMatch_ID)) ||
      !Number.isFinite(Date.parse(m.MatchDateTime)) ||
      !/^\d+$/.test(String(m.HomeTeam_ID)) ||
      !/^\d+$/.test(String(m.GuestTeam_ID))
    )
      continue;
    const old = selected.get(m.ChampionshipMatch_ID);
    if (!old || typeof m.HomeTeamData === "object")
      selected.set(m.ChampionshipMatch_ID, m);
  }
  const safeTeam = (t) =>
    t && typeof t === "object"
      ? {
          id: t.id,
          Team_ID: t.Team_ID,
          Code: t.Code,
          badge: t.badge,
          PlayerList: Array.isArray(t.PlayerList)
            ? t.PlayerList.map((p) => ({
                Player_ID: p.Player_ID,
                Player_Name: p.Player_Name,
                Player_Surname: p.Player_Surname,
                Number: p.Number,
                Position: p.Position,
              }))
            : [],
        }
      : null;
  return [...selected.values()].map((m) => {
    const keys = [
      "ChampionshipMatch_ID",
      "Championship_ID",
      "HomeTeam_ID",
      "GuestTeam_ID",
      "HomeTeam",
      "GuestTeam",
      "MatchDateTime",
      "WonSetHome",
      "WonSetGuest",
      "RoundType",
      "isLive",
      "isFinished",
      "postponed",
      ...Array.from({ length: 5 }, (_, i) => [
        `Set${i + 1}Home`,
        `Set${i + 1}Guest`,
      ]).flat(),
    ];
    const row = Object.fromEntries(keys.map((k) => [k, m[k]]));
    const hall = halls.get(String(m.Hall_ID)) || m.hall;
    return {
      ...row,
      HomeTeamData: safeTeam(
        teamData.get(String(m.HomeTeam_ID)) || m.HomeTeamData,
      ),
      GuestTeamData: safeTeam(
        teamData.get(String(m.GuestTeam_ID)) || m.GuestTeamData,
      ),
      hall:
        hall && typeof hall === "object"
          ? { Denomination: hall.Denomination, City: hall.City }
          : null,
      custom_data: {
        sge_transmission_names: Array.isArray(
          m.custom_data?.sge_transmission_names,
        )
          ? m.custom_data.sge_transmission_names
          : [],
      },
      widget: { current_set: Number(m.widget?.current_set) || 0 },
    };
  });
}
export function normalizeVolley(m) {
  const finished = m.isFinished,
    live = !finished && m.isLive && !m.postponed;
  const home = {
    id: String(m.HomeTeam_ID),
    name: m.HomeTeam,
    short: m.HomeTeamData?.Code || "",
    logo: image(m.HomeTeamData?.badge),
    score: finished || live ? String(m.WonSetHome) : null,
    penalties: null,
    winner: finished && m.WonSetHome > m.WonSetGuest,
  };
  const away = {
    id: String(m.GuestTeam_ID),
    name: m.GuestTeam,
    short: m.GuestTeamData?.Code || "",
    logo: image(m.GuestTeamData?.badge),
    score: finished || live ? String(m.WonSetGuest) : null,
    penalties: null,
    winner: finished && m.WonSetGuest > m.WonSetHome,
  };
  const sets = Array.from({ length: 5 }, (_, i) => ({
    number: i + 1,
    home: String(m[`Set${i + 1}Home`] ?? 0),
    away: String(m[`Set${i + 1}Guest`] ?? 0),
  })).filter((s) => Number(s.home) || Number(s.away));
  const match = {
    id: String(m.ChampionshipMatch_ID),
    sport: "volleyball",
    league: "superliga-men",
    leagueName: "Superliga Masculina",
    date: new Date(m.MatchDateTime).toISOString(),
    name: `${home.name} x ${away.name}`,
    home,
    away,
    state: finished ? "finished" : live ? "live" : "scheduled",
    statusName: m.postponed
      ? "STATUS_POSTPONED"
      : finished
        ? "STATUS_FINAL"
        : live
          ? "STATUS_IN_PROGRESS"
          : "STATUS_SCHEDULED",
    status: finished ? "Encerrado" : live ? "Ao vivo" : "Agendado",
    clock: "",
    period: live ? Number(m.widget?.current_set) || sets.length : sets.length,
    venue: m.hall?.Denomination || "",
    round: m.RoundType || "",
    setScores: sets,
    sourceUrl: `https://cbv.com.br/jogo/${m.ChampionshipMatch_ID}`,
    seasonType: 2,
  };
  const names = m.custom_data?.sge_transmission_names;
  const watch = getWatchOptions(match, {
    broadcasts: Array.isArray(names) ? [{ country: "BR", names }] : [],
  });
  if (watch?.confirmedForMatch) {
    watch.links = watch.links.map((l) => ({
      ...l,
      sourceUrl: match.sourceUrl,
      note: "Canal anunciado pela CBV para esta partida. Confira a programação oficial.",
    }));
    watch.message =
      "Transmissão informada pela CBV para esta partida no Brasil.";
  }
  return { ...match, watch };
}
export async function cbvSchedule() {
  return cached(
    "cbv:superliga-men:v1",
    (rows) => (rows.some((m) => m.isLive && !m.isFinished) ? 30000 : 60000),
    async () => {
      const r = await fetch(CBV_URL, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw Error("CBV indisponível.");
      const rows = parseCbvMatches(await r.text());
      if (!rows.length) throw Error("Programação masculina indisponível.");
      return rows;
    },
    300000,
  );
}
export function parseCbvStandings(html) {
  const objects = flightObjects(html);
  const data = objects.find(
    (o) =>
      o.championshipId &&
      Array.isArray(o.teams) &&
      o.teams.length &&
      o.teams[0].position,
  );
  if (!data) throw Error("Classificação masculina indisponível.");
  return data.teams
    .map((t) => ({
      id: String(t.teamId),
      name: t.teamName,
      logo: image(t.badge),
      rank: String(t.position),
      stats: {
        points: String(t.points),
        gamesPlayed: String(t.matches),
        wins: String(t.wins),
        losses: String(t.losses),
        setsWon: String(t.setsWon),
        setsLost: String(t.setsLost),
        pointsFor: String(t.pointsWon),
        pointsAgainst: String(t.pointsLost),
      },
    }))
    .sort((a, b) => Number(a.rank) - Number(b.rank));
}
export async function volleyStandings() {
  const r = await cached(
    "cbv:standings-men:v1",
    300000,
    async () => {
      const response = await fetch(`${CBV_URL}/classificacao`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw Error("CBV indisponível.");
      return parseCbvStandings(await response.text());
    },
    300000,
  );
  return {
    sport: "volleyball",
    league: "superliga-men",
    name: "Superliga Masculina",
    groups: [{ name: "Superliga Masculina", rows: r.value }],
    rounds: [],
    fetchedAt: new Date(r.at).toISOString(),
    stale: r.stale,
    source: "CBV · classificação oficial masculina",
  };
}
const positions = {
  1: "Levantador",
  2: "Ponteiro",
  3: "Oposto",
  4: "Central",
  5: "Líbero",
};
export function volleyRoster(team) {
  return (Array.isArray(team?.PlayerList) ? team.PlayerList : [])
    .filter((p) => p.Player_ID)
    .map((p) => ({
      id: String(p.Player_ID),
      name: [p.Player_Name, p.Player_Surname].filter(Boolean).join(" "),
      number: String(p.Number || ""),
      position: positions[p.Position] || "Jogador",
      image: null,
    }));
}
export function volleyDetailRow(row) {
  const match = normalizeVolley(row);
  const lineups = [
    ["HomeTeamData", "home", match.home],
    ["GuestTeamData", "away", match.away],
  ]
    .map(([key, side, t]) => ({
      team: t.name,
      formation: "",
      homeAway: side,
      players: volleyRoster(row[key]).map((p) => ({
        ...p,
        shortName: p.name,
        jersey: p.number,
        positionName: p.position,
        starter: false,
        subbedIn: false,
        subbedOut: false,
        formationPlace: null,
      })),
    }))
    .filter((t) => t.players.length);
  return {
    match,
    events: [],
    statistics: [],
    lineups,
    highlights: {
      winnerId:
        match.state === "finished"
          ? match.home.winner
            ? match.home.id
            : match.away.id
          : null,
      penalties: false,
      home: [],
      away: [],
    },
  };
}
export async function volleyDetail(id) {
  const r = await cbvSchedule();
  const m = r.value.find((m) => String(m.ChampionshipMatch_ID) === id);
  if (!m) throw Error("Partida masculina não encontrada.");
  return {
    ...volleyDetailRow(m),
    source: "CBV · Superliga Masculina",
    fetchedAt: new Date(r.at).toISOString(),
    stale: r.stale,
  };
}
export async function volleyTeamDetails(team) {
  const r = await cbvSchedule();
  const id = team.id.replace("volleyball-superliga-men-", "");
  const rows = r.value.filter(
    (m) => String(m.HomeTeam_ID) === id || String(m.GuestTeam_ID) === id,
  );
  const matches = rows.map(normalizeVolley);
  const row = rows.find((m) =>
    [m.HomeTeamData?.id, m.GuestTeamData?.id].map(String).includes(id),
  );
  const rawTeam =
    row &&
    (String(row.HomeTeam_ID) === id ? row.HomeTeamData : row.GuestTeamData);
  return {
    team,
    athletes: volleyRoster(rawTeam),
    leaders: null,
    upcoming: matches
      .filter(
        (m) =>
          m.state === "live" ||
          (m.state === "scheduled" && Date.parse(m.date) >= Date.now()),
      )
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8),
    recent: matches
      .filter((m) => m.state === "finished")
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8),
    lineup: null,
    articles: [],
    coverage: { roster: !!rawTeam, schedule: true, news: false, next: true },
    source: "CBV · Superliga Masculina",
  };
}
