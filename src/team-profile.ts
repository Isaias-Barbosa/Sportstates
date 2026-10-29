import type { ClubProfile } from "./types";
export function profileFor(
  teams: ClubProfile[] | undefined,
  id: string,
  sport: string,
  league: string,
) {
  const key = [
    "basketball",
    "football",
    "baseball",
    "hockey",
    "volleyball",
  ].includes(sport)
    ? `${sport}-${league}-${id}`
    : id;
  return teams?.find(
    (t) =>
      t.id === key &&
      t.sport === sport &&
      (!["basketball", "football", "baseball", "hockey", "volleyball"].includes(
        sport,
      ) ||
        t.league === league),
  );
}
