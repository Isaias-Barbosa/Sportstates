import { TABLE_COMPETITIONS } from "./table-tennis.mjs";
export const BRAZIL_STATE_LEAGUES = new Set([
  "bra.camp.carioca",
  "bra.camp.paulista",
  "bra.camp.gaucho",
  "bra.camp.mineiro",
]);

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
      ["arg.1", "Primera División da Argentina"],
      ["arg.copa", "Copa Argentina"],
      ["arg.trofeo_de_la_campeones", "Trofeo de Campeones"],
      ["arg.supercopa", "Supercopa Argentina"],
      ["arg.supercopa.internacional", "Supercopa Internacional"],
      ["mex.1", "Liga MX"],
      ["mex.campeon", "Campeón de Campeones"],
      ["col.1", "Categoría Primera A"],
      ["col.copa", "Copa Colombia"],
      ["col.superliga", "Superliga Colombiana"],
      ["chi.1", "Primera División do Chile"],
      ["chi.copa_chi", "Copa Chile"],
      ["chi.super_cup", "Supercopa do Chile"],
      ["uru.1", "Primera División Uruguaia"],
      ["ecu.1", "LigaPro Ecuador"],
      ["ecu.copa_2026", "Copa Ecuador 2026"],
      ["ecu.supercopa_2026", "Supercopa Ecuador 2026"],
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
      ["por.1", "Liga Portugal"],
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
      ["nbb", "Novo Basquete Brasil"],
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
  {
    id: "tennis",
    name: "Tênis masculino",
    icon: "🎾",
    leagues: [["atp", "ATP · Simples masculino"]],
  },
  {
    id: "table-tennis",
    name: "Tênis de mesa masculino",
    icon: "🏓",
    leagues: TABLE_COMPETITIONS,
  },
  {
    id: "volleyball",
    name: "Vôlei masculino",
    icon: "🏐",
    leagues: [["superliga-men", "Superliga Masculina"]],
  },
  { id: "judo", name: "Judô", icon: "🥋", leagues: [] },
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
    competitions: ["bra.1", "bra.2", "bra.copa_do_brazil"],
    stateCompetitions: [...BRAZIL_STATE_LEAGUES],
  },
  {
    id: "argentina",
    name: "Argentina",
    competitions: [
      "arg.1",
      "arg.copa",
      "arg.trofeo_de_la_campeones",
      "arg.supercopa",
      "arg.supercopa.internacional",
    ],
  },
  {
    id: "mexico",
    name: "México",
    competitions: ["mex.1", "mex.campeon"],
  },
  {
    id: "colombia",
    name: "Colômbia",
    competitions: ["col.1", "col.copa", "col.superliga"],
  },
  {
    id: "chile",
    name: "Chile",
    competitions: ["chi.1", "chi.copa_chi", "chi.super_cup"],
  },
  { id: "uruguai", name: "Uruguai", competitions: ["uru.1"] },
  {
    id: "equador",
    name: "Equador",
    competitions: ["ecu.1", "ecu.copa_2026", "ecu.supercopa_2026"],
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
  { id: "portugal", name: "Portugal", competitions: ["por.1"] },
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
  "arg.1",
  "mex.1",
  "col.1",
  "chi.1",
  "uru.1",
  "ecu.1",
  "eng.1",
  "esp.1",
  "ita.1",
  "ger.1",
  "fra.1",
  "por.1",
  "usa.1",
  "ksa.1",
]);

export const SOCCER_TOURNAMENT_FORMATS = {
  "arg.1": "Apertura e Clausura",
  "mex.1": "Apertura e Clausura",
  "col.1": "Apertura e Finalización",
  "chi.1": "Torneio anual",
  "uru.1": "Apertura, Intermedio e Clausura",
  "ecu.1": "Duas etapas e classificação acumulada",
};

export const SOCCER_DOMESTIC_TOURNAMENTS = Object.freeze([
  "arg.copa",
  "arg.trofeo_de_la_campeones",
  "arg.supercopa",
  "arg.supercopa.internacional",
  "mex.campeon",
  "col.copa",
  "col.superliga",
  "chi.copa_chi",
  "chi.super_cup",
  "ecu.copa_2026",
  "ecu.supercopa_2026",
]);
