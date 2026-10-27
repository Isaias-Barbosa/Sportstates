import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeTeamSearch} from '../server/team-search.mjs';
const feed={sports:[{leagues:[{teams:[{team:{id:'103',displayName:'AC Milan',shortDisplayName:'Milan',location:'AC Milan',color:'e4002b',alternateColor:'ffffff',logos:[{href:'https://a.espncdn.com/a.png',rel:['default']}]}},{team:{id:'106',displayName:'Internazionale',location:'Milão',logos:[{href:'https://example.com/x'}]}},{team:{id:'../123',displayName:'Milan falso'}}]}]}]};
test('busca por nome e retorna os dados compatíveis com ESPN',()=>{const r=normalizeTeamSearch(feed,{sport:'soccer',league:'ita.1',query:'milan'});assert.equal(r.length,1);assert.equal(r[0].id,'103');assert.equal(r[0].city,'');assert.equal(r[0].logo,'https://a.espncdn.com/a.png');assert.deepEqual(r[0].colors,['#e4002b','#ffffff']);});
test('ignora acentos, links inesperados e ligas inválidas',()=>{const r=normalizeTeamSearch(feed,{sport:'soccer',league:'ita.1',query:'milao'});assert.equal(r[0].name,'Internazionale');assert.equal(r[0].logo,'');assert.deepEqual(normalizeTeamSearch(feed,{sport:'soccer',league:'../../',query:'milan'}),[]);});
test('busca exige autenticação e filtra apenas a liga selecionada',async()=>{const {handler}=await import('../server/api.mjs');const secret=process.env.ADMIN_ACCESS_KEY,original=globalThis.fetch;process.env.ADMIN_ACCESS_KEY='x'.repeat(32);let requested='';globalThis.fetch=async u=>{requested=String(u);return {ok:true,json:async()=>feed}};function response(){return {headers:{},setHeader(k,v){this.headers[k]=v},end(value){this.body=JSON.parse(value)}}}try{let denied=response();await handler({url:'/api/admin/team-search?sport=soccer&league=ita.1&q=milan',method:'GET',headers:{}},denied);assert.equal(denied.statusCode,401);let ok=response();await handler({url:'/api/admin/team-search?sport=soccer&league=ita.1&q=milan',method:'GET',headers:{authorization:'Bearer '+process.env.ADMIN_ACCESS_KEY}},ok);assert.equal(ok.statusCode,200);assert.equal(ok.body.teams[0].id,'103');assert.match(requested,/soccer\/ita\.1\/teams/);}finally{globalThis.fetch=original;if(secret===undefined)delete process.env.ADMIN_ACCESS_KEY;else process.env.ADMIN_ACCESS_KEY=secret;}});

test('TheSportsDB não usa seu próprio ID como ID ESPN e preserva apenas URLs de imagem da fonte', async()=>{
 const {normalizeSportsDBSearch}=await import('../server/team-search.mjs');
 const raw={teams:[{idTeam:'9999',strSport:'Soccer',strTeam:'AC Milan',strLeague:'Italian Serie A',strBadge:'https://r2.thesportsdb.com/images/milan.png',strStadiumThumb:'https://example.com/fake.png',strStadium:'San Siro',strDescriptionPT:'Clube italiano',strWebsite:'www.acmilan.com'}, {idTeam:'888',strSport:'Basketball',strTeam:'AC Milan'}]};
 const [team,...others]=normalizeSportsDBSearch(raw,{sport:'soccer',league:'ita.1',query:'milan'});
 assert.equal(others.length,0);assert.equal(team.id,'');assert.equal(team.sourceId,'9999');assert.equal(team.logo,'https://r2.thesportsdb.com/images/milan.png');assert.equal(team.stadium_image,'');assert.equal(team.website,'https://www.acmilan.com/');assert.equal(team.sourceLeague,'Italian Serie A');
});
test('consulta a fonte alternativa quando a ESPN não encontra o time ou falha',async()=>{
 const {handler}=await import('../server/api.mjs');const secret=process.env.ADMIN_ACCESS_KEY,original=globalThis.fetch;process.env.ADMIN_ACCESS_KEY='z'.repeat(32);const calls=[];
 globalThis.fetch=async u=>{calls.push(String(u));if(String(u).includes('site.api.espn.com'))return {ok:false};return {ok:true,json:async()=>({teams:[{idTeam:'42',strSport:'Soccer',strTeam:'Equipe Exemplo',strLeague:'Outra liga'}]})}};
 const res={setHeader(){},end(v){this.body=JSON.parse(v)}};
 try{await handler({url:'/api/admin/team-search?sport=soccer&league=eng.1&q=Equipe%20Exemplo',method:'GET',headers:{authorization:'Bearer '+process.env.ADMIN_ACCESS_KEY}},res);assert.equal(res.statusCode,200);assert.equal(calls.length,2);assert.equal(res.body.teams[0].id,'');assert.equal(res.body.teams[0].source,'TheSportsDB');assert.deepEqual(res.body.unavailable,['ESPN']);}
 finally{globalThis.fetch=original;if(secret===undefined)delete process.env.ADMIN_ACCESS_KEY;else process.env.ADMIN_ACCESS_KEY=secret;}
});
test('usa a segunda fonte quando a ESPN responde sem resultados',async()=>{
 const {handler}=await import('../server/api.mjs');const previous=process.env.ADMIN_ACCESS_KEY,original=globalThis.fetch;process.env.ADMIN_ACCESS_KEY='y'.repeat(32);const calls=[];
 globalThis.fetch=async u=>{calls.push(String(u));return String(u).includes('site.api.espn.com')?{ok:true,json:async()=>({sports:[{leagues:[{teams:[]}]}]})}:{ok:true,json:async()=>({teams:[{idTeam:'77',strSport:'Soccer',strTeam:'Clube Alternativo'}]})}};
 const res={setHeader(){},end(v){this.body=JSON.parse(v)}};
 try{await handler({url:'/api/admin/team-search?sport=soccer&league=esp.1&q=Clube%20Alternativo',method:'GET',headers:{authorization:'Bearer '+process.env.ADMIN_ACCESS_KEY}},res);assert.equal(res.statusCode,200);assert.equal(calls.length,2);assert.equal(res.body.teams[0].name,'Clube Alternativo');assert.deepEqual(res.body.unavailable,[]);}
 finally{globalThis.fetch=original;if(previous===undefined)delete process.env.ADMIN_ACCESS_KEY;else process.env.ADMIN_ACCESS_KEY=previous;}
});
