import { createRemoteJWKSet, jwtVerify } from 'jose';
import { authorized } from './featured.mjs';
let urlCache='', keySet;
export function authBaseUrl(){
 const base=process.env.DATABASE_NEON_AUTH_BASE_URL || process.env.NEON_AUTH_BASE_URL || '';
 try {const u=new URL(base);if(u.protocol!=='https:' || !/(^|\.)(neon\.tech|neon\.build)$/.test(u.hostname))return null;return u.toString().replace(/\/$/,'');}catch{return null;}
}
export async function adminAuthorized(header, { allowRecovery = true } = {}) {
 if(allowRecovery && authorized(header)) return true; // temporary recovery path during migration
 const base=authBaseUrl(), email=process.env.ADMIN_EMAIL?.trim().toLowerCase();
 if(!base||!email||typeof header!=='string'||!/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(header)||header.length>16000)return false;
 try {
  if(base!==urlCache){keySet=createRemoteJWKSet(new URL(`${base}/.well-known/jwks.json`));urlCache=base;}
  const origin=new URL(base).origin;
  const {payload}=await jwtVerify(header.slice(7),keySet,{issuer:origin,audience:origin,algorithms:['RS256','ES256','EdDSA'],requiredClaims:['sub','exp','iat']});
  return typeof payload.sub==='string' && !!payload.sub && payload.role!=='anonymous' && typeof payload.email==='string' && payload.email.toLowerCase()===email && payload.emailVerified===true && payload.banned!==true;
 }catch{return false;}
}
