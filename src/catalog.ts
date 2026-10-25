import type { Match } from "./types";
export const sports = [
  { id: "soccer", name: "Futebol", icon: "⚽" },
  { id: "basketball", name: "Basquete", icon: "🏀" },
  { id: "football", name: "Futebol americano", icon: "🏈" },
  { id: "baseball", name: "Beisebol", icon: "⚾" },
  { id: "hockey", name: "Hóquei", icon: "🏒" },
];
export const keyOf = (m: Match) => `${m.sport}/${m.league}/${m.id}`;
