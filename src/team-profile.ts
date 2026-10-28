import type { ClubProfile } from "./types";
export function profileFor(
  teams: ClubProfile[] | undefined,
  id: string,
  sport: string,
  league: string,
) {
  const key = sport === "basketball" ? `basketball-${league}-${id}` : id;
  return teams?.find(
    (t) =>
      t.id === key &&
      t.sport === sport &&
      (sport !== "basketball" || t.league === league),
  );
}
