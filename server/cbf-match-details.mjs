import { createCache } from "./cache.mjs";

const ID = /^\d{1,12}$/;
const COMPETITIONS = { "bra.3": "1260613", "bra.4": "1260635" };
const MAX_BYTES = 2 * 1024 * 1024;
const fail = () => {
  throw new Error("Detalhes oficiais da CBF não passaram pela validação.");
};
const cleanName = (value) =>
  String(value || "")
    .replace(/^\d+\s*-\s*/, "")
    .trim();

// Decode JSON text inside Next's data stream; never evaluate site scripts.
export function extractCbfGame(html) {
  if (typeof html !== "string" || Buffer.byteLength(html) > MAX_BYTES)
    return fail();
  const games = [];
  for (const match of html.matchAll(
    /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g,
  )) {
    const payload = JSON.parse(match[1]);
    const marker = '"jogo":{"id_jogo"';
    const start = payload.indexOf(marker);
    if (start < 0) continue;
    const text = payload.slice(start + '"jogo":'.length);
    let depth = 0,
      quoted = false,
      escaped = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') quoted = false;
      } else if (ch === '"') quoted = true;
      else if (ch === "{") depth++;
      else if (ch === "}" && --depth === 0) {
        games.push(JSON.parse(text.slice(0, i + 1)));
        break;
      }
    }
  }
  if (games.length !== 1) return fail();
  return games[0];
}

export function cbfMinute(period, raw) {
  const value = String(raw || "");
  const base = { 1: 0, AC1: 0, 2: 45, AC2: 45 }[period];
  if (base === undefined) return { minute: "—", order: Infinity };
  const extra = /^(\d{1,2}):\d{2}(\d{1,2}):\d{2}$/.exec(value);
  const normal = /^(\d{1,2}):\d{2}$/.exec(value);
  if (extra)
    return {
      minute: `${base + Number(extra[1])}+${Number(extra[2])}`,
      order: base + Number(extra[1]) + Number(extra[2]) / 100,
    };
  if (normal)
    return {
      minute: String(base + Number(normal[1])),
      order: base + Number(normal[1]),
    };
  return { minute: "—", order: Infinity };
}

export function normalizeCbfGame(game, fixture, teamIds) {
  if (
    game?.id_jogo !== fixture.id ||
    game.ano !== "2026" ||
    game.campeonato?.id !== COMPETITIONS[fixture.league] ||
    !Array.isArray(game.registros) ||
    game.registros.length > 150
  )
    return fail();
  const reports = (game.documentos || []).filter(
    (doc) =>
      doc.title === "Súmula" &&
      /^https:\/\/conteudo\.cbf\.com\.br\/sumulas\/2026\/\d+se\.pdf$/.test(
        doc.url,
      ),
  );
  if (reports.length !== 1 || reports[0].url !== fixture.reportUrl)
    return fail();
  // Amendments can correct scorer identities without changing the score.
  // Keep the calendar result until the amendment has been reviewed.
  if ((game.documentos || []).some((doc) => doc.title === "Adendo do Jogo"))
    return fail();
  const sourceDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(
    String(game.data).trim(),
  );
  if (
    !sourceDate ||
    `${sourceDate[3]}-${sourceDate[2]}-${sourceDate[1]}T${game.hora}` !==
      fixture.date.slice(0, 16)
  )
    return fail();
  const players = new Map(),
    squads = [],
    teamStats = new Map(),
    goalTotals = new Map();
  for (const [role, side] of [
    ["mandante", "home"],
    ["visitante", "away"],
  ]) {
    const team = game[role],
      id = teamIds.get(team?.id);
    if (
      id !== fixture[side].id ||
      String(team.gols) !== String(fixture[side].score) ||
      !Array.isArray(team.atletas) ||
      team.atletas.length > 40 ||
      !Array.isArray(team.alteracoes)
    )
      return fail();
    const squad = [];
    for (const player of team.atletas) {
      if (
        !ID.test(player.id) ||
        players.has(player.id) ||
        !cleanName(player.nome) ||
        !["true", "false"].includes(player.entrou_jogando)
      )
        return fail();
      const entry = {
        id: "cbf-" + player.id,
        name: cleanName(player.nome),
        shortName: cleanName(player.apelido) || cleanName(player.nome),
        positionName: player.goleiro === "true" ? "Goleiro" : "",
        position: player.goleiro === "true" ? "G" : "",
        formationPlace: null,
        starter: player.entrou_jogando === "true",
        jersey: player.numero_camisa || "",
        subbedIn: false,
        subbedOut: false,
        substitutions: [],
      };
      players.set(player.id, { entry, teamId: id });
      squad.push(entry);
    }
    if (squad.filter((p) => p.starter).length !== 11) return fail();
    const changedIn = new Set(),
      changedOut = new Set();
    for (const change of team.alteracoes) {
      const incoming = players.get(change.codigo_jogador_entrou),
        outgoing = players.get(change.codigo_jogador_saiu);
      if (
        !incoming ||
        !outgoing ||
        incoming.teamId !== id ||
        outgoing.teamId !== id ||
        incoming.entry.starter ||
        changedIn.has(incoming.entry.id) ||
        changedOut.has(outgoing.entry.id)
      )
        return fail();
      changedIn.add(incoming.entry.id);
      changedOut.add(outgoing.entry.id);
      incoming.entry.subbedIn = true;
      outgoing.entry.subbedOut = true;
      const period = /2/.test(change.tempo_subs || "")
        ? "2"
        : /1/.test(change.tempo_subs || "")
          ? "1"
          : "";
      const { minute } = cbfMinute(period, change.tempo_jogo);
      incoming.entry.substitutions.push({
        direction: "in",
        minute,
        counterpart: outgoing.entry.shortName,
        counterpartId: outgoing.entry.id,
      });
      outgoing.entry.substitutions.push({
        direction: "out",
        minute,
        counterpart: incoming.entry.shortName,
        counterpartId: incoming.entry.id,
      });
    }
    goalTotals.set(id, 0);
    teamStats.set(id, { goals: Number(team.gols), yellow: 0, red: 0 });
    squads.push({
      team: fixture[side].name || team.nome,
      homeAway: side,
      formation: "",
      players: squad,
    });
  }
  const seen = new Set(),
    events = [],
    warnings = [];
  for (const event of game.registros) {
    const teamId = teamIds.get(event.clube_id),
      player = players.get(event.atleta_id);
    if (
      !ID.test(event.id) ||
      seen.has(event.id) ||
      !teamStats.has(teamId) ||
      (player && player.teamId !== teamId)
    )
      return fail();
    seen.add(event.id);
    let kind,
      scoring = false;
    if (event.tipo === "GOL") {
      if (
        !["NR", "PN"].includes(event.resultado) ||
        !player ||
        !(player.entry.starter || player.entry.subbedIn)
      )
        return fail();
      kind = "goal";
      scoring = true;
      goalTotals.set(teamId, goalTotals.get(teamId) + 1);
    } else if (event.tipo === "PENALIDADE") {
      kind = {
        AMARELO: "yellow-card",
        VERMELHO: "red-card",
        VERMELHO2AMARELO: "second-yellow",
      }[event.resultado];
      if (!kind) return fail();
      // Technical staff are not player card statistics.
      if (!player) {
        warnings.push(
          "Há cartões para integrantes fora da escalação; não entram nos totais de atletas.",
        );
        continue;
      }
      teamStats.get(teamId)[kind === "yellow-card" ? "yellow" : "red"]++;
    } else return fail();
    const { minute, order } = cbfMinute(event.tempo_jogo, event.minutos);
    events.push({
      id: "cbf-" + event.id,
      minute,
      period: String(event.tempo_jogo),
      type: event.tipo,
      kind,
      scoring,
      text: `${scoring ? (event.resultado === "PN" ? "Gol de pênalti" : "Gol") : kind === "yellow-card" ? "Cartão amarelo" : kind === "second-yellow" ? "Expulsão por segundo amarelo" : "Cartão vermelho"} · ${cleanName(event.atleta_apelido) || player.entry.name}`,
      teamId,
      scorerTeamId: scoring ? teamId : undefined,
      scorer: scoring ? player.entry.name : undefined,
      _order: order,
    });
  }
  if (
    ["home", "away"].some(
      (side) =>
        goalTotals.get(fixture[side].id) !== Number(fixture[side].score),
    )
  )
    return fail();
  warnings.push(
    "Dados publicados pela CBF. Assistências, posse de bola e finalizações não são informadas nesta fonte.",
  );
  const leaders = new Map();
  for (const event of events.filter((event) => event.scoring)) {
    const key = `${event.teamId}:${event.scorer}`;
    const leader = leaders.get(key) || {
      name: event.scorer,
      team: squads[event.teamId === fixture.home.id ? 0 : 1].team,
      goals: 0,
    };
    leader.goals++;
    leaders.set(key, leader);
  }
  return {
    leaders: [...leaders.values()],
    events: events
      .sort((a, b) => a._order - b._order)
      .map(({ _order, ...event }) => event),
    lineups: squads,
    statistics: ["home", "away"].map((side, i) => ({
      team: squads[i].team,
      stats: [
        { name: "Gols", value: String(teamStats.get(fixture[side].id).goals) },
        {
          name: "Cartões amarelos (atletas)",
          value: String(teamStats.get(fixture[side].id).yellow),
        },
        {
          name: "Cartões vermelhos (atletas)",
          value: String(teamStats.get(fixture[side].id).red),
        },
      ],
    })),
    warnings: [...new Set(warnings)],
    reportUrl: reports[0].url,
  };
}

async function loadHtml(url) {
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(7000),
    headers: { Accept: "text/html" },
  });
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("text/html") ||
    Number(response.headers.get("content-length")) > MAX_BYTES
  )
    return fail();
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) return fail();
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function createCbfMatchLoader({
  load = loadHtml,
  now = Date.now,
  cache = createCache({ max: 128, shared: false, now }),
} = {}) {
  let active = 0,
    failures = 0,
    retryAt = 0,
    windowAt = 0,
    requests = 0;
  return async (fixture, teamIds) =>
    cache(
      `cbf:match:v1:${fixture.league}:${fixture.id}`,
      6 * 60 * 60_000,
      async () => {
        const url = new URL(fixture.sourceUrl);
        if (
          !COMPETITIONS[fixture.league] ||
          !ID.test(fixture.id) ||
          url.origin !== "https://www.cbf.com.br" ||
          url.pathname !==
            `/futebol-brasileiro/jogos/campeonato-brasileiro/serie-${fixture.league === "bra.3" ? "c" : "d"}/2026/a-x-b/${fixture.id}` ||
          url.search ||
          url.hash
        )
          return fail();
        if (now() - windowAt >= 60_000) {
          requests = 0;
          windowAt = now();
        }
        if (now() < retryAt || active >= 2 || requests >= 8)
          throw new Error("Consulta oficial temporariamente limitada.");
        active++;
        requests++;
        try {
          const value = normalizeCbfGame(
            extractCbfGame(await load(url.href)),
            fixture,
            teamIds,
          );
          failures = 0;
          return value;
        } catch (error) {
          if (++failures >= 3) {
            retryAt = now() + 5 * 60_000;
            failures = 0;
          }
          throw error;
        } finally {
          active--;
        }
      },
      30 * 24 * 60 * 60_000,
    );
}
