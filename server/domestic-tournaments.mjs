import { SOCCER_DOMESTIC_TOURNAMENTS } from "./catalog.mjs";
import {
  ECUADOR_CUPS,
  ecuadorCupHasStarted,
} from "./ecuador-cups.mjs";
import {
  SOCCER_365_COMPETITIONS,
  fetch365CompetitionGames,
  normalize365Game,
} from "./365scores.mjs";
import { leagueFor } from "./catalog.mjs";

export async function startedDomesticTournaments(year, now, loadJson) {
  const results = await Promise.all(
    SOCCER_DOMESTIC_TOURNAMENTS.map(async (league) => {
      try {
        const started = ECUADOR_CUPS[league]
          ? await ecuadorCupHasStarted(league, loadJson, now)
          : SOCCER_365_COMPETITIONS[league]
            ? await fetch365CompetitionGames(league, loadJson).then(
                ({ games }) => {
                  const name = leagueFor("soccer", league)?.name || league;
                  return games.some((game) => {
                    if (Date.parse(game.startTime) > now.getTime()) return false;
                    const match = normalize365Game(
                      game,
                      league,
                      name,
                      now.getTime(),
                    );
                    return !!match && match.state !== "scheduled";
                  });
                },
              )
          : await loadJson(
              `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${year}&limit=1000&lang=pt&region=br`,
            ).then((feed) =>
              (feed.events || []).some((event) => {
                const date = Date.parse(event.date);
                const state = event.status?.type?.state;
                return (
                  Number.isFinite(date) &&
                  date <= now.getTime() &&
                  ["in", "post"].includes(state)
                );
              }),
            );
        return { league, started, unavailable: false };
      } catch {
        return { league, started: false, unavailable: true };
      }
    }),
  );
  return {
    started: results.filter((result) => result.started).map((r) => r.league),
    unavailable: results
      .filter((result) => result.unavailable)
      .map((r) => r.league),
  };
}
