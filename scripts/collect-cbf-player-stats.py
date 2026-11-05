"""Collect one official 2026 Copa do Brasil match for player identity review."""
import argparse
from datetime import datetime
from hashlib import sha256
import json
import re
import sys
from urllib.request import HTTPRedirectHandler, Request, build_opener
from zoneinfo import ZoneInfo

MAX_BYTES = 2 * 1024 * 1024
MATCH_BASE = "https://www.cbf.com.br/futebol-brasileiro/jogos/copa-do-brasil/profissional/2026/a-x-b/"
REPORT = re.compile(r"https://conteudo\.cbf\.com\.br/sumulas/2026/[0-9]+se\.pdf")
ID = re.compile(r"[0-9]{1,12}")


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def extract_game(html):
    marker = '"jogo":{"id_jogo"'
    decoder = json.JSONDecoder()
    games = []
    for block in html.split('self.__next_f.push([1,"')[1:]:
        payload, _ = decoder.raw_decode('"' + block)
        offset = payload.find(marker)
        if offset >= 0:
            game, _ = decoder.raw_decode(payload[offset + len('"jogo":'):])
            games.append(game)
    if len(games) != 1:
        raise ValueError("Formato da página da CBF não reconhecido")
    return games[0]


def normalize(game, match_id):
    if (game["id_jogo"] != match_id or game["ano"] != "2026"
            or game["campeonato"]["id"] != "1260615"):
        raise ValueError("Identidade do jogo não corresponde à Copa do Brasil de 2026")
    reports = [doc["url"] for doc in game["documentos"]
               if doc["title"] == "Súmula" and REPORT.fullmatch(doc["url"])]
    if len(reports) != 1:
        raise ValueError("Súmula oficial ausente ou ambígua")
    documents = [doc for doc in game["documentos"]
                 if doc["title"] in ("Súmula", "Adendo do Jogo") and
                 re.fullmatch(r"https://conteudo\.cbf\.com\.br/sumulas/2026/[0-9]+(?:se|ad)\.pdf", doc["url"])]
    kickoff = datetime.strptime(game["data"].strip() + " " + game["hora"], "%d/%m/%Y %H:%M")
    if kickoff.year != 2026:
        raise ValueError("Data fora da temporada")

    teams, athletes, score = {}, {}, {}
    for role in ("mandante", "visitante"):
        team = game[role]
        team_id = team["id"]
        if not ID.fullmatch(team_id) or team_id in teams or not team["nome"].strip():
            raise ValueError("Clube inválido ou duplicado")
        if not re.fullmatch(r"[0-9]{1,2}", team["gols"]):
            raise ValueError("Placar inválido")
        teams[team_id] = {"name": team["nome"], "side": role, "score": int(team["gols"])}
        score[team_id] = 0
        roster = {}
        for entry in team["atletas"]:
            athlete_id = entry["id"]
            name = re.sub(r"^\d+\s*-\s*", "", entry["nome"]).strip()
            if (not ID.fullmatch(athlete_id) or athlete_id in athletes or not name
                    or entry["entrou_jogando"] not in ("true", "false")):
                raise ValueError("Atleta inválido ou duplicado")
            starter = entry["entrou_jogando"] == "true"
            player = {"cbfId": athlete_id, "name": name, "cbfTeamId": team_id,
                      "starter": starter, "played": starter, "goals": 0,
                      "assists": None, "yellows": 0, "reds": 0}
            roster[athlete_id] = athletes[athlete_id] = player
        if sum(p["starter"] for p in roster.values()) != 11:
            raise ValueError("Lista de titulares incompleta")
        for change in team["alteracoes"]:
            incoming = change["codigo_jogador_entrou"]
            outgoing = change["codigo_jogador_saiu"]
            if incoming not in roster or outgoing not in roster or roster[incoming]["played"]:
                raise ValueError("Substituição não identificada")
            roster[incoming]["played"] = True

    unmapped_cards = []
    seen = set()
    card_fields = {"AMARELO": "yellows", "VERMELHO2AMARELO": "reds", "VERMELHO": "reds"}
    cards = []
    for event in game["registros"]:
        event_id, team_id, player_id = event["id"], event["clube_id"], event["atleta_id"]
        if not ID.fullmatch(event_id) or event_id in seen or team_id not in teams:
            raise ValueError("Evento inválido ou duplicado")
        seen.add(event_id)
        player = athletes.get(player_id)
        if player and player["cbfTeamId"] != team_id:
            raise ValueError("Evento atribuído a clube divergente")
        result = event["resultado"]
        if event["tipo"] == "GOL":
            if result not in ("NR", "PN") or not player or not player["played"]:
                raise ValueError("Tipo de gol ou atleta exige revisão")
            score[team_id] += 1
            player["goals"] += 1
        elif event["tipo"] == "PENALIDADE" and result in card_fields:
            cards.append({"cbfId": player_id, "cbfTeamId": team_id, "reportedType": result})
            if player:
                player[card_fields[result]] += 1
            else:
                unmapped_cards.append({"cbfId": player_id, "cbfTeamId": team_id, "type": result})
        else:
            raise ValueError("Tipo de evento exige revisão")
    if any(score[team_id] != team["score"] for team_id, team in teams.items()):
        raise ValueError("Gols registrados divergem do placar")
    return {"cbfMatchId": match_id, "reference": int(game["num_jogo"]), "league": "bra.copa_do_brazil",
            "kickoff": kickoff.replace(tzinfo=ZoneInfo("America/Sao_Paulo")).isoformat(),
            "sourceUrl": MATCH_BASE + match_id, "reportUrl": reports[0], "documents": documents, "teams": teams,
            "players": list(athletes.values()), "cards": cards, "unmappedCards": unmapped_cards,
            "requiresReview": True, "identityNamespace": "cbf",
            "warnings": ["Conferir atletas, substituições e cartões com a súmula antes da publicação.",
                         "Os IDs CBF exigem vínculo revisado com os IDs ESPN.",
                         "Assistências indisponíveis na fonte."]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("match_id")
    args = parser.parse_args()
    if not ID.fullmatch(args.match_id):
        parser.error("ID CBF inválido")
    try:
        request = Request(MATCH_BASE + args.match_id, headers={"Accept": "text/html"})
        with build_opener(NoRedirect()).open(request, timeout=8) as response:
            data = response.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise ValueError("Página acima do limite")
        result = normalize(extract_game(data.decode("utf-8")), args.match_id)
        result["sourceSha256"] = sha256(data).hexdigest()
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f"Coleta CBF interrompida: {error}\n")
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
