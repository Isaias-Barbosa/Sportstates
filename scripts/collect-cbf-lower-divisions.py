"""Collect official 2026 Série C/D fixtures and cross-reference Wikipedia participants."""
import argparse
from datetime import datetime, timezone
from hashlib import sha256
import json
import re
import sys
from time import sleep
import unicodedata
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.parse import urljoin
from zoneinfo import ZoneInfo
from lxml import html

CONFIG = {"c": ("bra.3", "1260613", 19, 20), "d": ("bra.4", "1260635", 10, 96)}
PRESERVED_IDS = {"21918": "17715", "62328": "131673", "37846": "131680",
                 "59116": "131681", "60415": "131672"}
# Explicitly reviewed correspondences, scoped to the federation's club ID.
WIKI_NAMES = {
    "40387": "Barra-SC", "20379": "Ypiranga de Erechim", "20353": "GAS",
    "20050": "Nacional-AM", "21638": "São Raimundo-RR", "20041": "Operário-MS",
    "21817": "Ivinhema", "20081": "Vitória-ES", "62328": "Porto-BA",
    "62546": "Rio Branco-ES", "20432": "Democrata GV", "21942": "Real Noroeste",
    "63521": "Portuguesa", "20805": "Portuguesa-RJ", "20816": "Cianorte",
    "20225": "Guarany de Bagé", "21922": "FC Cascavel", "39727": "Santa Catarina",
    "20319": "São José-RS", "64810": "Brasil de Pelotas", "21745": "Araguaína",
    "37539": "Inhumas", "59905": "Primavera-MT", "20287": "União Rondonópolis",
    "37743": "Capital-DF", "35079": "Operário VG", "35330": "Maracanã-CE",
    "20056": "Sampaio Corrêa", "32387": "Sampaio Corrêa-RJ", "35775": "Fluminense-PI",
    "35316": "Atlético Cearense", "62025": "América de Natal", "20112": "Central",
    "35768": "Decisão Goiana", "37846": "Serra Branca",
}
MAX_BYTES = 12 * 1024 * 1024


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def fetch(url):
    with build_opener(NoRedirect()).open(Request(url, headers={"User-Agent": "Sportstates/1.0"}), timeout=12) as response:
        data = response.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError("Resposta acima do limite")
    return data


def key(value):
    return "".join(c for c in unicodedata.normalize("NFD", value).lower()
                   if c.isalnum()).removesuffix("saf").removesuffix("fc")


def wikipedia_participants(series):
    url = "https://pt.wikipedia.org/wiki/Campeonato_Brasileiro_de_Futebol_de_2026_-_S%C3%A9rie_" + series.upper()
    raw = fetch(url)
    doc = html.fromstring(raw)
    tables = [table for table in doc.xpath("//table") if
              "Cidade" in [" ".join(cell.itertext()).strip() for cell in table.xpath("./tbody/tr[1]/th|./tr[1]/th")]]
    if len(tables) != 1:
        raise ValueError("Tabela de participantes da Wikipédia não reconhecida")
    participants = []
    for row in tables[0].xpath(".//tr")[1:]:
        cells = row.xpath("./td")
        if len(cells) != 7:
            raise ValueError("Colunas de participantes não reconhecidas")
        text = [" ".join(" ".join(cell.itertext()).split()) for cell in cells]
        links = [urljoin(url, link) for link in cells[0].xpath(".//a/@href")]
        links = [link for link in links if link.startswith("https://pt.wikipedia.org/wiki/") and "#" not in link]
        if not links:
            raise ValueError("Clube sem referência na Wikipédia")
        participants.append({"name": text[0], "city": text[1], "state": text[2],
                             "stadium": text[4], "wikiUrl": links[0]})
    return url, sha256(raw).hexdigest(), participants


def collect(series):
    league, competition, rounds, expected_teams = CONFIG[series]
    source = f"https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-{series}/2026"
    clubs, matches, seen = {}, [], set()
    for number in range(1, rounds + 1):
        url = f"https://www.cbf.com.br/api/cbf/jogos/campeonato/{competition}/rodada/{number}/fase"
        raw = json.loads(fetch(url))
        if not isinstance(raw.get("jogos"), list):
            raise ValueError("Formato das rodadas da CBF não reconhecido")
        for group in raw["jogos"]:
            for game in group["jogo"]:
                event = game["id_jogo"]
                if not re.fullmatch(r"[0-9]{1,12}", event) or event in seen or int(game["rodada"]) != number:
                    raise ValueError("Partida repetida ou rodada divergente")
                seen.add(event)
                kickoff = datetime.strptime(game["data"].strip() + " " + game["hora"], "%d/%m/%Y %H:%M")
                if kickoff.year != 2026:
                    raise ValueError("Partida fora da temporada")
                sides = {}
                for role in ("mandante", "visitante"):
                    team = game[role]
                    if not re.fullmatch(r"[0-9]{1,12}", team["id"]):
                        raise ValueError("Clube sem identidade válida")
                    team_id = PRESERVED_IDS.get(team["id"], "cbf-" + team["id"])
                    if team_id not in clubs:
                        clubs[team_id] = {"id": team_id, "cbfId": team["id"], "name": team["nome"],
                                         "sport": "soccer", "league": league, "logo": team["url_escudo"],
                                         "source": source, "venues": []}
                    if game["local"] not in clubs[team_id]["venues"]:
                        clubs[team_id]["venues"].append(game["local"])
                    score = team["gols"]
                    sides[role] = {"id": team_id, "score": score if re.fullmatch(r"[0-9]{1,2}", score) else None,
                                   "penalties": team.get("panaltis")}
                reports = [doc["url"] for doc in game.get("documentos", []) if doc.get("title") == "Súmula"
                           and re.fullmatch(r"https://conteudo\.cbf\.com\.br/sumulas/2026/[0-9]+se\.pdf", doc.get("url", ""))]
                finished = len(reports) == 1 and all(side["score"] is not None for side in sides.values())
                matches.append({"id": event, "cbfId": event, "league": league,
                                "reference": int(game["num_jogo"]), "round": number, "group": group["grupo"],
                                "date": kickoff.replace(tzinfo=ZoneInfo("America/Sao_Paulo")).isoformat(),
                                "home": sides["mandante"], "away": sides["visitante"], "venue": game["local"],
                                "finished": finished, "reportUrl": reports[0] if reports else None,
                                "sourceUrl": f"https://www.cbf.com.br/futebol-brasileiro/jogos/campeonato-brasileiro/serie-{series}/2026/a-x-b/{event}"})
        sleep(0.2)
    if len(clubs) != expected_teams:
        raise ValueError(f"Clubes incompletos: {len(clubs)} de {expected_teams}")
    snapshot = {"season": 2026, "league": league, "collectedAt": datetime.now(timezone.utc).isoformat(),
                "sourceUrl": source, "clubs": list(clubs.values()),
                "matches": sorted(matches, key=lambda match: (match["date"], match["id"]))}
    return cross_reference(snapshot, series)


def cross_reference(snapshot, series):
    _, _, _, expected_teams = CONFIG[series]
    wiki_url, wiki_sha, participants = wikipedia_participants(series)
    if len(participants) != expected_teams:
        raise ValueError("Quantidade de participantes da Wikipédia divergente")
    used, unresolved = set(), []
    for club in snapshot["clubs"]:
        for field in ("city", "state", "stadium", "wikiUrl"):
            club.pop(field, None)
        expected_name = WIKI_NAMES.get(club["cbfId"], club["name"])
        candidates = [p for p in participants if key(p["name"]) == key(expected_name)]
        if len(candidates) != 1 or candidates[0]["name"] in used:
            unresolved.append({"cbfId": club["cbfId"], "name": club["name"]})
            continue
        p = candidates[0]
        home_venues = [match["venue"] for match in snapshot["matches"] if match["home"]["id"] == club["id"]]
        states = [venue.rsplit(" - ", 1)[-1].strip() for venue in home_venues]
        if states and max(set(states), key=states.count) != p["state"]:
            raise ValueError(f"Estado divergente no vínculo de {club['name']} com a Wikipédia")
        used.add(p["name"])
        club.update(displayName=p["name"], city=p["city"], state=p["state"], stadium=p["stadium"], wikiUrl=p["wikiUrl"])
    return {**snapshot, "wikipedia": {"url": wiki_url, "sha256": wiki_sha},
            "unresolved": unresolved, "unmatchedWikipedia": [p["name"] for p in participants if p["name"] not in used]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("series", choices=CONFIG)
    args = parser.parse_args()
    try:
        result = collect(args.series)
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f"Coleta CBF interrompida: {error}\n")
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
