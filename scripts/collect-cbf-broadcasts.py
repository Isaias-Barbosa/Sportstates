"""Collect a 2026 Brasileirão round as JSON for review outside the scoreboard."""
import argparse
from datetime import datetime
from html import unescape
import json
import re
import sys
from time import sleep
from urllib.request import HTTPRedirectHandler, Request, build_opener
from zoneinfo import ZoneInfo

ORIGIN = "https://www.cbf.com.br"
COMPETITIONS = {"bra.1": ("a", "1260611"), "bra.2": ("b", "1260612")}
MAX_BYTES = 2 * 1024 * 1024
SAO_PAULO = ZoneInfo("America/Sao_Paulo")


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def fetch(url, accept):
    request = Request(url, headers={"Accept": accept})
    with build_opener(NoRedirect()).open(request, timeout=8) as response:
        data = response.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError("Resposta da CBF acima do limite")
    return data.decode("utf-8")


def parse_channels(html, series, round_number, reference):
    title = re.search(r"<title>([^<]+)</title>", html)
    if not title or f"Série {series.upper()} ㆍ 2026" not in unescape(title[1]):
        raise ValueError("Competição ou temporada divergente na página da CBF")
    pattern = (
        rf"Rodada\s*(?:<!--\s*-->)?{round_number}(?:<!--\s*-->)?\s*\|\s*Jogo:\s*"
        rf"(?:<!--\s*-->)?0*{reference}</span>(?:<span>([^<]*)</span>)?"
    )
    headers = re.findall(pattern, html)
    if len(headers) != 1:
        raise ValueError("Rodada ou referência divergente na página da CBF")
    return list(dict.fromkeys(
        name.strip() for name in unescape(headers[0]).split(",")
        if name.strip().casefold() not in {"", "não definido", "-"}
    ))


def collect(league, round_number):
    series, competition = COMPETITIONS[league]
    index = f"{ORIGIN}/api/cbf/jogos/campeonato/{competition}/rodada/{round_number}/fase"
    groups = json.loads(fetch(index, "application/json"))["jogos"]
    games = [game for group in groups for game in group["jogo"]]
    if not 1 <= len(games) <= 10:
        raise ValueError("Quantidade inesperada de jogos na rodada")

    matches = []
    seen_ids, seen_references = set(), set()
    for game in games:
        game_id = game["id_jogo"]
        reference = int(game["num_jogo"])
        if (not re.fullmatch(r"[0-9]{1,12}", game_id)
                or int(game["rodada"]) != round_number
                or not 1 <= reference <= 380
                or game_id in seen_ids or reference in seen_references):
            raise ValueError("Identidade de partida inválida ou repetida no índice da CBF")
        seen_ids.add(game_id)
        seen_references.add(reference)
        day, time = game["data"].strip(), game["hora"].strip()
        kickoff = datetime.strptime(f"{day} {time}", "%d/%m/%Y %H:%M") if day and time else None
        if kickoff and kickoff.year != 2026:
            raise ValueError("Data fora da temporada verificada")
        home, away = game["mandante"]["nome"].strip(), game["visitante"]["nome"].strip()
        if not home or not away:
            raise ValueError("Confronto sem mandante ou visitante")
        matches.append({
            "id": game_id, "reference": reference, "home": home, "away": away,
            "kickoff": kickoff.replace(tzinfo=SAO_PAULO).isoformat() if kickoff else None,
            "sourceUrl": f"{ORIGIN}/futebol-brasileiro/jogos/campeonato-brasileiro/"
                         f"serie-{series}/2026/a-x-b/{game_id}",
        })

    for match in matches:
        match["channels"] = []
        if match["kickoff"]:
            sleep(0.35)
            html = fetch(match["sourceUrl"], "text/html")
            match["channels"] = parse_channels(html, series, round_number, match["reference"])
    return {"league": league, "season": 2026, "round": round_number,
            "indexUrl": index, "matches": matches}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("league", choices=COMPETITIONS)
    parser.add_argument("round", type=int, choices=range(1, 39), metavar="1–38")
    args = parser.parse_args()
    try:
        result = collect(args.league, args.round)
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f"Coleta CBF interrompida: {error}\n")
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
