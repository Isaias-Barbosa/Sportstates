import { dayInBrazil } from "./data.mjs";
import { geBrazilSerieARoundGamesUrl } from "./ge-rounds.mjs";

// GE publishes structured fixtures by round. Never scrape all 38 rounds
// during a homepage request; the caller must supply a known round number.
export function normalizeGeSerieAFixtures(rows, { year, round, date } = {}) {
  if (!Array.isArray(rows)) throw new Error("Resposta de jogos do GE inválida.");
  return rows.flatMap((game) => {
    const home = game?.equipes?.mandante;
    const away = game?.equipes?.visitante;
    const rawDate = game?.data_realizacao;
    if (!home || !away || typeof rawDate !== "string") return [];
    // GE dates can be date-only or local timestamps; don't fabricate a kickoff
    // time when the source doesn't provide one.
    const time = game?.hora_realizacao;
    const iso = /T/.test(rawDate) || /Z$/.test(rawDate)
      ? rawDate
      : /^\d{2}:\d{2}/.test(String(time || ""))
        ? `${rawDate.slice(0, 10)}T${String(time).slice(0, 5)}:00-03:00`
        : null;
    if (!iso || !Number.isFinite(Date.parse(iso))) return [];
    if (date && dayInBrazil(iso) !== date) return [];
    const score = (value) => value == null || value === "" ? null : String(value);
    const homeScore = score(game.placar_oficial_mandante);
    const awayScore = score(game.placar_oficial_visitante);
    const finished = /encerrad|finalizad/i.test(String(game.status || game.situacao || ""));
    return [{
      id: `ge:${year}:${round}:${String(game.id || home.id || home.nome_popular)}:${String(away.id || away.nome_popular)}`,
      sport: "soccer", league: "bra.1", leagueName: "Brasileirão Série A",
      round: String(round), date: iso,
      home: { id: String(home.id || ""), name: home.nome_popular || home.nome || home.sigla || "Mandante", short: home.sigla || "", logo: home.escudo || null, score: homeScore },
      away: { id: String(away.id || ""), name: away.nome_popular || away.nome || away.sigla || "Visitante", short: away.sigla || "", logo: away.escudo || null, score: awayScore },
      state: finished ? "finished" : "scheduled",
      status: finished ? "Encerrado" : "Agendado",
      venue: game.sede?.nome_popular || "",
      source: "GE",
    }];
  });
}

export async function fetchGeSerieARoundFixtures(year, round, date, loadJson) {
  const rows = await loadJson(geBrazilSerieARoundGamesUrl(year, round));
  return normalizeGeSerieAFixtures(rows, { year, round, date });
}
