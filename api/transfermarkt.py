"""Vercel Python Function: read-only, same-origin Transfermarkt API."""
import asyncio
from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qsl, urlsplit
from server.market import handle_market


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        status, body = asyncio.run(handle_market(dict(parse_qsl(urlsplit(self.path).query))))
        self.respond(status, body)

    def respond(self, status, body):
        payload = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "public, s-maxage=3600" if status == 200 and not body.get("warnings") else "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def do_POST(self):
        self.respond(405, {"error": "Apenas leitura (GET)."})

    do_PUT = do_DELETE = do_PATCH = do_POST
