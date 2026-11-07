import test from 'node:test';
import assert from 'node:assert/strict';
import {russianProfiles,russianClub,russianImportCandidates,validateRussianProfiles} from '../server/russian-profiles.mjs';
import {listTeams,getTeam} from '../server/teams.mjs';
test('Russian clubs retain ESPN identities and preserve existing admin records',()=>{
 assert.equal(russianProfiles.clubs.length,16);
 assert.equal(russianClub('2533').name,'Zenit St Petersburg');
 assert.ok(!russianImportCandidates([{id:'2533'}]).some(c=>c.id==='2533'));
 assert.throws(()=>validateRussianProfiles({...russianProfiles,clubs:russianProfiles.clubs.slice(1)}));
});
test('Russian clubs are available in lists and detail without database credentials',async()=>{
 const old=process.env.DATABASE_URL;
 delete process.env.DATABASE_URL;
 try {
  assert.equal((await listTeams()).filter(c=>c.league==='rus.1').length,16);
  assert.equal((await getTeam('2533')).league,'rus.1');
 } finally {if(old!==undefined)process.env.DATABASE_URL=old;}
});
