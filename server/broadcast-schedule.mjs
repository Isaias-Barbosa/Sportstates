import { enrichGeBroadcasts } from './ge-broadcasts.mjs';
import { createCache } from './cache.mjs';
const cached = createCache();
export const CAZE_AGENDA = 'https://www.agendacazetv.com.br/';
// Verified detail references survive removal from the rotating homepage.
// Scoped to provider event + date; never applied to another round of the same teams.
const VERIFIED_DETAILS = [{ sport: 'soccer', league: 'fra.1', eventId: '401876422', date: '2026-10-26', videoId: 'WHYTOnqWFgE' }];
const CAZE_CHANNEL = 'UCZiYbVptd3PVPf4f6eR6UaQ';
const normalize = value => String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases = new Map([['psg', 'parissaintgermain'], ['sevillafc', 'sevilla'], ['afcbournemouth', 'bournemouth'], ['bayernmunich', 'bayerndemunique'], ['internazionale', 'interdemilao']]);
const teamKey = value => { const key = normalize(value); return aliases.get(key) || key; };
function stringField(text, key) {
  const match = text.match(new RegExp(`\\b${key}:("(?:[^"\\\\]|\\\\.)*")`));
  if (!match) return '';
  try { return JSON.parse(match[1]); } catch { return ''; }
}
export function parseCazeSchedule(html) {
  if (typeof html !== 'string' || html.length > 2_000_000) return [];
  // Read serialized metadata as data, never evaluate source scripts.
  const chunks = html.split(/kind:"youtube#video"/).slice(1, 101);
  return chunks.flatMap(chunk => {
    const id = stringField(chunk, 'id');
    const title = stringField(chunk, 'title');
    const description = stringField(chunk, 'description');
    const date = stringField(chunk, 'scheduledStartTime');
    if (!/^[\w-]{11}$/.test(id) || stringField(chunk, 'channelId') !== CAZE_CHANNEL || !/^AO VIVO:/i.test(title) || !/com imagens/i.test(description) || /reprise|melhores momentos|logo ap[oó]s|geral caz/i.test(title) || !Number.isFinite(Date.parse(date))) return [];
    const pair = title.replace(/^AO VIVO:\s*/i, '').split('|')[0].trim().split(/\s+x\s+/i);
    if (pair.length !== 2) return [];
    return [{ id, title, home: pair[0].trim(), away: pair[1].trim(), date }];
  });
}
export function applyCazeSchedule(matches, schedule) {
  return matches.map(match => {
    if (match.sport !== 'soccer' || match.state === 'finished' || !match.watch) return match;
    const found = schedule.filter(e => teamKey(e.home) === teamKey(match.home.name) && teamKey(e.away) === teamKey(match.away.name) && Math.abs(Date.parse(e.date) - Date.parse(match.date)) <= 90 * 60000);
    if (found.length !== 1) return match; // Ambiguous events stay unconfirmed.
    const event = found[0];
    const caze = { id: 'cazetv', name: 'CazéTV · YouTube', badge: 'CAZÉ', url: `https://www.youtube.com/watch?v=${event.id}`, access: 'free', kind: 'platform', country: 'BR', sourceUrl: event.sourceUrl || CAZE_AGENDA, note: 'Transmissão com imagens anunciada na agenda da CazéTV. Pode haver restrição territorial.' };
    return { ...match, watch: { ...match.watch, scope: 'match', confirmedForMatch: true, brazilStatus: 'listed', links: [...(match.watch.confirmedForMatch ? match.watch.links.filter(l => l.id !== 'cazetv') : []), caze], message: 'Transmissão anunciada para esta partida no Brasil. Confira possíveis mudanças na programação.' } };
  });
}
export async function enrichBroadcasts(matches) {
  if (!matches.some(m => m.sport === 'soccer' && m.state !== 'finished')) return matches;
  const details = VERIFIED_DETAILS.filter(ref => matches.some(m => m.id === ref.eventId && m.sport === ref.sport && m.league === ref.league && m.date.slice(0, 10) === ref.date && m.state !== 'finished'));
  const urls = [CAZE_AGENDA, ...details.map(ref => `${CAZE_AGENDA}watch/${ref.videoId}`)];
  const gePromise = enrichGeBroadcasts(matches);
  const results = await Promise.allSettled(urls.map(url => cached(`caze:${url}`, 300000, async () => {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { Accept: 'text/html' } });
    if (!response.ok) throw new Error('Agenda indisponível');
    const events = parseCazeSchedule(await response.text());
    if (!events.length) throw new Error('Formato da agenda indisponível');
    return events.map(event => ({ ...event, sourceUrl: url }));
  })));
  const events = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value.value);
  // The same video may appear in homepage and detail. Prefer the more specific page.
  const schedule = [...new Map(events.map(e => [e.id, e])).values()];
  return applyCazeSchedule(await gePromise, schedule);
}
