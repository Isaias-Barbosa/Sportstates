import type { Detail, Match } from "../types";
export type GameAlert = {
  id: string;
  icon: string;
  title: string;
  body: string;
  url: string;
};
type MatchKey = Pick<Match, "sport" | "league" | "id">;
export function matchKey(match: MatchKey): string;
export function detectAlerts(previous: Detail, current: Detail): GameAlert[];
export function selectGame<T extends MatchKey>(
  games: T[],
  candidate: T,
  limit?: number,
): T[];
