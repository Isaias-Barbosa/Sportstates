import { resolveShare } from "../server/share-resolve.mjs";
import { renderShareImage } from "../server/share-image.mjs";

export default async function handler(req, res) {
  if (!["GET", "HEAD"].includes(req.method)) {
    res.statusCode = 405;
    res.setHeader("Allow", "GET, HEAD");
    return res.end();
  }

  try {
    const u = new URL(req.url, "https://sportstates.vercel.app");
    const page = u.searchParams.get("page") || "/";
    if (page.length > 1000) throw Error("Página inválida");

    const meta = await resolveShare(page);

    // Se for página 404 / rota inválida: não grava nada no cache da Vercel!
    if (meta.kind === "not_found") {
      res.statusCode = 404;
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Vercel-CDN-Cache-Control", "no-store");
      return res.end();
    }

    // Cache estratégico de imagens:
    // - Jogo ao vivo: 30 segundos (para atualizar o placar na imagem do card de redes sociais)
    // - Todas as outras páginas (Home, Times, Classificação, Sobre, Jogo Finalizado): 7 dias!
    let imgCache = "public, max-age=604800, stale-while-revalidate=86400"; // 7 dias
    if (meta.kind === "match" && meta.state === "live") {
      imgCache = "public, max-age=30";
    }

    const image = renderShareImage(meta);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", imgCache);
    res.setHeader("Vercel-CDN-Cache-Control", imgCache);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(req.method === "HEAD" ? undefined : image);
  } catch (error) {
    console.error("share-image", error.message);
    res.statusCode = 400;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Vercel-CDN-Cache-Control", "no-store");
    res.end("Imagem indisponível");
  }
}
