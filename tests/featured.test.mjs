import test from 'node:test';
import assert from 'node:assert/strict';
import {authorized, validKey, readFeatured} from '../server/featured.mjs';
import {handler} from '../server/api.mjs';
test('admin requires configured strong-length secret and correct authorization',()=>{
 const secret='0123456789abcdef0123456789abcdef';
 assert.equal(authorized(`Bearer ${secret}`,secret),true);
 for(const [header,key] of [[`Bearer wrong`,secret],[`Bearer ${secret}`,'short'],[secret,secret],[undefined,secret]])assert.equal(authorized(header,key),false);
});
test('featured keys only reference supported provider identifiers',()=>{
 assert.equal(validKey('soccer/eng.1/401879252'),true);
 for(const k of ['soccer/../../x','soccer/eng.1/abc','soccer/unknown/123','hockey/nhl/1/extra',''])assert.equal(validKey(k),false);
});
test('write API rejects unconfigured and unauthenticated requests before network',async()=>{
 const previous=process.env.ADMIN_ACCESS_KEY;let body;
 const res={headers:{},setHeader(k,v){this.headers[k]=v},end(v){body=JSON.parse(v)}};
 try {delete process.env.ADMIN_ACCESS_KEY;await handler({method:'PUT',url:'/api/admin/featured',headers:{}},res);assert.equal(res.statusCode,503);
 process.env.ADMIN_ACCESS_KEY='0123456789abcdef0123456789abcdef';await handler({method:'PUT',url:'/api/admin/featured',headers:{}},res);assert.equal(res.statusCode,401);assert.ok(body.error);
 }finally{if(previous===undefined)delete process.env.ADMIN_ACCESS_KEY;else process.env.ADMIN_ACCESS_KEY=previous;}
});
test('missing storage is explicit without claiming a saved highlight',async()=>{
 const previous=process.env.BLOB_READ_WRITE_TOKEN;delete process.env.BLOB_READ_WRITE_TOKEN;
 try{assert.deepEqual(await readFeatured('2026-10-26'),{date:'2026-10-26',key:null,configured:false});await assert.rejects(()=>readFeatured('bad'));}finally{if(previous!==undefined)process.env.BLOB_READ_WRITE_TOKEN=previous;}
});
