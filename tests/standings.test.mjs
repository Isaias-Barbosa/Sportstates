import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStandings } from '../server/standings.mjs';
import { route } from '../server/api.mjs';

test('normalizes nested groups, provider order and zero statistics', () => {
  const groups = normalizeStandings({children:[{name:'Grupo A',standings:{entries:[{team:{id:'2',displayName:'Time B',logos:[{href:'https://example.com/b.png'}]},stats:[{name:'points',value:0},{name:'rank',displayValue:'1'}]},{team:{id:'1',displayName:'Time A'},stats:[{name:'points',displayValue:'3'}]}]}}]});
  assert.equal(groups[0].name, 'Grupo A');
  assert.deepEqual(groups[0].rows.map(x=>x.id), ['2','1']);
  assert.equal(groups[0].rows[0].stats.points, '0');
  assert.equal(groups[0].rows[0].logo, 'https://example.com/b.png');
});
test('catalog includes both Brazilian divisions and rejects invalid standings', async () => {
  const [, catalog] = await route(new URL('http://localhost/api/competitions'));
  const soccer = catalog.sports.find(s=>s.id==='soccer');
  assert.ok(soccer.leagues.some(l=>l.id==='bra.1'));
  assert.ok(soccer.leagues.some(l=>l.id==='bra.2'));
  assert.equal((await route(new URL('http://localhost/api/standings?sport=../../&league=foo')))[0],400);
});
test('standings route requests the selected competition and normalizes its response', async () => {
  const original = globalThis.fetch;
  let requested;
  globalThis.fetch = async url => { requested = new URL(url); return {ok:true,json:async()=>({children:[{name:'Tabela',standings:{entries:[{team:{id:'1',displayName:'Equipe'},stats:[{name:'points',displayValue:'10'}]}]}}]})}; };
  try {
    const [status, result] = await route(new URL('http://localhost/api/standings?sport=soccer&league=bra.2'));
    assert.equal(status,200);
    assert.match(requested.pathname,/soccer\/bra\.2\/standings$/);
    assert.equal(result.groups[0].rows[0].stats.points,'10');
  } finally {globalThis.fetch=original;}
});
test('regiões apresentam competições nacionais e continentais sem duplicar o catálogo', async () => {
  const [, catalog] = await route(new URL('http://localhost/api/competitions'));
  const leagues = catalog.sports.find(s => s.id === 'soccer').leagues;
  const ids = leagues.map(l => l.id);
  assert.equal(new Set(ids).size, ids.length);
  const brasil = catalog.soccerRegions.find(r => r.id === 'brasil');
  const england = catalog.soccerRegions.find(r => r.id === 'inglaterra');
  assert.ok(['bra.copa_do_brazil','conmebol.libertadores','conmebol.sudamericana'].every(id => brasil.competitions.includes(id)));
  assert.ok(['eng.fa','eng.league_cup','uefa.champions'].every(id => england.competitions.includes(id)));
  assert.ok(ids.includes('usa.1') && ids.includes('ksa.1'));
  for (const region of catalog.soccerRegions) for (const id of region.competitions) assert.ok(ids.includes(id), id);
});
