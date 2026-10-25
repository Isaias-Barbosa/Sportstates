"""Transfermarkt adapter shared by local HTTP and the Vercel Python function.

The club endpoint is a paged view of histories involving members of today's squad,
not a complete club transfer window. No public demo or Docker daemon is required.
"""
import asyncio
from collections import OrderedDict
from datetime import UTC, datetime
import os
import re
import threading
import time
from urllib.parse import quote, urlparse

import httpx
from transfermarkt_api import Transfermarkt
from transfermarkt_api.exceptions import NotFound, UpstreamBlocked, UpstreamTimeout
from transfermarkt_api.tfmkt import TfmktClient

PAGE_SIZE = 6
_CACHE = OrderedDict()
_LOCK = threading.Lock()
TYPES = {"transfer": "Transferência", "freeTransfer": "Sem custo", "loan": "Empréstimo", "endOfLoan": "Fim de empréstimo", "internal": "Transferência interna"}


class MarketError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def timestamp(value=None):
    if value is None:
        return datetime.now(UTC).isoformat()
    if isinstance(value, str):
        value = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return value.replace(tzinfo=value.tzinfo or UTC).astimezone(UTC).isoformat()


async def cached(key, ttl, loader):
    with _LOCK:
        entry = _CACHE.get(key)
        if entry and time.monotonic() - entry[0] < ttl:
            return entry[1]
    value = await loader()
    with _LOCK:
        _CACHE[key] = (time.monotonic(), value)
        _CACHE.move_to_end(key)
        while len(_CACHE) > 512:
            _CACHE.popitem(last=False)
    return value


class SDKAdapter:
    """Use the SDK and its low-level squad reader to avoid full-squad history fan-out."""
    async def __aenter__(self):
        self.sdk = Transfermarkt(timeout=12, max_concurrency=3)
        self.raw = TfmktClient(timeout=12, max_concurrency=3)
        return self

    async def __aexit__(self, *args):
        await self.sdk.aclose()
        await self.raw.aclose()

    async def search(self, name, page):
        result = await self.sdk.search_clubs(name, page_number=page)
        return result.model_dump(mode="json", by_alias=True)

    async def squad(self, club):
        # club_players() in v5 fetches every member's full history internally.
        # Read squad IDs and batched names instead; histories are limited by our page.
        squad = await self.raw.club_squad(club)
        members = squad.get("squad")
        if not isinstance(members, list):
            raise MarketError(502, "A fonte retornou um elenco inválido.")
        ids = list(dict.fromkeys(str(p["playerId"]) for p in members))
        if len(ids) > 100:
            raise MarketError(502, "O elenco retornado excede o limite desta consulta.")
        details = await self.raw.players(ids) if ids else {}
        return {"players": [{"id": pid, "name": details.get(pid, {}).get("name") or f"Jogador #{pid}"} for pid in ids], "updatedAt": timestamp()}

    async def history(self, player):
        result = await self.sdk.player_transfers(player)
        return result.model_dump(mode="json", by_alias=True)


class RemoteAdapter:
    """Optional self-hosted API v5. Never default to its rate-limited demo."""
    def __init__(self, base):
        parsed = urlparse(base)
        if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.query or parsed.fragment or parsed.username:
            raise MarketError(503, "A URL do serviço Transfermarkt está inválida no servidor.")
        if os.getenv("VERCEL") and parsed.hostname in ("localhost", "127.0.0.1", "::1"):
            raise MarketError(503, "Remova TRANSFERMARKT_API_URL local da Vercel para usar o SDK integrado.")
        self.base = base.rstrip("/")

    async def __aenter__(self):
        self.client = httpx.AsyncClient(timeout=15, follow_redirects=False)
        return self

    async def __aexit__(self, *args):
        await self.client.aclose()

    async def get(self, path):
        response = await self.client.get(self.base + path)
        if response.status_code != 200:
            raise MarketError(response.status_code if response.status_code in (404, 429, 503, 504) else 502, "O serviço Transfermarkt não conseguiu concluir a consulta.")
        try:
            result = response.json()
        except ValueError as error:
            raise MarketError(502, "O serviço Transfermarkt retornou uma resposta inválida.") from error
        if not isinstance(result, dict):
            raise MarketError(502, "O serviço Transfermarkt retornou uma resposta inválida.")
        return result

    async def search(self, name, page):
        return await self.get(f"/clubs/search/{quote(name, safe='')}?page_number={page}")

    async def squad(self, club):
        return await self.get(f"/clubs/{club}/players")

    async def history(self, player):
        return await self.get(f"/players/{player}/transfers")


def normalized_history(player, raw, club):
    records = raw.get("transfers")
    if not isinstance(records, list):
        raise MarketError(502, "A fonte retornou um histórico inválido.")
    result = []
    for t in records:
        source, target = t.get("clubFrom") or {}, t.get("clubTo") or {}
        # Do not display a player's unrelated former transfers as this club's market.
        if str(source.get("id")) != club and str(target.get("id")) != club:
            continue
        result.append({"id": str(t.get("id") or f'{player["id"]}:{t.get("date")}:{source.get("id")}:{target.get("id")}'),
            "player": player.get("name") or "Jogador", "playerId": str(player["id"]),
            "date": t.get("date"), "type": TYPES.get(t.get("transferType"), "Não informado"),
            "from": source.get("name") or "Não informado", "to": target.get("name") or "Não informado",
            "fee": t.get("fee"), "marketValue": t.get("marketValue"), "currency": "EUR", "upcoming": bool(t.get("upcoming"))})
    return result


def integer(value, maximum=100):
    if not re.fullmatch(r"[1-9]\d{0,6}", value or "") or int(value) > maximum:
        raise MarketError(400, "Página inválida.")
    return int(value)


async def market_route(query, adapter=None):
    operation = query.get("operation", "transfers")
    if operation not in ("search", "transfers"):
        raise MarketError(400, "Operação inválida.")
    page = integer(query.get("page", "1"))
    club = query.get("tmid", "")
    name = query.get("q", "").strip()
    if operation == "search" and not 2 <= len(name) <= 80:
        raise MarketError(400, "Busque um clube usando entre 2 e 80 caracteres.")
    if operation == "transfers" and not re.fullmatch(r"[1-9]\d{0,9}", club):
        raise MarketError(400, "Selecione um clube com ID válido do Transfermarkt.")
    label = query.get("label", f"Clube #{club}")[:100]
    base = os.getenv("TRANSFERMARKT_API_URL", "").strip()
    provider = adapter or (RemoteAdapter(base) if base else SDKAdapter())
    namespace = base or "sdk-v5"
    async with provider as client:
        if operation == "search":
            raw = await cached((namespace, "search", name.casefold(), page), 3600, lambda: client.search(name, page))
            if not isinstance(raw.get("results"), list):
                raise MarketError(502, "A fonte retornou uma busca inválida.")
            return {"configured": True, "source": "Transfermarkt", "results": [{"id": str(c["id"]), "name": c.get("name") or "Clube", "country": c.get("country")} for c in raw["results"]], "page": page, "lastPage": raw.get("lastPageNumber", page), "fetchedAt": timestamp(raw.get("updatedAt"))}
        squad = await cached((namespace, "squad", club), 21600, lambda: client.squad(club))
        players = squad.get("players")
        if not isinstance(players, list):
            raise MarketError(502, "A fonte retornou um elenco inválido.")
        unique = {str(p["id"]): p for p in players}
        players = list(unique.values())
        last_page = max(1, (len(players) + PAGE_SIZE - 1) // PAGE_SIZE)
        if page > last_page:
            raise MarketError(400, "A página solicitada não existe neste elenco.")
        selected = players[(page-1)*PAGE_SIZE:page*PAGE_SIZE]
        semaphore = asyncio.Semaphore(3)
        async def history(p):
            async with semaphore:
                raw = await cached((namespace, "player", str(p["id"])), 21600, lambda: client.history(str(p["id"])))
                return normalized_history(p, raw, club), timestamp(raw.get("updatedAt"))
        outcomes = await asyncio.gather(*(history(p) for p in selected), return_exceptions=True)
        successes = [v for v in outcomes if not isinstance(v, BaseException)]
        failures = [v for v in outcomes if isinstance(v, BaseException)]
        if failures and not successes:
            raise failures[0]
        transfers = {t["id"]: t for rows, _ in successes for t in rows}
        ordered = sorted(transfers.values(), key=lambda t: t["date"] or "", reverse=True)
        return {"configured": True, "source": "Transfermarkt", "clubId": club, "clubLabel": label, "transfers": ordered,
            "fetchedAt": min([timestamp(squad.get("updatedAt"))] + [stamp for _, stamp in successes]),
            "page": page, "lastPage": last_page, "totalPlayers": len(players), "queriedPlayers": len(selected), "failedPlayers": len(failures),
            "warnings": ["Não foi possível consultar parte dos jogadores desta página. Tente atualizá-la."] if failures else [],
            "coverage": "Histórico relacionado ao clube dos jogadores do elenco atual. Não inclui todas as saídas nem todo o mercado do clube."}


async def handle_market(query):
    try:
        async with asyncio.timeout(90):
            return 200, await market_route(query)
    except MarketError as error:
        return error.status, {"error": str(error)}
    except NotFound:
        return 404, {"error": "Clube ou jogador não encontrado na fonte."}
    except UpstreamBlocked:
        return 503, {"error": "O Transfermarkt recusou o acesso do servidor. Tente novamente mais tarde.", "retryable": True}
    except (UpstreamTimeout, httpx.TimeoutException, TimeoutError):
        return 504, {"error": "A consulta ao Transfermarkt excedeu o tempo disponível. Tente novamente.", "retryable": True}
    except Exception as error:
        # Log only the class; upstream exceptions can contain configured service URLs.
        print(f"Transfermarkt error: {type(error).__name__}", flush=True)
        return 502, {"error": "Não foi possível consultar o Transfermarkt. A fonte está temporariamente indisponível.", "retryable": True}
