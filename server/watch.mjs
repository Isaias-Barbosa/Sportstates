/** Official destinations reviewed for Brazil on 2026-11-01.
 * This is a competition directory, NOT a per-event TV schedule.
 * Never infer Brazilian rights from the ESPN feed's US broadcast strings.
 */
export const WATCH_REVIEWED_AT = "2026-11-01";
import {broadcastConsultations} from './broadcast-consultations.mjs';
import { NATIONAL_BROADCASTS, NATIONAL_BROADCASTS_REVIEWED_AT } from './national-broadcasts.mjs';
const disney = {
  id: "disney",
  name: "Disney+ · ESPN",
  url: "https://www.disneyplus.com/pt-br/browse/page-15961e0d-00e3-4ff5-90b1-eb71a0f9457c",
  access: "subscription",
  kind: "platform",
  note: "Consulte os jogos e o plano com esportes disponível no Brasil.",
  sourceUrl:
    "https://www.disneyplus.com/pt-br/browse/page-15961e0d-00e3-4ff5-90b1-eb71a0f9457c",
};
const prime = {
  id: "prime",
  name: "Prime Video",
  url: "https://www.primevideo.com/",
  access: "subscription",
  kind: "platform",
  note: "Jogos selecionados; confira a programação e possíveis canais adicionais.",
  sourceUrl:
    "https://www.aboutamazon.com.br/noticias/entretenimento/nba-no-modo-prime-voltou-com-nova-programacao-e-comentarista-para-a-temporada-2026-27",
};
const espnFootballGuide = guide(
  "espn-football-guide",
  "ESPN Brasil · programação",
  "https://www.espn.com.br/watch/",
  "Confira a programação ao vivo da ESPN Brasil; a presença no guia não confirma este jogo.",
);
const disneyFootballGuide = guide(
  "disney-football-guide",
  "Disney+ · esportes",
  "https://www.disneyplus.com/pt-br/browse/page-15961e0d-00e3-4ff5-90b1-eb71a0f9457c",
  "Pesquise o confronto na área de esportes e confirme a disponibilidade no Brasil.",
);
const AMERICAS_FOOTBALL_COMPETITIONS = new Set([
  "bra.3",
  "bra.4",
  "bra.copa_do_nordeste",
  "bra.copa_verde",
  "bra.copa_paulista",
  "bra.copa_alagoas",
  "bra.copa_santa_catarina",
  "bra.copa_fares_lopes",
  "bra.copa_rio",
  "bra.copa_espirito_santo",
  "bra.copa_fgf",
  "bra.copa_governo_sergipe",
  "bra.copa_sul_sudeste",
  "bra.copa_parana",
  "bra.camp.baiano",
  "bra.camp.paraense",
  "bra.camp.goiano",
  "bra.camp.capixaba",
  "bra.camp.sergipano",
  "bra.camp.pernambucano",
  "bra.camp.catarinense",
  "bra.camp.cearense",
  "bra.camp.matogrossense",
  "bra.camp.paraibano",
  "bra.camp.maranhense",
  "bra.camp.paranaense",
  "bra.camp.potiguar",
  "bra.camp.alagoano",
  "bra.camp.piauiense",
  "bra.camp.sul_matogrossense",
  "bra.camp.brasiliense",
  "bra.camp.amazonense",
  "bra.camp.acreano",
  "bra.camp.rondoniense",
  "bra.camp.amapaense",
  "bra.camp.roraimense",
  "bra.camp.tocantinense",
  "arg.1",
  "arg.copa",
  "arg.trofeo_de_la_campeones",
  "arg.supercopa",
  "arg.supercopa.internacional",
  "mex.1",
  "mex.campeon",
  "col.1",
  "col.copa",
  "col.superliga",
  "chi.1",
  "chi.copa_chi",
  "chi.super_cup",
  "uru.1",
  "ecu.1",
  "ecu.copa_2026",
  "ecu.supercopa_2026",
]);
// Direct official event pages are scoped to one ESPN event, not league rights.
const MATCH_BROADCASTS = {
  "soccer/arg.1/401841658": [
    {
      id: "disney-boca-river",
      name: "Disney+ · ESPN",
      url: "https://www.disneyplus.com/pt-br/play/aa536155-4878-4b15-be18-011382749efc",
      access: "subscription",
      kind: "platform",
      note: "Página oficial Disney+ Brasil desta partida; requer assinatura elegível.",
      sourceUrl:
        "https://www.disneyplus.com/pt-br/play/aa536155-4878-4b15-be18-011382749efc",
    },
  ],
};
function guide(
  id,
  name,
  url,
  note = "Selecione Brasil e consulte as emissoras e a programação.",
) {
  return {
    id,
    name,
    url,
    access: "check",
    kind: "guide",
    note,
    sourceUrl: url,
  };
}
const EUROPA_REVIEWED_AT = '2026-11-05';
const EUROPA_UEFA_SOURCE = 'https://pt.uefa.com/uefaeuropaleague/news/028d-1af12a520f8c-171f98d1c49a-1000--onde-ver-a-europa-league-parceiros-de-tv-streams-em-directo/';
const europaUefaGuide = guide('uefa-europa-guide','UEFA · parceiros de transmissão',EUROPA_UEFA_SOURCE,'Consulte os parceiros brasileiros e a edição da competição no guia oficial da UEFA.');
const europaCaze = {id:'cazetv',name:'CazéTV · YouTube',badge:'CAZÉ',url:'https://www.youtube.com/@CazeTV/streams',access:'free',kind:'platform',sourceUrl:EUROPA_UEFA_SOURCE,note:'Parceira da Europa League no Brasil em 2026/27. Jogos selecionados podem estar em canais parceiros; confirme o confronto na programação.'};
const cnnEuropa = {...guide('cnnesportes','CNN Esportes · programação','https://www.cnnbrasil.com.br/tudo-sobre/europa-league/','CNN Esportes e Itatiaia anunciam jogos selecionados com imagens no YouTube. Consulte a programação deste confronto.'),badge:'CNN',access:'free',sourceUrl:'https://www.cnnbrasil.com.br/esportes/futebol/futebol-internacional/cnn-brasil-e-itatiaia-transmitem-bayer-leverkusen-x-marseille-saiba-mais/'};
const itatiaiaEuropa = {...guide('itatiaia','Itatiaia · programação','https://www.itatiaia.com.br/esportes/futebol/futebol-internacional/liga-europa/','Transmissões selecionadas com imagens em parceria com CNN Esportes. Confira a partida anunciada, a data e o canal no YouTube.'),badge:'ITA',access:'free',sourceUrl:'https://www.itatiaia.com.br/esportes/futebol/futebol-internacional/liga-europa/omonia-nicosia-x-benfica-assista-ao-vivo-e-com-imagens-a-transmissao-da-itatiaia/'};
const bandSportsGuide={id:'bandsports',name:'BandSports',badge:'BAND',url:'https://www.band.com.br/programacao',access:'check',kind:'guide',note:'Confira a grade do BandSports na sua operadora. O link abre a programação geral do grupo Band.',sourceUrl:'https://www.band.com.br/programacao'};
const isEuropa2026 = match => match.sport==='soccer'&&match.league==='uefa.europa'&&Date.parse(match.date)>=Date.UTC(2026,6,1)&&Date.parse(match.date)<Date.UTC(2027,6,1);
const CHAMPIONS_UEFA_SOURCE='https://pt.uefa.com/uefachampionsleague/news/0257-0e9532e6bd9d-f0435ad3b137-1000--onde-ver-os-jogos/';
const CONFERENCE_UEFA_SOURCE='https://pt.uefa.com/uefaconferenceleague/news/0285-18f7d75f0a98-0bffb619ddd9-1000--onde-ver-a-uefa-conference-league-parceiros-de-tv-streams-/';
const championsUefaGuide=guide('uefa-champions-guide','UEFA · parceiros de transmissão',CHAMPIONS_UEFA_SOURCE,'Consulte os parceiros brasileiros e a edição da Champions League no guia oficial da UEFA.');
const conferenceUefaGuide=guide('uefa-conference-guide','UEFA · parceiros de transmissão',CONFERENCE_UEFA_SOURCE,'Consulte os parceiros brasileiros e a edição da Conference League no guia oficial da UEFA.');
const UEFA_GUIDES={'uefa.europa':europaUefaGuide,'uefa.champions':championsUefaGuide,'uefa.europa.conf':conferenceUefaGuide};
const isUefa2026=match=>match.sport==='soccer'&&Object.hasOwn(UEFA_GUIDES,match.league)&&Date.parse(match.date)>=Date.UTC(2026,6,1)&&Date.parse(match.date)<Date.UTC(2027,6,1);
export const WATCH_DIRECTORY = {
  'soccer/uefa.europa':[europaCaze,cnnEuropa,itatiaiaEuropa,europaUefaGuide],
  'soccer/uefa.europa.conf':[{...europaCaze,sourceUrl:CONFERENCE_UEFA_SOURCE,note:'Parceira da Conference League no Brasil em 2026/27. Confira o confronto anunciado na programação da CazéTV; este guia não confirma um jogo individual.'},conferenceUefaGuide],
  "soccer/bra.1": [
    {
      id: "premiere",
      name: "Premiere",
      url: "https://premiere.globo.com/",
      access: "subscription",
      kind: "platform",
      note: "Confira se esta partida está no pacote e na sua região.",
      sourceUrl: "https://premiere.globo.com/",
    },
    prime,
  ],
  "soccer/bra.2": [disney],
  "soccer/eng.1": [disney],
  "soccer/ita.1": [disney],
  "soccer/esp.1": [
    guide(
      "laliga",
      "Guia oficial da LaLiga",
      "https://www.laliga.com/en-GB/where-to-watch-laliga-easports",
    ),
  ],
  "soccer/ger.1": [
    guide(
      "bundesliga",
      "Guia oficial da Bundesliga",
      "https://www.bundesliga.com/en/bundesliga/info/broadcasters/",
    ),
  ],
  "soccer/fra.1": [
    guide(
      "ligue1",
      "Guia oficial da Ligue 1",
      "https://ligue1.com/en/international-broadcasters",
    ),
  ],
  "soccer/uefa.champions": [
    {
      id: "hbomax",
      name: "HBO Max",
      url: "https://www.hbomax.com/br/pt",
      access: "subscription",
      kind: "platform",
      note: "TNT Sports/HBO Max consta no guia da UEFA para o Brasil em 2026/27. Abra a área de esportes e confirme a partida e o plano disponível.",
      sourceUrl: CHAMPIONS_UEFA_SOURCE,
    },
    {...guide('tnt','TNT Sports · programação','https://tntsports.com.br/','Confira qual canal e plataforma da TNT Sports exibirá este confronto. O guia da competição não confirma a partida.'),badge:'TNT',access:'check',sourceUrl:CHAMPIONS_UEFA_SOURCE},
    {id:'sbt',name:'SBT',url:'https://www.sbt.com.br/',badge:'SBT',access:'free',kind:'platform',sourceUrl:CHAMPIONS_UEFA_SOURCE,note:'Parceiro da Champions League no Brasil em 2026/27. Jogos selecionados na TV aberta; confirme a partida na programação do SBT.'},
    championsUefaGuide,
  ],
  "basketball/nba": [
    {
      id: "nbalp",
      name: "NBA League Pass",
      url: "https://www.nba.com/league-pass-purchase",
      access: "subscription",
      kind: "platform",
      note: "Confira restrições locais e a disponibilidade deste jogo.",
      sourceUrl:
        "https://support.watch.nba.com/hc/pt-br/articles/115000585974-NBA-League-Pass?hidenav=true",
    },
    disney,
    prime,
  ],
  "basketball/wnba": [
    {
      id: "wnbalp",
      name: "WNBA League Pass",
      url: "https://www.wnba.com/leaguepass",
      access: "subscription",
      kind: "platform",
      note: "Confira restrições locais e a disponibilidade deste jogo.",
      sourceUrl: "https://www.wnba.com/leaguepass",
    },
  ],
  "football/nfl": [
    {
      id: "nflgp",
      name: "NFL Game Pass · DAZN",
      url: "https://www.dazn.com/pt-BR/l/nfl-game-pass",
      access: "subscription",
      kind: "platform",
      note: "Pacote NFL Game Pass. Confira o plano e as condições no Brasil.",
      sourceUrl: "https://www.dazn.com/pt-BR/l/nfl-game-pass",
    },
    disney,
    guide(
      "nflguide",
      "Guia oficial da NFL no Brasil",
      "https://www.nfl.com/international/ways-to-watch/brazil",
      "Confira os parceiros e as opções locais no site da NFL.",
    ),
  ],
  "baseball/mlb": [
    {
      id: "mlbtv",
      name: "MLB.TV",
      url: "https://www.mlb.com/tv",
      access: "subscription",
      kind: "platform",
      note: "Há jogos e exclusividades sujeitos a restrições territoriais.",
      sourceUrl: "https://www.mlb.com/tv",
    },
    disney,
  ],
  "hockey/nhl": [
    {
      ...disney,
      sourceUrl: "https://www.nhl.com/info/how-to-watch-by-country",
    },
    guide(
      "nhlguide",
      "Guia oficial da NHL",
      "https://www.nhl.com/info/how-to-watch-by-country",
      "Procure Brazil no guia oficial para conferir os parceiros.",
    ),
  ],
};
for (const league of AMERICAS_FOOTBALL_COMPETITIONS)
  WATCH_DIRECTORY[`soccer/${league}`] = [
    espnFootballGuide,
    disneyFootballGuide,
  ];
WATCH_DIRECTORY["soccer/por.1"] = [espnFootballGuide, disneyFootballGuide];

// Competition rights are a guide, never proof of an individual match's channel.
const tennisSource = 'https://brazil.espnpressroom.com/press-releases/2026/03/casa-do-tenis-no-brasil-espn-e-disney-ampliam-cobertura-da-modalidade-com-novos-torneios-challenger/';
WATCH_DIRECTORY['tennis/atp'] = [
  { ...disney, sourceUrl: tennisSource, note: 'Tênis masculino na ESPN/Disney+ Premium. Confira o torneio, a quadra e o plano; o canal ESPN específico depende da programação.' },
  guide('atpguide', 'Programação oficial ATP', 'https://www.atptour.com/en/tournaments/tv-schedule'),
];
const cazeWtt = {
  id: 'cazetv', name: 'CazéTV · YouTube', badge: 'CAZÉ',
  url: 'https://www.youtube.com/@CazeTV/streams', access: 'free', kind: 'platform',
  sourceUrl: 'https://www.ittf.com/2025/09/17/ittf-and-wtt-sign-four-year-broadcast-deal-with-cazetv-in-brazil/',
  note: 'Parceira digital gratuita da ITTF/WTT no Brasil (2025–2028). Confira a sessão e a mesa anunciadas; este link não confirma a exibição individual.',
};
for (const league of ['grand-smash','champions','star-contender','contender','world-championships','world-cup'])
  WATCH_DIRECTORY['table-tennis/'+league] = [cazeWtt, guide('wttguide','Guia oficial WTT','https://www.worldtabletennis.com/livevideo','Confira as emissoras e possíveis restrições territoriais deste evento.')];
for (const league of ['feeder','finals'])
  WATCH_DIRECTORY['table-tennis/'+league] = [guide('wttguide','Guia oficial WTT','https://www.worldtabletennis.com/livevideo','Confira a cobertura deste evento e as restrições no Brasil.'),guide('wttglobal','WTT · YouTube oficial','https://www.youtube.com/@wttglobal/streams','Consulte as mesas disponíveis. Alguns eventos podem ter bloqueio territorial no Brasil.')];
WATCH_DIRECTORY['soccer/esp.copa_del_rey'] = [{...disney, sourceUrl:'https://brazil.espnpressroom.com/press-releases/2026/02/espn-e-disney-transmitem-semifinal-da-copa-do-rei-entre-barcelona-e-atletico-de-madrid/'}];
for (const league of ['eng.fa','eng.league_cup'])
 WATCH_DIRECTORY['soccer/'+league] = [{...disney,sourceUrl:'https://brazil.espnpressroom.com/press-releases/2026/01/final-da-supercopa-da-espanha-e-wild-card-da-nfl-marcam-a-semana-da-espn-e-do-disney/'}];
const goat = {id:'goat',name:'Canal GOAT · YouTube',badge:'GOAT',url:'https://www.youtube.com/@canalgoatbr/streams',access:'free',kind:'platform',sourceUrl:'https://www.spl.com.sa/en/news/where-to-watch',note:'Parceiro da Liga Saudita no Brasil. Confira o jogo na agenda oficial do GOAT; nem todas as partidas estão confirmadas.'};
WATCH_DIRECTORY['soccer/ksa.1'] = [goat,guide('goatguide','Programação oficial GOAT','https://canalgoat.com.br/transmissoes/')];
const xsportsGuide = { ...guide('xsports', 'Xsports · programação', 'https://www.xsports.com.br/', 'Confira o confronto e a data na programação oficial. Há jogos selecionados e reprises; o guia não confirma este jogo.'), badge: 'X', access: 'free' };
const japanGoat = {...goat,sourceUrl:'https://canalgoat.com.br/',note:'Consulte a agenda do GOAT para os jogos selecionados do futebol japonês. A presença no guia não confirma este confronto.'};
WATCH_DIRECTORY['soccer/jpn.1'] = [japanGoat,xsportsGuide,guide('jleague-guide','J.League · onde assistir','https://www.jleague.jp/en/j1/where-to-watch/','Confira a edição, a região Brasil e a partida anunciada pelo organizador.')];
WATCH_DIRECTORY['soccer/jpn.league_cup'] = [japanGoat,guide('goatguide','Canal GOAT · programação','https://canalgoat.com.br/programacao/','Confira a transmissão anunciada para esta edição da Levain Cup.')];
const nbbYoutube = { ...guide('nbbyt', 'NBB CAIXA · YouTube', 'https://www.youtube.com/user/NBBoficial', 'Canal oficial indicado pela LNB. Confira a transmissão anunciada para esta partida.'), badge: 'NBB', access: 'free', sourceUrl: 'https://lnb.com.br/' };
WATCH_DIRECTORY['basketball/nbb'] = [xsportsGuide, nbbYoutube];
for (const league of ['ger.1', 'bra.2'])
  WATCH_DIRECTORY['soccer/' + league] = [...(WATCH_DIRECTORY['soccer/' + league] || []), xsportsGuide];
// Tennis TV excludes Grand Slams and other tours. A tournament must be explicit.
// Competition guides are not evidence that an individual fixture is broadcast.
WATCH_DIRECTORY['soccer/rus.1'] = [
  {...guide('canal-gol-brasil', 'Canal GOl Brasil · YouTube', 'https://www.youtube.com/@canalgolbrasil/streams', 'Confira o confronto na agenda do Canal GOl Brasil. Jogos selecionados; este guia não confirma a transmissão da partida.'), badge: 'GOL', access: 'free', sourceUrl: 'https://www.canalgolbr.com.br/transmissoes'},
  {...bandSportsGuide, note: 'Campeonato Russo: consulte o confronto na grade do BandSports. Este guia não confirma a transmissão desta partida.'},
  guide('rpl-guide', 'Premier Liga · programação oficial', 'https://premierliga.ru/broadcasts/', 'Confira a temporada, o território Brasil e a programação da partida.'),
];
WATCH_DIRECTORY['soccer/rus.cup'] = [
  guide('rfs-cup-guide', 'Copa da Rússia · organizador', 'https://www.rfs.ru/cup/', 'Consulte a edição e a programação oficial. Os direitos da Premier Liga não confirmam os canais da Copa da Rússia.'),
  {...guide('uol-russian-cup', 'UOL Esporte · programação', 'https://www.uol.com.br/esporte/', 'A federação russa anunciou acordo da Copa da Rússia para a América do Sul. Confira temporada, disponibilidade no Brasil e anúncio deste confronto.'), sourceUrl: 'https://www.rfs.ru/cup/news/224872'},
];

export function competitionWatchLinks(match) {
 if(match.sport==='soccer'&&Object.hasOwn(UEFA_GUIDES,match.league)&&!isUefa2026(match))return [UEFA_GUIDES[match.league]];
 const links = [...(WATCH_DIRECTORY[match.sport+'/'+match.league] || [])];
 if (match.sport === "soccer" && AMERICAS_FOOTBALL_COMPETITIONS.has(match.league) && match.home?.name && match.away?.name) {
  const date = Number.isFinite(Date.parse(match.date))
   ? new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
     }).format(new Date(match.date))
   : "";
  const query = `${match.home.name} ${match.away.name} ${date} onde assistir Brasil`;
  links.unshift(guide(
   "espn-match-guide",
   "Buscar este jogo na ESPN Brasil",
   `https://www.espn.com.br/search/_/q/${encodeURIComponent(query)}`,
   "Busca oficial pelo confronto; confira a matéria/programação e o canal antes de considerar a transmissão confirmada.",
  ));
 }
 if(match.sport==='tennis' && /\bATP\s*(?:250|500|1000)|masters\s*1000|\bATP\s*Finals/i.test(match.tournament || '') && !/grand slam|wimbledon|roland|australian open|us open|challenger|davis|laver/i.test(match.tournament || ''))
 links.push({id:'tennistv',name:'Tennis TV · ATP',badge:'ATP',url:'https://www.tennistv.com/',access:'subscription',kind:'platform',sourceUrl:'https://www.tennistv.com/live-atp-streaming',note:'Streaming oficial ATP. Não inclui Grand Slams, Challenger, Davis Cup ou Laver Cup. Confira a disponibilidade do torneio e da quadra.'});
 return links;
}

const HOSTS = new Set([
  'premierliga.ru', 'www.rfs.ru', 'www.uol.com.br',
  'www.jleague.jp','www.jleague.co','www.livesoccertv.com',
  'pt.uefa.com','www.cnnbrasil.com.br','www.itatiaia.com.br','www.band.com.br',
  "www.atptour.com", "www.tennistv.com", "www.worldtabletennis.com", "canalgoat.com.br",
  "www.xsports.com.br", "www.espn.com.br", "www.espn.com", "www.youtube.com", "ge.globo.com", "globoplay.globo.com", "www.band.uol.com.br", "www.sbt.com.br", "record.r7.com", "tntsports.com.br", "qazsporttv.kz", "www.peacocktv.com", "www.cbssports.com",
  "www.disneyplus.com",
  "www.primevideo.com",
  "premiere.globo.com",
  "www.hbomax.com",
  "www.nba.com",
  "www.wnba.com",
  "www.dazn.com",
  "www.mlb.com",
  "www.nfl.com",
  "www.nhl.com",
  "www.laliga.com",
  "www.bundesliga.com",
  "ligue1.com",
]);
export function safeWatchUrl(value) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      HOSTS.has(u.hostname) &&
      !u.username &&
      !u.password &&
      !u.port &&
      (u.hostname !== "www.youtube.com" || u.pathname === '/user/NBBoficial' || /^\/@(?:CazeTV|canalgolbrasil|canalgoatbr|concacaf|espnbrasil|tntsportsbr|wttglobal)(?:\/streams)?\/?$/i.test(u.pathname) || (u.pathname === "/watch" && /^[\w-]{11}$/.test(u.searchParams.get("v") || "") && [...u.searchParams.keys()].every(k => k === "v")))
    );
  } catch {
    return false;
  }
}
export const BRAZIL_CHANNEL_GUIDES = [
  {...cnnEuropa,name:'CNN Esportes',url:'https://www.cnnbrasil.com.br/esportes/'},
  {...itatiaiaEuropa,name:'Itatiaia',url:'https://www.itatiaia.com.br/esportes/'},
  bandSportsGuide,
  { ...WATCH_DIRECTORY["soccer/uefa.champions"][0], badge: "HBO" },
  ...[1, 2, 3, 4, 5, 6].map(n => ({ id: n === 1 ? 'espn' : `espn${n}`, name: n === 1 ? 'ESPN' : `ESPN ${n}`, url: 'https://www.espn.com.br/watch/', badge: n === 1 ? 'ESPN' : `E${n}` })),
  ...[1, 2, 3].map(n => ({ id: `sportv${n}`, name: n === 1 ? 'sportv' : `sportv ${n}`, url: 'https://ge.globo.com/sportv/', badge: `S${n}` })),
  { id: 'cazetv', name: 'CazéTV · YouTube', url: 'https://www.youtube.com/@CazeTV/streams', badge: 'CAZÉ', access: 'free' },
  { id: 'goat', name: 'Canal GOAT · YouTube', url: 'https://www.youtube.com/@canalgoatbr/streams', badge: 'GOAT', access: 'free' },
  { id: 'espnyt', name: 'ESPN Brasil · YouTube', url: 'https://www.youtube.com/@espnbrasil/streams', badge: 'ESPN', access: 'free' },
  { id: 'tntyt', name: 'TNT Sports · YouTube', url: 'https://www.youtube.com/@tntsportsbr/streams', badge: 'TNT', access: 'free' },
  { id: 'globo', name: 'TV Globo', url: 'https://globoplay.globo.com/', badge: 'G', access: 'check' },
  { id: 'record', name: 'Record', url: 'https://record.r7.com/', badge: 'R', access: 'check' },
  { id: 'sbt', name: 'SBT', url: 'https://www.sbt.com.br/', badge: 'SBT', access: 'check' },
  { id: 'band', name: 'Band / BandSports', url: 'https://www.band.uol.com.br/', badge: 'B', access: 'check' },
  { id: 'xsports', name: 'Xsports', url: 'https://www.xsports.com.br/', badge: 'X', access: 'check' },
  { id: 'tnt', name: 'TNT Sports', url: 'https://tntsports.com.br/', badge: 'TNT' },
].map(l => ({ access: 'subscription', ...l, country: 'BR', kind: 'guide', note: 'Consulte a programação oficial. A presença neste guia não confirma a transmissão deste jogo.', sourceUrl: l.url }));
const CHANNELS = [
  {pattern: /^(?:YouTube\s*[-·:]?\s*)?Canal\s*Gol(?:\s*Brasil|\s*BR)?(?:\s*[-·:]?\s*YouTube)?$/i, ...WATCH_DIRECTORY['soccer/rus.1'][0]},
  { pattern: /^(?:Youtube\s+NBB|NBB\s*(?:CAIXA)?\s*[·-]?\s*YouTube)$/i, ...nbbYoutube, note: 'Canal indicado pela fonte desta partida no Brasil. Confira o jogo no canal oficial do NBB.' },
  { pattern: /^(?:Youtube\s+)?X\s*Sports$/i, ...xsportsGuide, name: 'Xsports', note: 'Transmissão indicada pela fonte desta partida no Brasil. Confira o horário na programação oficial da Xsports.' },
  {pattern:/^CNN(?:\s*(?:Brasil|Esportes))?$/i,...BRAZIL_CHANNEL_GUIDES.find(link=>link.id==='cnnesportes'),name:'CNN Esportes'},
  {pattern:/^(?:R[aá]dio\s+)?Itatiaia(?:\s+Esportes?)?$/i,...BRAZIL_CHANNEL_GUIDES.find(link=>link.id==='itatiaia'),name:'Itatiaia'},
  {pattern:/^Band\s*Sports$/i,...bandSportsGuide},
  {pattern: /^GOAT$/i, ...goat},
  { pattern: /^Concacaf YouTube$/i, id: 'concacaf-yt', name: 'Concacaf · YouTube',
    url: 'https://www.youtube.com/@concacaf/streams', access: 'free', badge: 'CONCACAF' },
  ...[1,2,3].map(n => ({pattern:new RegExp(`^sportv\\s*${n === 1 ? '1?' : n}$`,'i'),id:`sportv${n}`,name:n===1?'sportv':`sportv ${n}`,badge:`S${n}`,url:'https://globoplay.globo.com/',access:'subscription'})),
  { pattern: /^globoplay$/i, id: 'globoplay', name: 'Globoplay', url: 'https://globoplay.globo.com/', badge: 'Gplay', access: 'check' },
  { pattern: /^ESPN Brasil \(YouTube\)$/i, ...BRAZIL_CHANNEL_GUIDES.find(link => link.id === 'espnyt') },
  { pattern: /^Globo$/i, id: 'globo', name: 'TV Globo', url: 'https://globoplay.globo.com/', badge: 'G', access: 'check' },
  { pattern: /^Ge\s*TV$/i, id: 'getv', name: 'ge tv', url: 'https://globoplay.globo.com/categorias/esportes/', badge: 'ge', access: 'free' },

  ...BRAZIL_CHANNEL_GUIDES.filter(l => !/^espn\d?$/.test(l.id)).map(l => ({ ...l, pattern: new RegExp(`^${l.name.split(' · ')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })),
  { pattern: /^ESPN(?:\s*1)?(?:\s*Brasil)?$/i, id: "espn", name: "ESPN", url: "https://www.espn.com.br/watch/", badge: "ESPN" },
  ...[2, 3, 4, 5, 6].map(n => ({ pattern: new RegExp(`^ESPN\\s*${n}$`, "i"), id: `espn${n}`, name: `ESPN ${n}`, url: "https://www.espn.com.br/watch/", badge: `ESPN ${n}` })),
  { pattern: /^Disney\s*\+(?:\s*Premium)?$/i, ...disney, name: "Disney+", badge: "D+" },
  { pattern: /^Premiere$/i, ...WATCH_DIRECTORY["soccer/bra.1"][0], badge: "P" },
  { pattern: /^(Amazon\s+)?Prime V[ií]deo$/i, ...prime, badge: "prime" },
];
export function matchChannels(competition = {}) {
  // Only explicit Brazilian geography is eligible. A Portuguese request is not proof.
  const entries = [...(competition.geoBroadcasts || []), ...(competition.broadcasts || [])];
  const names = entries.filter(b => String(b.region || b.geo?.country || b.country || "").toLowerCase() === "br")
    .flatMap(b => [b.media?.shortName, b.media?.name, ...(b.names || [])].filter(Boolean));
  return [...new Map(names.flatMap(name => {
    const channel = CHANNELS.find(c => c.pattern.test(name));
    if (!channel) return [];
    const { pattern, ...data } = channel;
    return [[data.id, { access: "subscription", kind: "platform", note: "Canal informado no feed da partida para o Brasil. Confira a programação da emissora.", ...data, kind: "platform", sourceUrl: data.url }]];
  })).values()];
}
export function internationalChannels(competition = {}) {
  const entries = [...(competition.geoBroadcasts || []), ...(competition.broadcasts || [])];
  const channels = entries.flatMap(b => {
    const country = String(b.region || b.geo?.country || b.country || '').toUpperCase();
    if (!/^[A-Z]{2}$/.test(country) || country === 'BR') return [];
    const names = [b.media?.shortName, b.media?.name, ...(b.names || [])].filter(Boolean);
    return names.map(name => {
      let url = null;
      if (country === 'US' && /^ESPN(?:[2-9]|U|\+)?$/i.test(name)) url = 'https://www.espn.com/watch/';
      if (country === 'US' && /^Peacock$/i.test(name)) url = 'https://www.peacocktv.com/sports';
      if (country === 'US' && /^CBS$/i.test(name)) url = 'https://www.cbssports.com/';
      if (country === 'KZ' && /^Qazsport$/i.test(name)) url = 'https://qazsporttv.kz/ru/live';
      return { name: String(name).slice(0, 100), country, url };
    });
  });
  return [...new Map(channels.map(c => [`${c.country}:${c.name}`, c])).values()];
}
export function getWatchOptions(match, competition = {}) {
  if (match.state === "finished") return null;
  const channels = matchChannels(competition);
  const international = internationalChannels(competition);
  const common = { international, brazilStatus: channels.length ? 'listed' : 'unknown', brazilGuides: BRAZIL_CHANNEL_GUIDES, consultationLinks: broadcastConsultations(match) };
  const matchBroadcasts =
    MATCH_BROADCASTS[`${match.sport}/${match.league}/${match.id}`] || [];
  if (matchBroadcasts.length)
    return {
      ...common,
      country: "BR",
      regionLabel: "Brasil",
      scope: "match",
      confirmedForMatch: true,
      reviewedAt: WATCH_REVIEWED_AT,
      links: matchBroadcasts.filter((link) => safeWatchUrl(link.url)),
      message:
        "Transmissão confirmada na página oficial Disney+ Brasil desta partida.",
    };
  const national = match.sport === "soccer" && NATIONAL_BROADCASTS[`${match.league}/${match.id}`];
  if (national && Date.parse(match.date) === Date.parse(national[0])) {
    const [, names, sourceUrl] = national;
    const verified = matchChannels({ broadcasts: [{ country: "BR", names }] }).map(link => ({
      ...link,
      name: link.id === "disney" ? "Disney+ Premium" : link.name,
      country: "BR",
      sourceUrl,
      note: "Programação publicada para este confronto no Brasil. Confira o horário, a disponibilidade regional e o plano exigido.",
    }));
    const links = [...new Map([...channels, ...verified].map(link => [link.id, link])).values()];
    return {
      ...common, country: "BR", regionLabel: "Brasil", scope: "match",
      brazilStatus: "listed", confirmedForMatch: true, reviewedAt: NATIONAL_BROADCASTS_REVIEWED_AT, links,
      message: "Transmissão anunciada para esta partida no Brasil. A programação pode mudar.",
    };
  }
  if (channels.length) return {
    ...common, country: "BR", regionLabel: "Brasil", scope: "match", confirmedForMatch: true,
    reviewedAt: isUefa2026(match) ? EUROPA_REVIEWED_AT : WATCH_REVIEWED_AT, links: channels,
    message: "Canais informados pela fonte para esta partida no Brasil. A programação pode mudar e exigir assinatura.",
  };
  const links = competitionWatchLinks(match)
    .filter((l) => safeWatchUrl(l.url))
    .map((l) => ({ ...l }));
  return {
    ...common,
    country: "BR",
    regionLabel: "Brasil",
    scope: "competition",
    confirmedForMatch: false,
    competitionPartnersConfirmed: isUefa2026(match),
    reviewedAt: isUefa2026(match) ? EUROPA_REVIEWED_AT : WATCH_REVIEWED_AT,
    links,
    message: isEuropa2026(match) ? 'Parceiros confirmados da competição no Brasil: CazéTV, com jogos selecionados anunciados por CNN Esportes e Itatiaia. Consulte a programação para localizar a emissora deste confronto.'
      : isUefa2026(match) ? (match.league==='uefa.champions'
        ? 'Parceiros confirmados da Champions League no Brasil em 2026/27: TNT Sports/HBO Max e SBT. Consulte a programação para escolher o canal deste jogo.'
        : 'Parceira confirmada da Conference League no Brasil em 2026/27: CazéTV. Consulte a programação para acompanhar este confronto.') : links.length
      ? "Opções oficiais da competição no Brasil. Confirme este jogo na programação; a transmissão pode exigir assinatura e variar por região."
      : "Ainda não temos uma opção oficial verificada para esta competição no Brasil.",
  };
}
