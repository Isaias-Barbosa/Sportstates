"""Collect official player identities registered for one 2026 Copa do Brasil club."""
import argparse
from hashlib import sha256
import json
import re
import sys
from urllib.request import Request, build_opener
from importlib.util import spec_from_file_location, module_from_spec
from pathlib import Path

spec = spec_from_file_location("cbf_collection", Path(__file__).with_name("collect-cbf-player-stats.py"))
collection = module_from_spec(spec)
spec.loader.exec_module(collection)
BASE = "https://www.cbf.com.br/futebol-brasileiro/times/copa-do-brasil/masculino/2026/"


def extract_register(html, team_id):
    decoder = json.JSONDecoder()
    lists = []
    for block in html.split('self.__next_f.push([1,"')[1:]:
        payload, _ = decoder.raw_decode('"' + block)
        offset = payload.find('"atletas":[')
        if offset >= 0:
            rows, _ = decoder.raw_decode(payload[offset + len('"atletas":'):])
            lists.append(rows)
    if len(lists) != 1 or not lists[0]:
        raise ValueError("Cadastro da CBF ausente ou formato não reconhecido")
    players, seen = [], {}
    for row in lists[0]:
        cbf_id = row["atleta_id"]
        if (row["clube_id"] != team_id or not collection.ID.fullmatch(cbf_id) or
                not row["atleta_nome"].strip()):
            raise ValueError("Identidade duplicada ou fora do clube de inscrição")
        if cbf_id in seen:
            if seen[cbf_id] != row["atleta_nome"].strip():
                raise ValueError("Nome conflitante para o mesmo ID CBF")
            continue
        seen[cbf_id] = row["atleta_nome"].strip()
        players.append({"id": "cbf-" + cbf_id, "cbfId": cbf_id, "name": row["atleta_nome"].strip(),
                        "alias": row["Atleta_apelido"].strip(),
                        "registrationTeamId": team_id, "season": 2026,
                        "competition": "Copa do Brasil", "source": BASE + team_id})
    return players


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("team_id")
    args = parser.parse_args()
    if not re.fullmatch(r"[0-9]{1,12}", args.team_id):
        parser.error("ID CBF inválido")
    try:
        request = Request(BASE + args.team_id, headers={"Accept": "text/html"})
        with build_opener(collection.NoRedirect()).open(request, timeout=8) as response:
            data = response.read(collection.MAX_BYTES + 1)
        if len(data) > collection.MAX_BYTES:
            raise ValueError("Cadastro acima do limite")
        players = extract_register(data.decode("utf-8"), args.team_id)
        result = {"cbfTeamId": args.team_id, "sourceSha256": sha256(data).hexdigest(), "players": players}
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f"Cadastro CBF interrompido: {error}\n")
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
