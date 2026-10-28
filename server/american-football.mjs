const CATEGORIES = {
  passing: "Passes",
  rushing: "Corridas",
  receiving: "Recepções",
  fumbles: "Fumbles",
  defensive: "Defesa",
  interceptions: "Interceptações",
  kickReturns: "Retornos de kickoff",
  puntReturns: "Retornos de punt",
  kicking: "Chutes",
  punting: "Punts",
};
const METRICS = {
  "completions/passingAttempts": ["C/T", "Passes completos/tentados"],
  passingYards: ["JDS", "Jardas de passe"],
  yardsPerPassAttempt: ["MÉD", "Jardas por tentativa"],
  passingTouchdowns: ["TD", "Touchdowns de passe"],
  interceptions: ["INT", "Interceptações"],
  "sacks-sackYardsLost": ["SACK/JDS", "Sacks e jardas perdidas"],
  adjQBR: ["QBR", "QBR ajustado"],
  QBRating: ["RATING", "Passer rating"],
  rushingAttempts: ["TENT", "Tentativas de corrida"],
  rushingYards: ["JDS", "Jardas de corrida"],
  yardsPerRushAttempt: ["MÉD", "Jardas por corrida"],
  rushingTouchdowns: ["TD", "Touchdowns de corrida"],
  longRushing: ["LONG", "Corrida mais longa"],
  receptions: ["REC", "Recepções"],
  receivingYards: ["JDS", "Jardas de recepção"],
  yardsPerReception: ["MÉD", "Jardas por recepção"],
  receivingTouchdowns: ["TD", "Touchdowns de recepção"],
  longReception: ["LONG", "Recepção mais longa"],
  receivingTargets: ["ALVOS", "Passes direcionados"],
  fumbles: ["FUM", "Fumbles"],
  fumblesLost: ["PERD", "Fumbles perdidos"],
  fumblesRecovered: ["RECUP", "Fumbles recuperados"],
  totalTackles: ["TACK", "Tackles totais"],
  soloTackles: ["SOLO", "Tackles individuais"],
  sacks: ["SACK", "Sacks"],
  tacklesForLoss: ["TFL", "Tackles com perda de jardas"],
  passesDefended: ["PD", "Passes defendidos"],
  QBHits: ["QB HIT", "Contatos no quarterback"],
  defensiveTouchdowns: ["TD", "Touchdowns defensivos"],
  interceptionYards: ["JDS", "Jardas após interceptação"],
  interceptionTouchdowns: ["TD", "Touchdowns em interceptações"],
  "fieldGoalsMade/fieldGoalAttempts": [
    "FG C/T",
    "Field goals convertidos/tentados",
  ],
  fieldGoalPct: ["FG%", "Aproveitamento de field goals (%)"],
  longFieldGoalMade: ["LONG", "Field goal mais longo"],
  "extraPointsMade/extraPointAttempts": [
    "XP C/T",
    "Pontos extras convertidos/tentados",
  ],
  totalKickingPoints: ["PTS", "Pontos em chutes"],
  punts: ["PUNTS", "Punts"],
  puntYards: ["JDS", "Jardas de punt"],
  grossAvgPuntYards: ["MÉD", "Média de jardas de punt"],
  touchbacks: ["TB", "Touchbacks"],
  puntsInside20: ["D20", "Punts dentro da linha de 20"],
  longPunt: ["LONG", "Punt mais longo"],
  kickReturns: ["RET", "Retornos de kickoff"],
  kickReturnYards: ["JDS", "Jardas de retorno de kickoff"],
  yardsPerKickReturn: ["MÉD", "Média de retorno de kickoff"],
  longKickReturn: ["LONG", "Retorno de kickoff mais longo"],
  kickReturnTouchdowns: ["TD", "Touchdowns em retornos de kickoff"],
  puntReturns: ["RET", "Retornos de punt"],
  puntReturnYards: ["JDS", "Jardas de retorno de punt"],
  yardsPerPuntReturn: ["MÉD", "Média de retorno de punt"],
  longPuntReturn: ["LONG", "Retorno de punt mais longo"],
  puntReturnTouchdowns: ["TD", "Touchdowns em retornos de punt"],
};
const TEAM_METRICS = {
  firstDowns: "Primeiras descidas",
  firstDownsPassing: "Primeiras descidas por passe",
  firstDownsRushing: "Primeiras descidas por corrida",
  firstDownsPenalty: "Primeiras descidas por penalidade",
  thirdDownEff: "Conversões de terceira descida",
  fourthDownEff: "Conversões de quarta descida",
  totalOffensivePlays: "Jogadas ofensivas",
  totalYards: "Jardas totais",
  yardsPerPlay: "Jardas por jogada",
  totalDrives: "Campanhas ofensivas",
  netPassingYards: "Jardas líquidas de passe",
  completionAttempts: "Passes completos/tentados",
  yardsPerPass: "Jardas por passe",
  sacksYardsLost: "Sacks / jardas perdidas",
  redZoneAttempts: "Conversões na red zone",
  totalPenaltiesYards: "Penalidades / jardas",
  turnovers: "Perdas de posse",
  possessionTime: "Tempo de posse",
};
export const footballStatName = (name, fallback) =>
  TEAM_METRICS[name] || METRICS[name]?.[1] || fallback || name;
const scalar = (v) => (v == null || typeof v === "object" ? null : String(v));
const image = (v) => {
  try {
    const u = new URL(v);
    return u.protocol === "https:" && /(^|\.)espncdn\.com$/.test(u.hostname)
      ? u.href
      : null;
  } catch {
    return null;
  }
};
const list = (v) => (Array.isArray(v) ? v : []);
export function footballPlays(raw) {
  const drives = [
    ...list(raw.drives?.previous),
    ...(raw.drives?.current ? [raw.drives.current] : []),
  ];
  return [
    ...new Map(
      [...list(raw.plays), ...drives.flatMap((d) => list(d.plays))]
        .filter((p) => p.id)
        .map((p) => [String(p.id), p]),
    ).values(),
  ];
}
export function footballPlayLabel(play) {
  const type = String(
    play.scoringType?.name || play.type?.text || "",
  ).toLowerCase();
  if (/touchdown/.test(type)) return "Touchdown";
  if (/field.?goal/.test(type))
    return /miss|no good|blocked/.test(type)
      ? "Field goal não convertido"
      : "Field goal";
  if (/safety/.test(type)) return "Safety";
  if (/two.?point|two point/.test(type)) return "Conversão de dois pontos";
  if (/extra.?point/.test(type)) return "Ponto extra";
  return (
    {
      "pass reception": "Passe completo",
      "pass incompletion": "Passe incompleto",
      rush: "Corrida",
      sack: "Sack",
      "interception return": "Interceptação",
      punt: "Punt",
      kickoff: "Kickoff",
      timeout: "Tempo pedido",
      "end period": "Fim do período",
      "end of half": "Fim do primeiro tempo",
      "end game": "Fim do jogo",
      penalty: "Penalidade",
      "fumble recovery (opponent)": "Fumble recuperado pelo adversário",
    }[type] ||
    play.type?.text ||
    "Jogada"
  );
}
export function normalizeAmericanFootball(raw, match) {
  const competitors = list(raw.header?.competitions?.[0]?.competitors);
  const count = Math.min(
    16,
    Math.max(
      4,
      Number(match.period) || 0,
      ...competitors.map((c) => list(c.linescores).length),
    ),
  );
  const periods = Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    label: i < 4 ? `${i + 1}º Q` : `PR${i - 3}`,
  }));
  const scores = [match.home, match.away].map((t) => ({
    ...t,
    periods: periods.map((_, i) => {
      const c = competitors.find((c) => String(c.team?.id || c.id) === t.id);
      return scalar(
        c?.linescores?.[i]?.displayValue ?? c?.linescores?.[i]?.value,
      );
    }),
  }));
  const teams = list(raw.boxscore?.players)
    .filter((t) => scores.some((s) => s.id === String(t.team?.id)))
    .map((t) => ({
      id: String(t.team.id),
      name: t.team.displayName || "",
      logo: image(t.team.logo),
      categories: list(t.statistics)
        .filter((b) => b.name)
        .map((b) => {
          const keys = list(b.keys).length ? b.keys : list(b.labels);
          const columns = keys.map((key, i) => ({
            key,
            label: METRICS[key]?.[0] || b.labels?.[i] || key,
            description: METRICS[key]?.[1] || b.descriptions?.[i] || key,
          }));
          const players = [
            ...new Map(
              list(b.athletes)
                .filter((p) => p.athlete?.id && p.athlete.displayName)
                .map((p) => [
                  String(p.athlete.id),
                  {
                    id: String(p.athlete.id),
                    name: p.athlete.displayName,
                    number: p.athlete.jersey || "",
                    position: p.athlete.position?.abbreviation || "",
                    image: image(p.athlete.headshot?.href),
                    didNotPlay: !!p.didNotPlay,
                    stats: Object.fromEntries(
                      keys.map((key, i) => [key, scalar(p.stats?.[i])]),
                    ),
                  },
                ]),
            ).values(),
          ];
          return {
            id: b.name,
            name: CATEGORIES[b.name] || b.text || b.name,
            columns,
            players,
            totals: Object.fromEntries(
              keys.map((key, i) => [key, scalar(b.totals?.[i])]),
            ),
          };
        }),
    }));
  const leaders = [
    ["passing", "passingYards", "Jardas de passe"],
    ["rushing", "rushingYards", "Jardas de corrida"],
    ["receiving", "receivingYards", "Jardas de recepção"],
  ].map(([category, key, label]) => ({
    key,
    label,
    teams: teams.map((t) => {
      const players =
        t.categories
          .find((c) => c.id === category)
          ?.players.filter(
            (p) =>
              !p.didNotPlay &&
              p.stats[key] != null &&
              p.stats[key] !== "" &&
              Number.isFinite(Number(p.stats[key])),
          ) || [];
      const value = players.length
        ? Math.max(...players.map((p) => Number(p.stats[key])))
        : null;
      return {
        id: t.id,
        name: t.name,
        value,
        players:
          value === null
            ? []
            : players
                .filter((p) => Number(p.stats[key]) === value)
                .map((p) => ({ id: p.id, name: p.name, image: p.image })),
      };
    }),
  }));
  const allPlays = footballPlays(raw);
  const scoringSource = list(raw.scoringPlays).length
    ? raw.scoringPlays
    : allPlays.filter((p) => p.scoringPlay);
  const scoring = [
    ...new Map(
      scoringSource
        .filter((p) => p.id)
        .map((p, i) => [
          String(p.id),
          {
            id: String(p.id),
            teamId: String(p.team?.id || ""),
            label: footballPlayLabel(p),
            text: p.text || p.shortText || "",
            period: Number(p.period?.number) || null,
            clock: p.clock?.displayValue || "",
            homeScore: scalar(p.homeScore),
            awayScore: scalar(p.awayScore),
            order: i,
          },
        ]),
    ).values(),
  ];
  const rawDrives = [
    ...list(raw.drives?.previous),
    ...(raw.drives?.current ? [raw.drives.current] : []),
  ];
  const drives = [
    ...new Map(
      rawDrives
        .filter((d) => d.id && scores.some((s) => s.id === String(d.team?.id)))
        .map((d) => [
          String(d.id),
          {
            id: String(d.id),
            teamId: String(d.team.id),
            team: d.team.displayName || d.team.abbreviation || "",
            result:
              {
                TD: "Touchdown",
                FG: "Field goal",
                PUNT: "Punt",
                INT: "Interceptação",
                FUMBLE: "Fumble",
                DOWNS: "Perda por descidas",
                END_OF_HALF: "Fim do primeiro tempo",
                "END OF HALF": "Fim do primeiro tempo",
                "END OF GAME": "Fim do jogo",
                "FIM DE JOGO": "Fim do jogo",
                "MISSED FG": "Field goal não convertido",
                "MISSED FIELD GOAL": "Field goal não convertido",
                END_OF_GAME: "Fim do jogo",
                SF: "Safety",
              }[d.result] ||
              d.displayResult ||
              d.result ||
              "Em andamento",
            plays: d.offensivePlays ?? null,
            yards: d.yards ?? null,
            time: d.timeElapsed?.displayValue || "",
            period: Number(d.start?.period?.number) || null,
            clock: d.start?.clock?.displayValue || "",
            current: match.state === "live" && d.id === raw.drives?.current?.id,
          },
        ]),
    ).values(),
  ];
  const situationRaw =
    raw.situation || raw.header?.competitions?.[0]?.situation;
  const situation =
    match.state === "live" && situationRaw
      ? {
          possession: String(situationRaw.possession || ""),
          downDistance:
            situationRaw.shortDownDistanceText ||
            situationRaw.downDistanceText ||
            "",
          field: situationRaw.possessionText || "",
          redZone: !!situationRaw.isRedZone,
        }
      : null;
  return { periods, scores, teams, leaders, scoring, drives, situation };
}
