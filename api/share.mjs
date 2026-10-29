import { readFile } from "node:fs/promises";
import { resolveShare } from "../server/share-resolve.mjs";
import { injectMetadata } from "../server/share.mjs";
const template = readFile(process.cwd()+"/dist/index.html","utf8");
export default async function handler(req,res) {
  if (!["GET","HEAD"].includes(req.method)) { res.statusCode=405; res.setHeader("Allow","GET, HEAD"); return res.end(); }
  try {
    const u=new URL(req.url,"https://sportstates.vercel.app");
    const page=u.searchParams.get("page") || "/";
    const original=new URL("/"+page.replace(/^\/+/, ""),"https://sportstates.vercel.app");
    for(const [key,value] of u.searchParams) if(key!=="page") original.searchParams.set(key,value);
    const m=await resolveShare(original.pathname+original.search);
    const html=injectMetadata(await template,m);
    res.setHeader("Content-Type","text/html; charset=utf-8");
    res.setHeader("Cache-Control","no-cache");
    res.setHeader("Vercel-CDN-Cache-Control",m.kind==="match" ? "public, max-age=15" : "public, max-age=300");
    res.setHeader("X-Content-Type-Options","nosniff");
    res.end(req.method==="HEAD" ? undefined : html);
  } catch(error) {
    console.error("share-html",error.message);
    res.statusCode=500;
    res.setHeader("Cache-Control","no-store");
    res.end("Não foi possível abrir a página. Tente novamente.");
  }
}
