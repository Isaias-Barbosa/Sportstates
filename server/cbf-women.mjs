/** Official CBF data for the 2026 Campeonato Brasileiro Feminino A1.
 * Only the public proxy used by cbf.com.br is consumed. The 365Scores feed
 * remains the source for monthly fixtures/detail links; this module supplies
 * the four verified phases and the official scorers ranking.
 */
import { createCache } from "./cache.mjs";
const cached = createCache();
const API = "https://www.cbf.com.br/api/cbf";
export const CBF_WOMEN_YEAR = 2026;
export const CBF_WOMEN_COMPETITION_ID = "1260614";
export const CBF_WOMEN_CHAMPIONSHIP_ID = "1016";
export const CBF_WOMEN_CATEGORY_ID = "166";
export const CBF_WOMEN_SOURCE_URL =
  "https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/feminino-a1/2026";
export const CBF_WOMEN_PHASES = [
  { id: "1994", name: "1ª Fase", type: "pontuacao" },
  { id: "2097", name: "2ª Fase · Quartas de final", type: "eliminacao" },
  { id: "2102", name: "3ª Fase · Semifinal", type: "eliminacao" },
  { id: "2113", name: "4ª Fase · Final", type: "eliminacao" },
];
const HOUR = 60 * 60_000;

async function cbfJson(url) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
  });
  if (!response.ok) throw new Error(`CBF indisponível (HTTP ${response.status}).`);
  return response.json();
}

export function cbfWomenPhase(name) {
  const value = String(name || "")
    .replace(/[ªº]/g, "a")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const ordinal = value.match(/^(\d+)\s*a\s*fase/);
  return CBF_WOMEN_PHASES[Number(ordinal?.[1]) - 1] || null;
}

export function cbfWomenDate(date, time) {
  const m = String(date || "").match(/^\s*(\d{2})\/(\d{2})\/(20\d{2})\s*$/);
  const h = String(time || "").match(/^(\d{2}):(\d{2})$/);
  if (!m || !h) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}T${h[1]}:${h[2]}:00-03:00`;
  const instant = Date.parse(iso);
  if (!Number.isFinite(instant)) return null;
  const [year, month, day] = [Number(m[3]), Number(m[2]), Number(m[1])];
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() + 1 !== month ||
    probe.getUTCDate() !== day
  )
    return null;
  return new Date(instant).toISOString();
}

export function normalizeCbfWomenGame(game, phase) {
  const date = cbfWomenDate(game?.data, game?.hora);
  const home = game?.mandante || {};
  const away = game?.visitante || {};
  if (!date || !home.nome || !away.nome) return null;
  const finished = /^\d+$/.test(String(home.gols)) && /^\d+$/.test(String(away.gols));
  const side = (team) => ({
    id: String(team.id || ""),
    name: String(team.nome),
    short: String(team.nome),
    logo: /^https:\/\/conteudo\.cbf\.com\.br\//.test(team.url_escudo || "")
      ? team.url_escudo
      : null,
    score: finished ? String(team.gols) : null,
    penalties: /^\d+$/.test(String(team.panaltis)) ? Number(team.panaltis) : null,
    winner: false,
  });
  const match = {
    id: String(game.ref_jogo || game.id_jogo || ""),
    sport: "soccer",
    league: "bra.feminino",
    leagueName: "Brasileirão Feminino A1",
    round: String(Number(game.rodada) || ""),
    seasonPhase: phase.name,
    date,
    name: `${away.nome} x ${home.nome}`,
    home: side(home),
    away: side(away),
    state: finished ? "finished" : "scheduled",
    statusName: finished ? "STATUS_FINAL" : "STATUS_SCHEDULED",
    status: finished ? "Encerrado" : "Agendado",
    clock: "",
    broadcast: String(game.transmissao || ""),
    venue: [game.estadio, game.cidade, game.uf].filter(Boolean).join(" · "),
    source: "cbf",
    sourceUrl: CBF_WOMEN_SOURCE_URL,
  };
  if (finished) {
    const hs = Number(home.gols) + (match.home.penalties || 0);
    const as = Number(away.gols) + (match.away.penalties || 0);
    if (hs !== as) {
      match.home.winner = hs > as;
      match.away.winner = as > hs;
    }
  }
  return match;
}

export const cbfWomenTable = () =>
  cached(
    `cbf-women:table:${CBF_WOMEN_YEAR}`,
    HOUR,
    () => cbfJson(`${API}/jogos/tabela-detalhada/campeonato/${CBF_WOMEN_COMPETITION_ID}`),
    6 * HOUR,
  );

export async function cbfWomenRounds() {
  const result = await cbfWomenTable();
  const rounds = [];
  for (const [name, body] of Object.entries(result.value || {})) {
    const phase = cbfWomenPhase(name);
    if (!phase || !Array.isArray(body?.jogos)) continue;
    const byRound = new Map();
    for (const game of body.jogos) {
      const match = normalizeCbfWomenGame(game, phase);
      if (!match) continue;
      const key = Number(game.rodada) || 1;
      if (!byRound.has(key)) byRound.set(key, []);
      byRound.get(key).push(match);
    }
    for (const [number, matches] of [...byRound.entries()].sort((a, b) => a[0] - b[0])) {
      matches.sort((a, b) => a.date.localeCompare(b.date));
      rounds.push({
        id: `${phase.id}-${number}`,
        phaseId: phase.id,
        name:
          phase.id === "1994"
            ? `${phase.name} · Rodada ${number}`
            : `${phase.name} · Rodada ${number}`,
        fixtures: matches.map((match) => ({
          id: match.id,
          date: match.date,
          timeConfirmed: true,
          home: { name: match.home.name, logo: match.home.logo, score: match.home.score, penalties: match.home.penalties },
          away: { name: match.away.name, logo: match.away.logo, score: match.away.score, penalties: match.away.penalties },
          state: match.state,
          statusName: match.statusName,
          clock: "",
          leg: null,
        })),
      });
    }
  }
  const current =
    rounds.find((round) => round.fixtures.some((fixture) => fixture.state === "live")) ||
    rounds.find((round) => round.fixtures.some((fixture) => fixture.state === "scheduled")) ||
    rounds.at(-1);
  return {
    value: {
      rounds,
      currentRound: current?.id || null,
      season: { year: CBF_WOMEN_YEAR, name: `${CBF_WOMEN_YEAR} · Brasileirão Feminino A1` },
      source: "CBF · tabela detalhada oficial",
    },
    at: result.at,
    stale: result.stale,
  };
}

export function normalizeCbfWomenScorers(raw, page = 1) {
  if (!Array.isArray(raw?.atletas)) throw new Error("Artilharia CBF inválida.");
  return raw.atletas
    .map((player) => ({
      id: String(player.id || ""),
      name: String(player.apelido || player.nome || "").trim(),
      fullName: String(player.nome || "").trim(),
      value: Number(player.gols),
      teamName: String(player.clube?.nome || ""),
      logo: /^https:\/\/conteudo\.cbf\.com\.br\//.test(player.clube?.url_escudo || "")
        ? player.clube.url_escudo
        : null,
      sourceUrl: `https://www.cbf.com.br/futebol-brasileiro/atletas/brasileiro-feminino/a-1/${CBF_WOMEN_YEAR}/${player.id}`,
    }))
    .filter((player) => player.id && player.name && Number.isFinite(player.value) && player.value > 0)
    .map((player, index) => ({ ...player, page, position: (page - 1) * 10 + index + 1 }));
}

export async function cbfWomenScorers(pages = 2) {
  const result = await cached(
    `cbf-women:scorers:${CBF_WOMEN_YEAR}:${pages}`,
    HOUR,
    async () => {
      const responses = await Promise.allSettled(
        Array.from({ length: pages }, (_, index) =>
          cbfJson(`${API}/artilheiros/${CBF_WOMEN_CHAMPIONSHIP_ID}/${CBF_WOMEN_CATEGORY_ID}/${CBF_WOMEN_YEAR}/${index + 1}`),
        ),
      );
      const byId = new Map();
      responses.forEach((response, index) => {
        if (response.status !== "fulfilled") return;
        for (const player of normalizeCbfWomenScorers(response.value, index + 1))
          if (!byId.has(player.id)) byId.set(player.id, player);
      });
      if (!byId.size) throw new Error("Artilharia CBF indisponível.");
      return [...byId.values()].sort((a, b) => b.value - a.value || a.position - b.position);
    },
    6 * HOUR,
  );
  return {
    ...result,
    partial: result.value.length < pages * 10,
  };
}
