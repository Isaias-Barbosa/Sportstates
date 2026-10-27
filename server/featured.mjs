import {get,put} from '@vercel/blob';
import {timingSafeEqual,createHash} from 'node:crypto';
import {validDate} from './data.mjs';
import {leagueFor} from './catalog.mjs';
const pathFor=date=>`featured/${date}.json`;
export function authorized(header,secret=process.env.ADMIN_ACCESS_KEY) {
 if(!secret || secret.length<32 || typeof header!=='string' || !header.startsWith('Bearer ')) return false;
 const hash=x=>createHash('sha256').update(x).digest();
 return timingSafeEqual(hash(header.slice(7)),hash(secret));
}
export async function readFeatured(date) {
 if(!validDate(date)) throw new Error('Data inválida.');
 if(!process.env.BLOB_READ_WRITE_TOKEN) return {date,key:null,configured:false};
 const file=await get(pathFor(date),{access:'private',useCache:false});
 if(!file||file.statusCode!==200) return {date,key:null,configured:true};
 const data=JSON.parse(await new Response(file.stream).text());
 return {date,key:typeof data.key==='string'?data.key:null,configured:true};
}
export async function saveFeatured(date,key) {
 if(!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('Armazenamento não configurado.');
 await put(pathFor(date),JSON.stringify({date,key}),{access:'private',contentType:'application/json',allowOverwrite:true,addRandomSuffix:false});
}
export function validKey(key) {
 if(typeof key!=='string')return false;
 const parts=key.split('/');
 return parts.length===3 && !!leagueFor(parts[0],parts[1]) && /^\d{1,15}$/.test(parts[2]);
}
