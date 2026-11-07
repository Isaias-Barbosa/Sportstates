import test from 'node:test';
import assert from 'node:assert/strict';
import {SPORTS, SOCCER_REGIONS, SOCCER_TEAM_LEAGUES, SOCCER_DOMESTIC_TOURNAMENTS} from '../server/catalog.mjs';
import {KNOCKOUT_LEAGUES} from '../server/tournaments.mjs';
import {fetch365CompetitionGames, competitionGamesUrl} from '../server/365scores.mjs';
import {getWatchOptions, matchChannels} from '../server/watch.mjs';
test('Russia exposes league and cup, with cup knockout support',()=>{
 const leagues=SPORTS.find(s=>s.id==='soccer').leagues;
 for(const id of ['rus.1','rus.cup']) assert.ok(leagues.some(l=>l[0]===id));
 assert.deepEqual(SOCCER_REGIONS.find(r=>r.id==='russia').competitions,['rus.1','rus.cup']);
 assert.ok(SOCCER_TEAM_LEAGUES.has('rus.1'));
 assert.ok(KNOCKOUT_LEAGUES.has('rus.cup'));
 assert.ok(!SOCCER_DOMESTIC_TOURNAMENTS.includes('rus.cup'), 'Cup must stay visible even when the current month has no completed fixtures');
 assert.ok(!KNOCKOUT_LEAGUES.has('rus.1'));
});
test('Russian Cup uses dated provider 91 and rejects unrelated global games',async()=>{
 const url=new URL(competitionGamesUrl('rus.cup','2026-11-24'));
 assert.equal(url.searchParams.get('competitions'),'91');
 assert.equal(url.searchParams.get('startDate'),'24/11/2026');
 const result=await fetch365CompetitionGames('rus.cup',async()=>({games:[{id:1,competitionId:91},{id:2,competitionId:113}]}),'2026-11-24');
 assert.deepEqual(result.games.map(g=>g.id),[1]);
 assert.equal(result.partial,true);
});
test('Russian broadcast guides never confirm fixture or infer ESPN rights',()=>{
 const match={sport:'soccer',state:'scheduled',date:'2026-11-07T16:30:00Z'};
 const league=getWatchOptions({...match,league:'rus.1'});
 assert.equal(league.confirmedForMatch,false);
 assert.ok(league.links.some(l=>l.id==='canal-gol-brasil'));
 assert.ok(league.links.some(l=>l.id==='bandsports'));
 assert.ok(!league.links.some(l=>/espn/i.test(l.name)));
 const cup=getWatchOptions({...match,league:'rus.cup'});
 assert.equal(cup.confirmedForMatch,false);
 assert.ok(!cup.links.some(l=>['bandsports','canal-gol-brasil'].includes(l.id)));
});
test('Brazil feed can identify Canal Gol independently of GOAT',()=>{
 const links=matchChannels({geoBroadcasts:[{market:{type:'National'},region:'br',names:['Canal Gol Brasil']}]});
 assert.deepEqual(links.map(l=>l.id), ['canal-gol-brasil']);
});
