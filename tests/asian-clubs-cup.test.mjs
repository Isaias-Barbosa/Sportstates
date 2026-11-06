import test from 'node:test';
import assert from 'node:assert/strict';
import {asianProfiles,asianImportCandidates,validateAsianProfiles,koreanTeamDetails} from '../server/asian-profiles.mjs';
import {validProfileId,providerTeamId,teamProfileId} from '../server/team-identity.mjs';
import {normalize365Game,normalize365Standings,normalize365Summary,fetch365CompetitionGames} from '../server/365scores.mjs';
import {getWatchOptions,safeWatchUrl} from '../server/watch.mjs';
import {broadcastConsultations} from '../server/broadcast-consultations.mjs';
import {fetchTeamCompetitions} from '../server/team-competitions.mjs';
const game={id:4886996,competitionId:619,sportId:1,startTime:'2026-11-11T10:00:00Z',statusGroup:1,statusText:'Agendado',homeCompetitor:{id:2151,name:'Vissel Kobe',score:-1},awayCompetitor:{id:9133,name:'Machida Zelvia',score:-1}};

test('Asian club snapshot has 32 distinct identities and 20 reviewed Japanese cross-provider mappings',()=>{
  assert.equal(asianProfiles.clubs.length,32);
  const japan=asianProfiles.clubs.filter(c=>c.league==='jpn.1');
  assert.equal(new Set(japan.map(c=>c.alternateProviderIds['365scores'])).size,20);
  const korea=asianProfiles.clubs.filter(c=>c.league==='kor.1');assert.equal(korea.length,12);
  assert.ok(korea.every(c=>c.id==='365-kor-'+c.providerId&&validProfileId(c.id)));
  const broken=structuredClone(asianProfiles);broken.clubs[0].id=broken.clubs[1].id;
  assert.throws(()=>validateAsianProfiles(broken));
});
test('Club import preserves existing profiles and rejects identity collisions',()=>{
  const club=asianProfiles.clubs[0];
  assert.equal(asianImportCandidates([{...club,name:'Nome personalizado'}]).length,31);
  assert.throws(()=>asianImportCandidates([{...club,league:'bra.1'}]),/outra competição/);
});
test('Korean IDs cannot masquerade as ESPN or another sport',()=>{
  assert.equal(providerTeamId('365-kor-9820'),'9820');
  assert.equal(teamProfileId('9820','soccer','kor.1'),'365-kor-9820');
  assert.throws(()=>teamProfileId('365-kor-9820','soccer','jpn.1'));
  assert.throws(()=>teamProfileId('basketball-nbb-9820','soccer','kor.1'));
});
test('Levain Cup fixtures link to the same reviewed club IDs as J1',()=>{
  const match=normalize365Game(game,'jpn.league_cup','Levain Cup');
  assert.equal(match.home.id,'7477');assert.equal(match.away.id,'22167');
  assert.equal(asianProfiles.clubs.find(c=>c.id===match.home.id).name,'Vissel Kobe');
  const unknown=normalize365Game({...game,homeCompetitor:{id:999999,name:'Outra equipe'}},'jpn.league_cup','Levain Cup');
  assert.equal(unknown.home.id,'365-jpn-999999');
  assert.throws(()=>normalize365Summary({game:{...game,competitionId:147}},'jpn.league_cup','Levain Cup'));
});
test('Korean table and fixtures use one canonical identity',()=>{
  const match=normalize365Game({...game,competitionId:618,homeCompetitor:{id:9820,name:'FC Seoul'}},'kor.1','K League 1');
  const table=normalize365Standings({standings:[{competitionId:618,rows:[{position:1,competitor:{id:9820,name:'FC Seoul'}}]}]},'kor.1','K League 1',2026);
  assert.equal(table.groups[0].rows[0].id,match.home.id);
});
test('LiveSoccerTV is a consultation source, never a Brazilian broadcast assertion',()=>{
  for(const league of ['jpn.1','jpn.league_cup','kor.1','bra.1','bra.2','eng.1','esp.1','ger.1','uefa.champions']){
    const watch=getWatchOptions({id:'123',sport:'soccer',league,state:'scheduled',date:'2026-11-05T20:00Z'});
    assert.equal(watch.confirmedForMatch,false);
    assert.equal(watch.consultationLinks.length,1);
    assert.match(watch.consultationLinks[0].note,/Brasil/);
    assert.ok(safeWatchUrl(watch.consultationLinks[0].url));
    assert.ok(!watch.links.some(l=>l.id==='livesoccertv'||l.name==='DAZN Japan'));
  }
  assert.deepEqual(broadcastConsultations({sport:'basketball',league:'nbb'}),[]);
});
test('Japanese competition guides do not assume ESPN or DAZN rights in Brazil',()=>{
  const watch=getWatchOptions({id:'123',sport:'soccer',league:'jpn.1',state:'scheduled'});
  assert.ok(watch.links.some(l=>l.id==='goat'));assert.ok(watch.links.some(l=>l.id==='xsports'));
  assert.ok(!watch.links.some(l=>['disney','dazn','espn'].includes(l.id)));
  assert.equal(watch.confirmedForMatch,false);
});
test('Levain Cup monthly collection is bounded, filtered and deduplicated',async()=>{
  let calls=0;const result=await fetch365CompetitionGames('jpn.league_cup',async()=>{calls++;return {games:[game,{...game,id:4,competitionId:147}]};},'2026-11');
  assert.equal(calls,5);assert.equal(result.games.length,1);assert.equal(result.partial,true);
});
test('Korean team pages and competitions never call the unsupported ESPN provider',async()=>{
  const team=asianProfiles.clubs.find(c=>c.league==='kor.1');
  let calls=0;
  const details=await koreanTeamDetails(team,async url=>{assert.match(url,/webws\.365scores\.com/);calls++;return {games:[]};});
  assert.equal(details.team.id,team.id);assert.equal(details.partial,true);assert.equal(details.coverage.roster,false);assert.equal(calls,5);assert.equal(details.coverage.schedule,true);
  const competitions=await fetchTeamCompetitions(team,{loadJson:()=>{throw Error('Não deve consultar ESPN');}});
  assert.equal(competitions.partial,true);
});
