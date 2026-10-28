export const SPORTS = [
  {
    id: "soccer",
    name: "Futebol",
    icon: "⚽",
    leagues: [
      ["bra.1", "Brasileirão Série A"],
      ["bra.2", "Brasileirão Série B"],
      ["bra.copa_do_brazil", "Copa do Brasil"],
      ["bra.camp.carioca", "Campeonato Carioca"],
      ["bra.camp.paulista", "Campeonato Paulista"],
      ["bra.camp.gaucho", "Campeonato Gaúcho"],
      ["bra.camp.mineiro", "Campeonato Mineiro"],
      ["conmebol.libertadores", "Copa Libertadores"],
      ["conmebol.sudamericana", "Copa Sul-Americana"],
      ["eng.1", "Premier League"],
      ["eng.fa", "Copa da Inglaterra"],
      ["eng.league_cup", "Carabao Cup"],
      ["esp.1", "LaLiga"],
      ["esp.copa_del_rey", "Copa do Rei"],
      ["ita.1", "Serie A"],
      ["ita.coppa_italia", "Copa da Itália"],
      ["ger.1", "Bundesliga"],
      ["ger.dfb_pokal", "Copa da Alemanha"],
      ["fra.1", "Ligue 1"],
      ["fra.coupe_de_france", "Copa da França"],
      ["usa.1", "MLS"],
      ["usa.open", "US Open Cup"],
      ["concacaf.leagues.cup", "Leagues Cup"],
      ["concacaf.champions", "Copa dos Campeões da Concacaf"],
      ["ksa.1", "Liga Saudita"],
      ["ksa.kings.cup", "Copa do Rei Saudita"],
      ["afc.champions", "Liga dos Campeões da Ásia"],
      ["uefa.champions", "Champions League"],
      ["uefa.europa", "Europa League"],
      ["uefa.europa.conf", "Conference League"],
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

// Local and cross-border competitions have separate navigation groups.
export const SOCCER_REGIONS = [
  {
    id: "brasil",
    name: "Brasil",
    competitions: [
      "bra.1",
      "bra.2",
      "bra.copa_do_brazil",
      "bra.camp.carioca",
      "bra.camp.paulista",
      "bra.camp.gaucho",
      "bra.camp.mineiro",
    ],
  },
  {
    id: "inglaterra",
    name: "Inglaterra",
    competitions: ["eng.1", "eng.fa", "eng.league_cup"],
  },
  {
    id: "espanha",
    name: "Espanha",
    competitions: ["esp.1", "esp.copa_del_rey"],
  },
  { id: "italia", name: "Itália", competitions: ["ita.1", "ita.coppa_italia"] },
  {
    id: "alemanha",
    name: "Alemanha",
    competitions: ["ger.1", "ger.dfb_pokal"],
  },
  {
    id: "franca",
    name: "França",
    competitions: ["fra.1", "fra.coupe_de_france"],
  },
  {
    id: "eua",
    name: "Estados Unidos e Canadá",
    competitions: ["usa.1", "usa.open"],
  },
  {
    id: "arabia",
    name: "Arábia Saudita",
    competitions: ["ksa.1", "ksa.kings.cup"],
  },
];
export const SOCCER_INTERNATIONAL_GROUPS = [
  {
    id: "americas",
    name: "Ligas Intercontinentais",
    competitions: [
      "conmebol.libertadores",
      "conmebol.sudamericana",
      "concacaf.champions",
      "concacaf.leagues.cup",
    ],
  },
  {
    id: "international",
    name: "Ligas Internacionais",
    competitions: [
      "uefa.champions",
      "uefa.europa",
      "uefa.europa.conf",
      "afc.champions",
    ],
  },
];
export const SOCCER_TEAM_LEAGUES = new Set([
  "bra.1",
  "bra.2",
  "eng.1",
  "esp.1",
  "ita.1",
  "ger.1",
  "fra.1",
  "usa.1",
  "ksa.1",
]);
