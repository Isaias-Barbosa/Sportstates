import { resolveShare } from "../server/share-resolve.mjs";
import { renderShareImage } from "../server/share-image.mjs";
export default async function handler(req,res) {
  if (!["GET","HEAD"].includes(req.method)) {res.statusCode=405;res.setHeader("Allow","GET, HEAD");return res.end();}
  try {
    const u=new URL(req.url,"https://sportstates.vercel.app");
    const page=u.searchParams.get("page") || "/";
    if(page.length>1000) throw Error("Página inválida");
    const image=renderShareImage(await resolveShare(page));
    res.setHeader("Content-Type","image/png");
    res.setHeader("Cache-Control","public, max-age=60");
    res.setHeader("Vercel-CDN-Cache-Control","public, max-age=60");
    res.setHeader("X-Content-Type-Options","nosniff");
    res.end(req.method==="HEAD" ? undefined : image);
  } catch(error) {console.error("share-image",error.message);res.statusCode=400;res.setHeader("Cache-Control","no-store");res.end("Imagem indisponível");}
}
