import type { Match } from "../types";
import type { FavoriteTeam, Preferences } from "./AccountProvider";
export const HOME_TEAM_LIMIT = 3;

export function selectHomeTeams(
  teams: FavoriteTeam[],
  selection?: string[] | null,
) {
  if (selection == null) return teams.slice(0, HOME_TEAM_LIMIT);
  const byId = new Map(teams.map((team) => [team.id, team]));
  return [...new Set(selection)]
    .flatMap((id) => {
      const team = byId.get(id);
      return team ? [team] : [];
    })
    .slice(0, HOME_TEAM_LIMIT);
}

export function followsTeam(match: Match, teams: FavoriteTeam[]) {
  return teams.some(
    (t) =>
      t.sport === match.sport &&
      [match.home.id, match.away.id].includes(
        t.id.replace(
          /^(basketball-(?:nba|wnba)|football-nfl|baseball-mlb|hockey-nhl|volleyball-superliga-men)-/,
          "",
        ),
      ),
  );
}
export function preferredMatch(
  match: Match,
  preferences: Preferences,
  teams: FavoriteTeam[],
) {
  return (
    preferences.matches.includes(
      `${match.sport}/${match.league}/${match.id}`,
    ) ||
    followsTeam(match, teams) ||
    (preferences.sports.includes(match.sport) &&
      (!preferences.leagues?.length ||
        preferences.leagues.includes(`${match.sport}/${match.league}`))) ||
    !!preferences.leagues?.includes(`${match.sport}/${match.league}`)
  );
}
