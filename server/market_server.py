"""Local counterpart of the Vercel function, launched by npm run dev/start."""
from http.server import ThreadingHTTPServer
import os
from api.transfermarkt import handler

if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", int(os.getenv("MARKET_PORT", "8001"))), handler).serve_forever()
