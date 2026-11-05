const key = (name) =>
  String(name || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const numericId = (value) =>
  typeof value === "string" && /^\d{1,12}$/.test(value);

export function reviewCbfIdentities(collection, summary, rosters) {
  const match = summary.header?.competitions?.[0];
  if (
    collection.requiresReview !== true ||
    collection.identityNamespace !== "cbf" ||
    collection.league !== "bra.copa_do_brazil" ||
    summary.header?.league?.slug !== collection.league ||
    !numericId(summary.header?.id) ||
    !match?.status?.type?.completed ||
    Date.parse(collection.kickoff) !== Date.parse(match.date) ||
    match.competitors?.length !== 2
  )
    throw new Error("Identidade da partida divergente.");
  const teams = [];
  const players = [];
  const matchedIds = new Set();
  for (const [cbfTeamId, team] of Object.entries(collection.teams)) {
    const homeAway =
      team.side === "mandante"
        ? "home"
        : team.side === "visitante"
          ? "away"
          : null;
    const sides = match.competitors.filter(
      (side) => side.homeAway === homeAway,
    );
    if (
      sides.length !== 1 ||
      !numericId(sides[0].id) ||
      Number(sides[0].score) !== team.score
    )
      throw new Error("Clube ou placar divergente.");
    const side = sides[0];
    const roster = rosters.find((entry) => entry.team?.id === side.id);
    if (!roster || roster.season?.year !== 2026)
      throw new Error("Elenco de outra temporada.");
    const athletes = (roster.athletes ?? []).flatMap(
      (entry) => entry.items ?? [entry],
    );
    teams.push({
      cbfId: cbfTeamId,
      cbfName: team.name,
      espnId: side.id,
      espnName: side.team.displayName,
      requiresReview: true,
    });
    for (const player of collection.players.filter(
      (entry) => entry.cbfTeamId === cbfTeamId,
    )) {
      const exact = athletes.filter(
        (entry) =>
          numericId(entry.id) &&
          [entry.fullName, entry.displayName].some(
            (name) => key(name) === key(player.name),
          ),
      );
      const ids = [...new Set(exact.map((entry) => entry.id))];
      const espnId = ids.length === 1 ? ids[0] : null;
      const duplicate = espnId && matchedIds.has(espnId);
      if (espnId) matchedIds.add(espnId);
      players.push({
        cbfId: player.cbfId,
        name: player.name,
        cbfTeamId,
        played: player.played,
        hasCards: player.yellows > 0 || player.reds > 0,
        candidateEspnId: duplicate ? null : espnId,
        status:
          duplicate || ids.length > 1
            ? "ambiguous"
            : espnId
              ? "candidate"
              : "unmatched",
      });
    }
  }
  if (teams.length !== 2 || teams[0].espnId === teams[1].espnId)
    throw new Error("Clubes duplicados.");
  const required = players.filter((player) => player.played || player.hasCards);
  return {
    cbfMatchId: collection.cbfMatchId,
    espnEventId: summary.header.id,
    requiresReview: true,
    teams,
    players,
    requiredPlayers: required.length,
    candidates: required.filter((player) => player.status === "candidate")
      .length,
    unresolved: required.filter((player) => player.status !== "candidate")
      .length,
  };
}
