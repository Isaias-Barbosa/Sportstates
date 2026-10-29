/** Official destinations reviewed for Brazil on 2026-10-25.
 * This is a competition directory, NOT a per-event TV schedule.
 * Never infer Brazilian rights from the ESPN feed's US broadcast strings.
 */
export const WATCH_REVIEWED_AT = "2026-10-26";
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
      (u.hostname !== "www.youtube.com" || /^\/@(?:CazeTV|canalgoatbr|espnbrasil|tntsportsbr)(?:\/streams)?\/?$/i.test(u.pathname) || (u.pathname === "/watch" && /^[\w-]{11}$/.test(u.searchParams.get("v") || "") && [...u.searchParams.keys()].every(k => k === "v")))
    );
  } catch {
    return false;
  }
}
export const BRAZIL_CHANNEL_GUIDES = [
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
  { pattern: /^globoplay$/i, id: 'globoplay', name: 'Globoplay', url: 'https://globoplay.globo.com/', badge: 'Gplay', access: 'check' },
  { pattern: /^Globo$/i, id: 'globo', name: 'TV Globo', url: 'https://globoplay.globo.com/', badge: 'G', access: 'check' },
  { pattern: /^Ge\s*TV$/i, id: 'getv', name: 'ge tv', url: 'https://globoplay.globo.com/categorias/esportes/', badge: 'ge', access: 'free' },

  ...BRAZIL_CHANNEL_GUIDES.filter(l => !/^espn\d?$/.test(l.id)).map(l => ({ ...l, pattern: new RegExp(`^${l.name.split(' · ')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })),
  { pattern: /^ESPN(?:\s*1)?(?:\s*Brasil)?$/i, id: "espn", name: "ESPN", url: "https://www.espn.com.br/watch/", badge: "ESPN" },
  ...[2, 3, 4, 5, 6].map(n => ({ pattern: new RegExp(`^ESPN\\s*${n}$`, "i"), id: `espn${n}`, name: `ESPN ${n}`, url: "https://www.espn.com.br/watch/", badge: `ESPN ${n}` })),
  { pattern: /^Disney\s*\+$/, ...disney, name: "Disney+", badge: "D+" },
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
  const common = { international, brazilStatus: channels.length ? 'listed' : 'unknown', brazilGuides: BRAZIL_CHANNEL_GUIDES };
  if (channels.length) return {
    ...common, country: "BR", regionLabel: "Brasil", scope: "match", confirmedForMatch: true,
    reviewedAt: WATCH_REVIEWED_AT, links: channels,
    message: "Canais informados pela fonte para esta partida no Brasil. A programação pode mudar e exigir assinatura.",
  };
  const links = (WATCH_DIRECTORY[`${match.sport}/${match.league}`] || [])
    .filter((l) => safeWatchUrl(l.url))
    .map((l) => ({ ...l }));
  return {
    ...common,
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
