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
test('regiões locais e torneios internacionais ficam separados, sem perder competições', async () => {
  const [, catalog] = await route(new URL('http://localhost/api/competitions'));
  const leagues = catalog.sports.find(s => s.id === 'soccer').leagues;
  const ids = leagues.map(l => l.id);
  assert.equal(new Set(ids).size, ids.length);
  const brasil = catalog.soccerRegions.find(r => r.id === 'brasil');
  const england = catalog.soccerRegions.find(r => r.id === 'inglaterra');
  assert.ok(['bra.1','bra.2','bra.copa_do_brazil','bra.camp.carioca','bra.camp.paulista','bra.camp.gaucho','bra.camp.mineiro'].every(id => brasil.competitions.includes(id)));
  assert.ok(!brasil.competitions.includes('conmebol.libertadores'));
  assert.deepEqual(england.competitions,['eng.1','eng.fa','eng.league_cup']);
  const americas=catalog.soccerInternationalGroups.find(g=>g.id==='americas');
  const internationals=catalog.soccerInternationalGroups.find(g=>g.id==='international');
  assert.ok(['conmebol.libertadores','conmebol.sudamericana','concacaf.champions','concacaf.leagues.cup'].every(id=>americas.competitions.includes(id)));
  assert.ok(['uefa.champions','uefa.europa','uefa.europa.conf'].every(id=>internationals.competitions.includes(id)));
  assert.ok(ids.includes('usa.1') && ids.includes('ksa.1'));
  const grouped=[...catalog.soccerRegions,...catalog.soccerInternationalGroups].flatMap(g=>g.competitions);
  assert.equal(new Set(grouped).size,grouped.length);
  assert.deepEqual([...grouped].sort(),[...ids].sort());
  assert.ok(leagues.find(l=>l.id==='usa.1').teamLeague);
  assert.ok(!leagues.find(l=>l.id==='uefa.champions').teamLeague);
  assert.ok(leagues.find(l=>l.id==='concacaf.champions').hasKnockout);
});
