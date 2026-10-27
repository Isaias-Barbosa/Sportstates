import test from 'node:test';
import assert from 'node:assert/strict';
import { getTeam, saveTeam } from '../server/teams.mjs';
import { handler } from '../server/api.mjs';
test('invalid team IDs are rejected without a database', async()=>{assert.equal(await getTeam('../x'), null); await assert.rejects(saveTeam({id:'bad',name:'A'}), /campos/);});
test('administrative team writes require the existing secret', async()=>{const previous=process.env.ADMIN_ACCESS_KEY;process.env.ADMIN_ACCESS_KEY='x'.repeat(32);let data;const res={setHeader(){},end(body){data=JSON.parse(body)}};try{await handler({url:'/api/admin/teams',method:'PUT',headers:{},body:{id:'1',name:'Time'}},res);assert.equal(res.statusCode,401);assert.match(data.error,/inválida/);}finally{if(previous===undefined)delete process.env.ADMIN_ACCESS_KEY;else process.env.ADMIN_ACCESS_KEY=previous;}});
test('unconfigured Neon fails explicitly',async()=>{const old=process.env.DATABASE_URL;delete process.env.DATABASE_URL;try{await assert.rejects(getTeam('1'),/Neon não configurado/)}finally{if(old!==undefined)process.env.DATABASE_URL=old;}});
