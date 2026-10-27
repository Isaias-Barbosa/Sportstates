export const SPORTS = [
  {
    id: "soccer",
    name: "Futebol",
    icon: "⚽",
    leagues: [
      ["bra.1", "Brasileirão Série A"],
      ["bra.2", "Brasileirão Série B"],
      ["bra.copa_do_brazil", "Copa do Brasil"],
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

// Continental tournaments are shared by all qualifying national leagues.
export const SOCCER_REGIONS = [
  {id: 'brasil', name: 'Brasil', competitions: ['bra.1','bra.2','bra.copa_do_brazil','conmebol.libertadores','conmebol.sudamericana']},
  {id: 'inglaterra', name: 'Inglaterra', competitions: ['eng.1','eng.fa','eng.league_cup','uefa.champions','uefa.europa','uefa.europa.conf']},
  {id: 'espanha', name: 'Espanha', competitions: ['esp.1','esp.copa_del_rey','uefa.champions','uefa.europa','uefa.europa.conf']},
  {id: 'italia', name: 'Itália', competitions: ['ita.1','ita.coppa_italia','uefa.champions','uefa.europa','uefa.europa.conf']},
  {id: 'alemanha', name: 'Alemanha', competitions: ['ger.1','ger.dfb_pokal','uefa.champions','uefa.europa','uefa.europa.conf']},
  {id: 'franca', name: 'França', competitions: ['fra.1','fra.coupe_de_france','uefa.champions','uefa.europa','uefa.europa.conf']},
  {id: 'eua', name: 'Estados Unidos e Canadá', competitions: ['usa.1','usa.open','concacaf.leagues.cup']},
  {id: 'arabia', name: 'Arábia Saudita', competitions: ['ksa.1','ksa.kings.cup','afc.champions']},
];
