import type { Match } from "./types";
export const sports = [
  { id: "soccer", name: "Futebol", icon: "⚽" },
  { id: "basketball", name: "Basquete", icon: "🏀" },
  { id: "football", name: "Futebol americano", icon: "🏈" },
  { id: "baseball", name: "Beisebol", icon: "⚾" },
  { id: "hockey", name: "Hóquei", icon: "🏒" },
  { id: "tennis", name: "Tênis", icon: "🎾" },
  { id: "table-tennis", name: "Tênis de mesa", icon: "🏓" },
  { id: "volleyball", name: "Vôlei", icon: "🏐" },
];
// Keep in sync with WOMEN_LEAGUES in server/catalog.mjs. Used to filter the
// scoreboard and catalogs before the /api/competitions response arrives.
export const womenLeagueIds = new Set([
  "bra.feminino",
  "bra.feminino.paulista",
  "bra.feminino.copa_rio",
  "bra.feminino.copa_do_brazil",
  "eng.w.1",
  "eng.w.fa",
  "eng.w.league_cup",
  "esp.w.1",
  "esp.copa_de_la_reina",
  "fra.w.1",
  "usa.nwsl",
  "conmebol.libertadores_feminina",
  "uefa.wchampions",
  "wnba",
  "superliga-women",
  "wta",
  "grand-smash-women",
  "champions-women",
  "star-contender-women",
  "contender-women",
  "feeder-women",
  "finals-women",
  "world-championships-women",
  "world-cup-women",
]);
export const isWomenLeague = (league: string) => womenLeagueIds.has(league);
export const keyOf = (m: Match) => `${m.sport}/${m.league}/${m.id}`;
