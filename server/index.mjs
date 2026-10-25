import http from "node:http";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { handler } from "./api.mjs";
const prod = process.argv.includes("--production");
const portFlag = process.argv.indexOf("--port");
const port = Number(
  process.env.PORT || (portFlag >= 0 ? process.argv[portFlag + 1] : 3000),
);
const vite = prod
  ? null
  : await (
      await import("vite")
    ).createServer({
      server: { middlewareMode: true, allowedHosts: ["terminal.local"] },
      appType: "spa",
    });
const root = path.resolve("dist");
// Python SDK is a native Vercel function in production hosting. Locally, run
// its HTTP counterpart and proxy it so the browser always uses the same origin.
const marketPort = Number(process.env.MARKET_PORT || 8001);
const market = spawn(
  process.env.PYTHON || "python3",
  ["-m", "server.market_server"],
  { stdio: "inherit" },
);
market.on("error", () =>
  console.error(
    "Não foi possível iniciar o backend Python. Instale requirements.txt e defina PYTHON se necessário.",
  ),
);
const stopMarket = () => {
  market.kill();
  process.exit();
};
process.once("SIGINT", stopMarket);
process.once("SIGTERM", stopMarket);
process.once("exit", () => market.kill());
http
  .createServer(async (req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname === "/api/market" || pathname === "/api/transfermarkt") {
      if (req.method !== "GET") {
        res
          .writeHead(405, { Allow: "GET", "Content-Type": "application/json" })
          .end(JSON.stringify({ error: "Apenas leitura (GET)." }));
        return;
      }
      try {
        const upstream = await fetch(
          `http://127.0.0.1:${marketPort}${req.url}`,
          { signal: AbortSignal.timeout(95000) },
        );
        res.statusCode = upstream.status;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader(
          "Cache-Control",
          upstream.headers.get("cache-control") || "no-store",
        );
        res.end(await upstream.text());
      } catch {
        res
          .writeHead(503, { "Content-Type": "application/json" })
          .end(
            JSON.stringify({
              error:
                "Backend Python indisponível. Instale requirements.txt e reinicie o servidor.",
            }),
          );
      }
      return;
    }
    if (pathname.startsWith("/api/")) return handler(req, res);
    if (vite) return vite.middlewares(req, res);
    try {
      const file = path.resolve(root, "." + decodeURIComponent(pathname));
      if (!file.startsWith(root + path.sep) && file !== root) {
        res.writeHead(403).end();
        return;
      }
      const ext = path.extname(file);
      const types = {
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".html": "text/html",
      };
      const data = await readFile(ext ? file : path.join(root, "index.html"));
      res.setHeader("Content-Type", types[ext] || "text/html");
      res.end(data);
    } catch {
      res.writeHead(404).end("Não encontrado");
    }
  })
  .listen(port, "0.0.0.0", () =>
    console.log(`Sportstates: http://localhost:${port}`),
  );
