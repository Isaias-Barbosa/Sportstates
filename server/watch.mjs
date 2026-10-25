/** Official destinations reviewed for Brazil on 2026-10-25.
 * This is a competition directory, NOT a per-event TV schedule.
 * Never infer Brazilian rights from the ESPN feed's US broadcast strings.
 */
export const WATCH_REVIEWED_AT = "2026-10-25";
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
export const WATCH_DIRECTORY = {
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
      note: "Abra a área de esportes e confirme a partida disponível.",
      sourceUrl: "https://help.hbomax.com/br/Answer/Detail/000002560",
    },
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

const HOSTS = new Set([
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
      !u.port
    );
  } catch {
    return false;
  }
}
export function getWatchOptions(match) {
  if (match.state !== "live") return null;
  const links = (WATCH_DIRECTORY[`${match.sport}/${match.league}`] || [])
    .filter((l) => safeWatchUrl(l.url))
    .map((l) => ({ ...l }));
  return {
    country: "BR",
    regionLabel: "Brasil",
    scope: "competition",
    confirmedForMatch: false,
    reviewedAt: WATCH_REVIEWED_AT,
    links,
    message: links.length
      ? "Opções oficiais da competição no Brasil. Confirme este jogo na programação; a transmissão pode exigir assinatura e variar por região."
      : "Ainda não temos uma opção oficial verificada para esta competição no Brasil.",
  };
}
