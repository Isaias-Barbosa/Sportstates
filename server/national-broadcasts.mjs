export const NATIONAL_BROADCASTS_REVIEWED_AT = "2026-11-14";

const ge = "https://ge.globo.com/futebol/selecao-brasileira/noticia/2026/11/13/japao-x-brasil-onde-assistir-ao-vivo-horario-e-escalacoes.ghtml";
const brazilGuide = "https://futebol.tv.br/jogos/2026-11-14";
const gfEsporte = "https://www.gfesporte.com.br/noticias/outros-esportes/programa-o-esportiva-para-este-s-bado-14-de-novembro-de-2026/29954/";
const goal = "https://www.goal.com/br/listas/futebol-programacao-jogos-tv-aberta-fechada-onde-assistir-online-app/bltc0a7361374657315";
const singapura = "https://jc.uol.com.br/blog-do-torcedor/futebol/selecao-brasileira/2026/11/13/singapura-x-brasil-ao-vivo-onde-assistir-horario-e-informacoes-do-amistoso.html";
const concacaf = "https://www.concacaf.com/competitions/nations-league/watch";

// Published Brazilian schedules for the November 2026 international window.
// IDs are from ESPN. Times are UTC, including the late matches on November 14 in Brazil.
export const NATIONAL_BROADCASTS = {
  "fifa.friendly/401916337": ["2026-11-14T10:15Z", ["Globo", "sportv", "ge tv"], ge],
  "uefa.nations/401861163": ["2026-11-14T14:00Z", ["ESPN", "Disney+ Premium"], brazilGuide],
  "uefa.nations/401861164": ["2026-11-14T17:00Z", ["sportv"], brazilGuide],
  "uefa.nations/401861165": ["2026-11-14T17:00Z", ["ESPN", "Disney+ Premium"], brazilGuide],
  "uefa.nations/401861170": ["2026-11-14T19:45Z", ["Disney+ Premium"], brazilGuide],
  "uefa.nations/401861169": ["2026-11-14T19:45Z", ["Disney+ Premium"], brazilGuide],
  "uefa.nations/401861167": ["2026-11-14T19:45Z", ["sportv"], brazilGuide],
  "uefa.nations/401861168": ["2026-11-14T19:45Z", ["Disney+ Premium"], brazilGuide],
  "uefa.nations/401861166": ["2026-11-14T19:45Z", ["ESPN 3", "Disney+ Premium"], brazilGuide],
  "concacaf.nations.league/401929774": ["2026-11-14T19:00Z", ["Concacaf YouTube"], concacaf],
  "concacaf.nations.league/401929710": ["2026-11-14T21:30Z", ["GOAT"], gfEsporte],
  "concacaf.nations.league/401929773": ["2026-11-15T00:00Z", ["Concacaf YouTube"], concacaf],
  "concacaf.nations.league/401929772": ["2026-11-15T01:00Z", ["GOAT"], gfEsporte],
  "fifa.friendly/401914292": ["2026-11-16T18:00Z", ["sportv 3"], goal],
  "fifa.friendly/401916335": ["2026-11-17T10:00Z", ["Globo", "sportv", "ge tv"], singapura],
  "fifa.friendly/401930895": ["2026-11-17T23:00Z", ["Disney+ Premium"], goal],
  "uefa.nations/401861171": ["2026-11-15T14:00Z", ["Disney+ Premium"], goal],
  "uefa.nations/401861172": ["2026-11-15T14:00Z", ["Disney+ Premium"], goal],
  "uefa.nations/401861173": ["2026-11-15T17:00Z", ["ESPN", "Disney+ Premium"], goal],
  "uefa.nations/401861174": ["2026-11-15T17:00Z", ["sportv"], goal],
  "uefa.nations/401861175": ["2026-11-15T19:45Z", ["sportv"], goal],
  "uefa.nations/401861176": ["2026-11-15T19:45Z", ["ESPN", "Disney+ Premium"], goal],
  "uefa.nations/401861177": ["2026-11-15T19:45Z", ["sportv 2", "ge tv"], goal],
  "uefa.nations/401861178": ["2026-11-15T19:45Z", ["Disney+ Premium"], goal],
  "uefa.nations/401861179": ["2026-11-16T19:45Z", ["Disney+ Premium"], goal],
  "uefa.nations/401861180": ["2026-11-16T15:00Z", ["sportv 2"], goal],
  "uefa.nations/401861181": ["2026-11-16T15:00Z", ["ESPN 4", "Disney+ Premium"], goal],
  "uefa.nations/401861182": ["2026-11-16T17:00Z", ["ESPN 4", "Disney+ Premium"], goal],
  "uefa.nations/401861183": ["2026-11-16T17:00Z", ["sportv 2"], goal],
  "uefa.nations/401861184": ["2026-11-16T17:00Z", ["Disney+ Premium"], goal],
  "uefa.nations/401861185": ["2026-11-16T19:45Z", ["ESPN", "Disney+ Premium"], goal],
  "uefa.nations/401861186": ["2026-11-16T19:45Z", ["ESPN 4", "Disney+ Premium"], goal],
  "uefa.nations/401861187": ["2026-11-16T19:45Z", ["Disney+ Premium"], goal],
  "uefa.nations/401861188": ["2026-11-16T19:45Z", ["sportv"], goal],
  "uefa.nations/401861189": ["2026-11-17T19:45Z", ["sportv"], goal],
  "uefa.nations/401861190": ["2026-11-17T19:45Z", ["ESPN Brasil (YouTube)", "Disney+ Premium"], goal],
  "uefa.nations/401861191": ["2026-11-17T19:45Z", ["sportv 3"], goal],
  "uefa.nations/401861192": ["2026-11-17T19:45Z", ["Disney+ Premium"], goal],
  "uefa.nations/401861193": ["2026-11-17T19:45Z", ["ESPN 4", "Disney+ Premium"], goal],
  "uefa.nations/401861194": ["2026-11-17T19:45Z", ["ESPN", "Disney+ Premium"], goal],
  "uefa.nations/401861195": ["2026-11-17T19:45Z", ["sportv 2"], goal],
  "uefa.nations/401861196": ["2026-11-17T19:45Z", ["Disney+ Premium"], goal],
  "concacaf.nations.league/401929770": ["2026-11-17T01:00Z", ["GOAT"], goal],
  "concacaf.nations.league/401929766": ["2026-11-18T00:00Z", ["GOAT"], goal],
  "concacaf.nations.league/401929763": ["2026-11-18T02:30Z", ["GOAT"], goal],
};
