import { createCache } from './cache.mjs';
const cached = createCache();
export const CAZE_AGENDA = 'https://www.agendacazetv.com.br/';
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
    const caze = { id: 'cazetv', name: 'CazéTV · YouTube', badge: 'CAZÉ', url: `https://www.youtube.com/watch?v=${event.id}`, access: 'free', kind: 'platform', country: 'BR', sourceUrl: CAZE_AGENDA, note: 'Transmissão com imagens anunciada na agenda da CazéTV. Pode haver restrição territorial.' };
    return { ...match, watch: { ...match.watch, scope: 'match', confirmedForMatch: true, brazilStatus: 'listed', links: [...(match.watch.confirmedForMatch ? match.watch.links.filter(l => l.id !== 'cazetv') : []), caze], message: 'Transmissão anunciada para esta partida no Brasil. Confira possíveis mudanças na programação.' } };
  });
}
export async function enrichBroadcasts(matches) {
  if (!matches.some(m => m.sport === 'soccer' && m.state !== 'finished')) return matches;
  try {
    const result = await cached('caze:schedule', 300000, async () => {
      const response = await fetch(CAZE_AGENDA, { signal: AbortSignal.timeout(8000), headers: { Accept: 'text/html' } });
      if (!response.ok) throw new Error('Agenda indisponível');
      const html = await response.text();
      const events = parseCazeSchedule(html);
      if (!events.length) throw new Error('Formato da agenda indisponível');
      return events;
    });
    return applyCazeSchedule(matches, result.value);
  } catch { return matches; } // Missing schedule never means no Brazilian broadcaster.
}
