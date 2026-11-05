import wikiC from "../data/wikipedia-serie-c-statistics-2026.json" with { type: "json" };
import wikiD from "../data/wikipedia-serie-d-statistics-2026.json" with { type: "json" };
import seasonC from "../data/cbf-serie-c-2026.json" with { type: "json" };
import seasonD from "../data/cbf-serie-d-2026.json" with { type: "json" };

const backups = new Map([
  ["bra.3", wikiC],
  ["bra.4", wikiD],
]);
const seasons = new Map([
  ["bra.3", seasonC],
  ["bra.4", seasonD],
]);
const keys = [
  "points",
  "gamesPlayed",
  "wins",
  "ties",
  "losses",
  "goalsFor",
  "goalsAgainst",
  "goalDifference",
];

export function validLowerStatistics(data, league, section) {
  const season = seasons.get(league);
  if (
    !season ||
    data?.league !== league ||
    data.season !== 2026 ||
    !Number.isFinite(Date.parse(data.collectedAt))
  )
    return false;
  const ids = new Set(season.clubs.map((club) => club.id));
  if (section === "scorers")
    return (
      Array.isArray(data.scorers) &&
      data.scorers.length > 0 &&
      data.scorers.every(
        (player, index) =>
          player &&
          typeof player.id === "string" &&
          typeof player.name === 'string' && player.name.trim() &&
          ids.has(player.teamId) &&
          Number.isInteger(player.value) &&
          player.value > 0 &&
          (!index || data.scorers[index - 1].value >= player.value),
      ) &&
      new Set(data.scorers.map((player) => player.id)).size ===
        data.scorers.length
    );
  const expected = league === "bra.3" ? [20, 4, 4] : Array(16).fill(6);
  return (
    Array.isArray(data.groups) &&
    data.groups.length === expected.length &&
    data.groups.every(
      (group, index) =>
        group &&
        Array.isArray(group.rows) &&
        group.rows.length === expected[index] &&
        group.phaseId ===
          (league === "bra.4" ? "2040" : index ? "2098" : "2013") &&
        new Set(group.rows.map((row) => row?.id)).size === group.rows.length &&
        group.rows.every(
          (row, position) =>
            row &&
            ids.has(row.id) &&
            Number(row.rank) === position + 1 &&
            keys.every((key) => /^-?\d+$/.test(row.stats?.[key])) &&
            Number(row.stats.gamesPlayed) ===
              Number(row.stats.wins) +
                Number(row.stats.ties) +
                Number(row.stats.losses) &&
            Number(row.stats.goalDifference) ===
              Number(row.stats.goalsFor) - Number(row.stats.goalsAgainst),
        ),
    ) &&
    [...new Set(data.groups.map(group=>group.phaseId))].every(phase=>{
      const members=data.groups.filter(group=>group.phaseId===phase).flatMap(group=>group.rows.map(row=>row.id));
      return new Set(members).size===members.length;
    })
  );
}

export function selectLowerStatistics(
  league,
  section,
  primary,
  backup = backups.get(league),
) {
  if (validLowerStatistics(primary, league, section))
    return {
      data: primary,
      fallback: false,
      provider: primary.provider || "CBF",
    };
  if (validLowerStatistics(backup, league, section))
    return { data: backup, fallback: true, provider: "Wikipédia" };
  throw new Error(
    "Nenhuma classificação alternativa validada para esta edição.",
  );
}

export function archivedLowerRounds(league, data) {
  const known = new Set(seasons.get(league)?.matches.map((match) => match.id));
  if (!Array.isArray(data?.rounds)) return [];
  const seen = new Set();
  for (const round of data.rounds) {
    if (!round?.id || !round.name || !Array.isArray(round.matches)) return [];
    for (const game of round.matches) {
      if (
        !game || !known.has(game.id) ||
        seen.has(game.id) ||
        !["Ida", "Volta"].includes(game.leg)
      )
        return [];
      seen.add(game.id);
    }
  }
  return data.rounds;
}
