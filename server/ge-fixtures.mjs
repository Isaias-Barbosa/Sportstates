import { dayInBrazil, validDate } from "./data.mjs";
import { geBrazilSerieARoundGamesUrl } from "./ge-rounds.mjs";

function geKickoff(game) {
  const date = game?.data_realizacao;
  if (typeof date !== "string" || !validDate(date.slice(0, 10))) return null;
  const kickoff = date.includes("T")
    ? date
    : /^\d{2}:\d{2}/.test(game.hora_realizacao || "")
      ? date + "T" + game.hora_realizacao.slice(0, 5) + ":00"
      : null;
  if (!kickoff) return null;
  const iso = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(kickoff)
    ? kickoff
    : kickoff + "-03:00";
  return Number.isFinite(Date.parse(iso)) ? iso : null;
}

export function geFixtureDay(game) {
  const kickoff = geKickoff(game);
  if (kickoff) return dayInBrazil(kickoff);
  const date = game?.data_realizacao;
  return typeof date === "string" && validDate(date) ? date : null;
}

// GE publishes structured fixtures by round. Never scrape all 38 rounds
// during a homepage request; the caller must supply a known round number.
export function normalizeGeSerieAFixtures(rows, { year, round, date } = {}) {
  if (!Array.isArray(rows))
    throw new Error("Resposta de jogos do GE inválida.");
  return rows.flatMap((game) => {
    const home = game?.equipes?.mandante;
    const away = game?.equipes?.visitante;
    const iso = geKickoff(game);
    if (!home || !away || !iso) return [];
    if (date && dayInBrazil(iso) !== date) return [];
    const score = (value) =>
      value == null || value === "" ? null : String(value);
    const homeScore = score(game.placar_oficial_mandante);
    const awayScore = score(game.placar_oficial_visitante);
    const status =
      game.transmissao?.broadcast?.id || game.status || game.situacao || "";
    const finished = /encerrad|finalizad/i.test(status);
    return [
      {
        id: `ge:${year}:${round}:${String(game.id || home.id || home.nome_popular)}:${String(away.id || away.nome_popular)}`,
        sport: "soccer",
        league: "bra.1",
        leagueName: "Brasileirão Série A",
        round: String(round),
        date: iso,
        home: {
          id: String(home.id || ""),
          name: home.nome_popular || home.nome || home.sigla || "Mandante",
          short: home.sigla || "",
          logo: home.escudo || null,
          score: homeScore,
        },
        away: {
          id: String(away.id || ""),
          name: away.nome_popular || away.nome || away.sigla || "Visitante",
          short: away.sigla || "",
          logo: away.escudo || null,
          score: awayScore,
        },
        state: finished ? "finished" : "scheduled",
        status: finished ? "Encerrado" : "Agendado",
        venue: game.sede?.nome_popular || "",
        source: "GE",
      },
    ];
  });
}

export async function fetchGeSerieARoundFixtures(year, round, date, loadJson) {
  const rows = await loadJson(geBrazilSerieARoundGamesUrl(year, round));
  return normalizeGeSerieAFixtures(rows, { year, round, date });
}
