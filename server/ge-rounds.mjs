import { dayInBrazil } from "./data.mjs";

const GE_SERIE_A_TABLE =
  "https://api.globoesporte.globo.com/tabela/d1a37fa4-e948-43a6-ba53-ab24ab3a45b1";

export function geBrazilSerieARoundGamesUrl(year, round) {
  if (!Number.isInteger(round) || round < 1 || round > 38)
    throw new Error("Rodada inválida para consulta no GE.");
  return `${GE_SERIE_A_TABLE}/fase/fase-unica-campeonato-brasileiro-${year}/rodada/${round}/jogos/`;
}

function teamKeys(team = {}) {
  return [team.short, team.name, team.sigla, team.nome_popular]
    .filter((value) => typeof value === "string")
    .map((value) =>
      value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .replace(/^redbull/, "")
        .replace(/dagama$/, ""),
    )
    .filter(Boolean);
}

function sameTeam(first, second) {
  const secondKeys = new Set(teamKeys(second));
  return teamKeys(first).some((key) => secondKeys.has(key));
}

export function enrichBrazilSerieARounds(matches, rounds) {
  const fixtures = rounds.flatMap(({ round, games }) => {
    if (!Number.isInteger(round) || round < 1 || !Array.isArray(games))
      throw new Error("Resposta de rodada do GE inválida.");
    return games.map((game) => ({ ...game, round }));
  });
  return matches.map((match) => {
    if (match.round) return match;
    const matchDay = dayInBrazil(match.date);
    const fixture = fixtures.find(
      (game) =>
        typeof game?.data_realizacao === "string" &&
        game.data_realizacao.slice(0, 10) === matchDay &&
        sameTeam(match.home, game.equipes?.mandante) &&
        sameTeam(match.away, game.equipes?.visitante),
    );
    if (!fixture) return match;
    return {
      ...match,
      round: String(fixture.round),
      venue: match.venue || fixture.sede?.nome_popular || "",
    };
  });
}

export function geBrazilRoundGames(data, round) {
  if (!Number.isInteger(round) || round < 1 || !Array.isArray(data))
    throw new Error("Lista de jogos da rodada do GE inválida.");
  return { round, games: data };
}

export async function fetchGeBrazilSeasonRounds(year, fetchJson) {
  const rounds = [];
  const failures = [];
  const roundNumbers = Array.from({ length: 38 }, (_, index) => index + 1);
  for (let index = 0; index < roundNumbers.length; index += 5) {
    const batch = roundNumbers.slice(index, index + 5);
    const results = await Promise.allSettled(
      batch.map(async (round) =>
        geBrazilRoundGames(
          await fetchJson(geBrazilSerieARoundGamesUrl(year, round)),
          round,
        ),
      ),
    );
    results.forEach((result, batchIndex) => {
      if (result.status === "fulfilled") {
        rounds.push(result.value);
      } else {
        const round = batch[batchIndex];
        const message =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
        console.error(`GE Brasileirão round ${round} unavailable:`, message);
        failures.push({ round, message });
      }
    });
  }
  return { rounds, failures };
}
