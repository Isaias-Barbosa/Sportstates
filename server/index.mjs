import http from "node:http";
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
http
  .createServer(async (req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
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
