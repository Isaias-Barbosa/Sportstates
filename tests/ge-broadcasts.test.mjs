import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGeSchedule, applyGeSchedule, GE_AGENDA } from '../server/ge-broadcasts.mjs';
const event = { __typename: 'SoccerEvent', match: { id: 123, firstContestant: { popularName: 'Vasco' }, secondContestant: { popularName: 'Flamengo' }, startDate: '2026-10-29', startHour: '20:00:00', liveWatchSources: [{ name: 'Cartola' }, { name: 'Prime Vídeo' }, { name: 'Globo' }, { name: 'globoplay' }, { name: 'Ge TV' }] } };
const html = (events = [event], name = 'Campeonato Brasileiro') => `window.dataSportsSchedule = { sport: ${JSON.stringify({ '2026-10-29': { championshipsAgenda: [{ championship: { name }, future: events, now: [], past: [] }] } })}, multisport: {} };`;
const match = { sport: 'soccer', league: 'bra.1', state: 'scheduled', date: '2026-10-29T23:00:00Z', home: { name: 'Vasco' }, away: { name: 'Flamengo' }, watch: { confirmedForMatch: false, links: [{ id: 'directory' }] } };
test('GE reads actual embedded schema, Brasília timezone, broadcaster allowlist and excludes Cartola', () => {
 const schedule = parseGeSchedule(html()); assert.equal(schedule.length, 1);
 assert.equal(Date.parse(schedule[0].date), Date.parse(match.date));
 assert.deepEqual(schedule[0].channels.map(c => c.id), ['prime', 'globo', 'globoplay', 'getv']);
 const enriched = applyGeSchedule([match], schedule)[0];
 assert.equal(enriched.watch.confirmedForMatch, true);
 assert.ok(enriched.watch.links.every(c => c.sourceUrl === GE_AGENDA));
 assert.ok(!enriched.watch.links.some(c => c.id === 'directory'));
});
test('GE rejects youth competitions, broken or oversized scripts without executing them', () => {
 assert.deepEqual(parseGeSchedule(html([event], 'Copa do Brasil Sub-20')), []);
 assert.deepEqual(parseGeSchedule('window.dataSportsSchedule = { sport: { evil() } };'), []);
 assert.deepEqual(parseGeSchedule(' '.repeat(3_000_001)), []);
});
test('GE requires same league, teams and kickoff; ambiguity and finished games stay unchanged', () => {
 const schedule = parseGeSchedule(html());
 for (const change of [{ league: 'bra.2' }, { date: '2026-10-30T23:00:00Z' }, { home: match.away, away: match.home }, { state: 'finished' }]) {
  const other = { ...match, ...change }; assert.equal(applyGeSchedule([other], schedule)[0], other);
 }
 assert.equal(applyGeSchedule([match], [...schedule, { ...schedule[0], id: 'other' }])[0], match);
 assert.equal(applyGeSchedule([match], [...schedule, ...schedule])[0].watch.confirmedForMatch, true);
});
test('GE preserves confirmed providers and does not mutate original objects', () => {
 const confirmed = { ...match, watch: { confirmedForMatch: true, links: [{ id: 'cazetv' }] } };
 const result = applyGeSchedule([confirmed], parseGeSchedule(html()))[0];
 assert.equal(result.watch.links[0].id, 'cazetv');
 assert.equal(confirmed.watch.links.length, 1);
});
