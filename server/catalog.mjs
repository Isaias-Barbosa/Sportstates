export const SPORTS = [
  {
    id: "soccer",
    name: "Futebol",
    icon: "⚽",
    leagues: [
      ["bra.1", "Brasileirão Série A"],
      ["bra.2", "Brasileirão Série B"],
      ["eng.1", "Premier League"],
      ["esp.1", "LaLiga"],
      ["ita.1", "Serie A"],
      ["ger.1", "Bundesliga"],
      ["fra.1", "Ligue 1"],
      ["uefa.champions", "Champions League"],
    ],
  },
  {
    id: "basketball",
    name: "Basquete",
    icon: "🏀",
    leagues: [
      ["nba", "NBA"],
      ["wnba", "WNBA"],
    ],
  },
  {
    id: "football",
    name: "Futebol americano",
    icon: "🏈",
    leagues: [["nfl", "NFL"]],
  },
  { id: "baseball", name: "Beisebol", icon: "⚾", leagues: [["mlb", "MLB"]] },
  { id: "hockey", name: "Hóquei", icon: "🏒", leagues: [["nhl", "NHL"]] },
];
export function leagueFor(sport, league) {
  const s = SPORTS.find((s) => s.id === sport);
  const l = s?.leagues.find((l) => l[0] === league);
  return l ? { sport: s.id, league: l[0], name: l[1] } : null;
}
