import test from "node:test";
import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { metadata, injectMetadata, pageURL } from "../server/share.mjs";
import { renderShareImage } from "../server/share-image.mjs";
test("home has original identity and safe canonical URL",async()=>{
 const m=await metadata("/?utm_source=chat");
 assert.equal(m.heading,"O JOGO ACONTECE AQUI.");
 assert.equal(m.url,"https://sportstates.vercel.app/");
 assert.throws(()=>pageURL("https://evil.example/"));
});
test("team share identifies profile and escapes untrusted database text",async()=>{
 const m=await metadata("/times/817",{team:async()=>({name:'Time "<&',description:"Um time esportivo"})});
 const html=injectMetadata('<head><title>Old</title><meta name="description" content="Old"/></head>',m);
 assert.match(html,/Time &quot;&lt;&amp;/);
 assert.equal((html.match(/<title>/g)||[]).length,1);
 assert.match(html,/summary_large_image/);
 assert.match(html,/og:image:width" content="1200"/);
});
test("match share uses teams, score, status and competition",async()=>{
 const m=await metadata("/partida/soccer/eng.1/123",{match:async()=>({home:{name:"Liverpool",score:"2"},away:{name:"Chelsea",score:"1"},state:"finished",status:"Encerrado"})});
 assert.equal(m.heading,"Liverpool x Chelsea");assert.equal(m.label,"APITO FINAL");
 assert.match(m.description,/Premier League.*2 x 1.*Encerrado/);
});
test("standings and team filters keep competition context",async()=>{
 for(const path of ["/classificacoes","/times"]){const m=await metadata(path+"?sport=soccer&league=bra.1");assert.match(m.title,/Brasileirão Série A/);assert.match(m.url,/league=bra.1/);}
});
test("unavailable data still provides a valid page preview",async()=>{
 const m=await metadata("/partida/basketball/nba/123");
 assert.match(m.title,/NBA/);assert.match(m.image,/share-image/);
});
test("PNG is a real 1200 by 630 RGB image with complete pixel scanlines",async()=>{
 const png=renderShareImage(await metadata("/"));
 assert.equal(png.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
 assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
 let offset=8,compressed=[];
 while(offset<png.length){const size=png.readUInt32BE(offset);const type=png.toString("ascii",offset+4,offset+8);if(type==="IDAT")compressed.push(png.subarray(offset+8,offset+8+size));offset+=size+12;}
 assert.equal(inflateSync(Buffer.concat(compressed)).length,630*(1200*3+1));
});

test("dynamic metadata replaces generic home tags without conflicting duplicates",async()=>{
 const html=injectMetadata('<head><title>Home</title><meta property="og:title" content="Home"/><meta name="twitter:title" content="Home"/><link rel="canonical" href="/"/></head>',await metadata("/times"));
 assert.equal((html.match(/property="og:title"/g)||[]).length,1);
 assert.equal((html.match(/name="twitter:title"/g)||[]).length,1);
 assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
});
