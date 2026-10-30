import { readFile } from "node:fs/promises";
import { resolveShare } from "../server/share-resolve.mjs";
import { injectMetadata } from "../server/share.mjs";
const template = readFile(process.cwd() + "/dist/index.html", "utf8");

export default async function handler(req, res) {
  if (!["GET", "HEAD"].includes(req.method)) {
    res.statusCode = 405;
    res.setHeader("Allow", "GET, HEAD");
    return res.end();
  }

  try {
    const u = new URL(req.url, "https://sportstates.vercel.app");
    const page = u.searchParams.get("page") || "/";
    const original = new URL("/" + page.replace(/^\/+/, ""), "https://sportstates.vercel.app");
    for (const [key, value] of u.searchParams) {
      if (key !== "page") original.searchParams.set(key, value);
    }

    const m = await resolveShare(original.pathname + original.search);

    // 1. Páginas inexistentes / Scans de bots / 404: NUNCA grava no cache da Vercel!
    if (m.kind === "not_found") {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Vercel-CDN-Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      const html = injectMetadata(await template, m);
      return res.end(req.method === "HEAD" ? undefined : html);
    }

    // 2. Determina o TTL no CDN da Vercel com precisão cirúrgica:
    let cdnTtl = "public, max-age=86400, stale-while-revalidate=86400"; // 24h padrão para estáticos

    if (m.kind === "match") {
      if (m.state === "live") {
        // Jogo ao vivo: cache mínimo de 15s para manter delay baixíssimo nas metatags
        cdnTtl = "public, max-age=15";
      } else if (m.state === "finished") {
        // Jogo encerrado: 7 dias (resultado final não muda mais!)
        cdnTtl = "public, max-age=604800, stale-while-revalidate=86400";
      } else {
        // Jogo agendado / futuro: 2 horas
        cdnTtl = "public, max-age=7200, stale-while-revalidate=3600";
      }
    } else if (m.kind === "team") {
      // Página de time individual (/times/:id, ex: /times/7632): 12 horas
      cdnTtl = "public, max-age=43200, stale-while-revalidate=86400";
    } else if (m.kind === "teams") {
      // Lista de times (/times): 24 horas
      cdnTtl = "public, max-age=86400, stale-while-revalidate=86400";
    } else if (m.kind === "standings") {
      // Página de classificação (/classificacoes): 4 horas
      cdnTtl = "public, max-age=14400, stale-while-revalidate=3600";
    } else if (m.kind === "home") {
      // Página principal (/): as metatags de compartilhamento são estáticas (24h no Edge).
      // No browser o usuário recebe no-cache, para o JavaScript sempre buscar placares ao vivo em tempo real!
      cdnTtl = "public, max-age=86400, stale-while-revalidate=86400";
    }

    const html = injectMetadata(await template, m);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Vercel-CDN-Cache-Control", cdnTtl);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(req.method === "HEAD" ? undefined : html);
  } catch (error) {
    console.error("share-html", error.message);
    res.statusCode = 500;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Vercel-CDN-Cache-Control", "no-store");
    res.end("Não foi possível abrir a página. Tente novamente.");
  }
}
