import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const code = ts.transpileModule(await readFile(new URL('../src/account/client.ts', import.meta.url), 'utf8'), {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const { sessionToken } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const jwt='header.payload.signature';
test('cached Neon session JWT works without set-auth-jwt (including admin users)', async()=>{
 const auth={getSession:async()=>({data:{user:{id:'admin',role:'admin'},session:{token:jwt}}}),token:async()=>{throw Error('must not call token endpoint')}};
 assert.equal(await sessionToken(auth),jwt);
});
test('opaque session token is never sent as an API bearer JWT', async()=>{
 const auth={getSession:async()=>({data:{user:{id:'1'},session:{token:'opaque-session-secret'}}}),token:async()=>({data:{token:jwt}})};
 assert.equal(await sessionToken(auth),jwt);
 auth.token=async()=>({data:{token:'opaque'}});
 assert.equal(await sessionToken(auth),null);
});
test('signed-out and failed sessions cannot reuse a JWT', async()=>{
 assert.equal(await sessionToken({getSession:async()=>({data:null}),token:async()=>{throw Error('unexpected')}}),null);
 assert.equal(await sessionToken({getSession:async()=>({error:{message:'expired'},data:{user:{},session:{token:jwt}}})}),null);
});
