import serieA from '../data/cbf-broadcasts-2026-a.json' with { type: 'json' };
import serieB from '../data/cbf-broadcasts-2026-b.json' with { type: 'json' };
import { matchChannels } from './watch.mjs';

const aliases = new Map([
  ['athleticopr', 'athleticoparanaense'],
  ['vasco', 'vascodagama'],
  ['atleticomg', 'atleticomineiro'],
  ['sport', 'sportrecife'],
  ['americamg', 'america'],
  ['operariopr', 'operario'],
  ['atleticogo', 'atleticogoianiense'],
  ['novorizontino', 'gremionovorizontino'],
]);
function teamKey(league, name) {
  const key = name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/(?:[\s-]+(?:saf|fc))+$/g, '').replace(/[^a-z0-9]/g, '');
  if (league === 'bra.2' && key === 'botafogosp') return 'botafogo';
  return aliases.get(key) ?? key;
}

const channelNames = new Map([
  ['youtube / cazé tv', ['CazéTV']],
  ['espn / disney+', ['Disney+']],
  ['amazon prime', ['Prime Video']],
  ['x sports', ['Xsports']],
]);
const extraChannels = new Map([
  ['rede tv', { id: 'redetv', name: 'RedeTV!', url: 'https://www.redetv.uol.com.br/aovivo/', access: 'free' }],
  ['sportynet', { id: 'sportynet', name: 'SportyNet', url: 'https://www.sky.com.br/pt/canais-adicionais/sportynet', access: 'subscription' }],
]);

function fixtureKey(league, home, away, date) {
  return JSON.stringify([league, teamKey(league, home), teamKey(league, away), Date.parse(date)]);
}

const fixtures = new Map();
for (const { league, matches } of [serieA, serieB]) {
  for (const match of matches) {
    if (!match.kickoff || !Number.isFinite(Date.parse(match.kickoff))) continue;
    const key = fixtureKey(league, match.home, match.away, match.kickoff);
    fixtures.set(key, fixtures.has(key) ? null : match);
  }
}

export function applyCbfBroadcasts(matches) {
  return matches.map(match => {
    if (match.sport !== 'soccer' || !match.watch || !Number.isFinite(Date.parse(match.date))) return match;
    const fixture = fixtures.get(fixtureKey(match.league, match.home.name, match.away.name, match.date));
    if (!fixture?.channels.length) return match;

    const names = fixture.channels.flatMap(name => channelNames.get(name.toLowerCase()) ?? [name]);
    const channels = [...matchChannels({ broadcasts: [{ region: 'BR', names }] }),
      ...fixture.channels.map(name => extraChannels.get(name.toLowerCase())).filter(Boolean)];
    if (!channels.length) return match;

    const links = new Map((match.watch.confirmedForMatch ? match.watch.links : []).map(link => [link.id, link]));
    for (const channel of channels) {
      if (!links.has(channel.id)) links.set(channel.id, {
        ...channel, kind: 'platform', country: 'BR', sourceUrl: fixture.sourceUrl,
        note: 'Canal informado pela CBF. Confira a programação e as condições de acesso.',
      });
    }
    return { ...match, watch: { ...match.watch, scope: 'match', confirmedForMatch: true,
      brazilStatus: 'listed', links: [...links.values()],
      message: 'Transmissões anunciadas para esta partida no Brasil.' } };
  });
}
