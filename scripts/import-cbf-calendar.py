"""Offline importer for the verified CBF 2026 Serie A detailed-table layout."""
import argparse
from datetime import date, datetime
from hashlib import sha256
import io
import json
from pathlib import Path
import re
import tempfile
import unicodedata
from zoneinfo import ZoneInfo

MAX_PDF_BYTES = 8 * 1024 * 1024
MAX_PAGES = 50
STATES = set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split())
CDN = "https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/"
RESULT_URL = re.compile(
    r"https://www\.cbf\.com\.br/futebol-brasileiro/jogos/campeonato-brasileiro/"
    r"serie-[ab]/2026/[a-z0-9-]+/([0-9]+)"
)
SAO_PAULO = ZoneInfo("America/Sao_Paulo")


def table_rows(pdf_bytes, expected):
    import pdfplumber

    rows = {}
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        if not 1 <= len(pdf.pages) <= MAX_PAGES:
            raise ValueError("Quantidade de páginas fora do limite")
        for page in pdf.pages:
            heading = " ".join((page.extract_text() or "").split())
            if "TABELA DETALHADA / EDIÇÃO 2026" not in heading or not re.search(r"REF\s*ROD\s+DATA", heading):
                continue
            lines = page.extract_text_lines(x_tolerance=1)
            headers = [line for line in lines if re.match(r"^REF\s*ROD\s+DATA", line["text"])]
            if len(headers) != 1:
                raise ValueError("Cabeçalho da tabela não reconhecido")
            header_x = headers[0]["chars"][0]["x0"]
            if 38 <= header_x <= 42:
                columns = [(38, 52), (52, 72), (72, 98), (118, 140),
                           (140, 238), (238, 253), (253, 342)]
            elif 77 <= header_x <= 82:
                columns = [(76, 92), (92, 109), (109, 134), (150, 172),
                           (172, 258), (258, 274), (274, 354)]
            else:
                raise ValueError("Layout da tabela não reconhecido")
            for line in lines:
                if not re.match(r"^\d{3}\s", line["text"]):
                    continue
                # Columns come from the verified PDF; adjacent text can have no
                # space between the away team's state and the stadium.
                words = pdfplumber.utils.extract_words(line["chars"], x_tolerance=1)
                fields = [" ".join(w["text"] for w in words if left <= w["x0"] < right)
                          for left, right in columns]
                ref, printed_round, day_month, time, home, versus, away = fields
                reference = int(ref)
                if reference not in expected or reference in rows:
                    raise ValueError(f"Referência inesperada ou repetida: {ref}")
                round_number = expected[reference]
                if printed_round and printed_round.rstrip("ª") != str(round_number):
                    raise ValueError(f"Rodada divergente na referência {ref}")
                if (versus.lower() != "x" or any(
                        len(team.rsplit(" ", 1)) != 2 or team.rsplit(" ", 1)[1] not in STATES
                        for team in (home, away))):
                    raise ValueError(f"Confronto inválido na referência {ref}")
                kickoff = datetime.strptime(f"2026/{day_month} {time}", "%Y/%d/%m %H:%M")
                rows[reference] = {
                    "round": round_number, "home": home, "away": away,
                    "kickoff": kickoff.replace(tzinfo=SAO_PAULO).isoformat(),
                    "status": "scheduled",
                }
    if rows.keys() != expected.keys():
        raise ValueError(f"Referências ausentes: {sorted(expected.keys() - rows.keys())}")
    return rows


def checked_file(directory, source):
    filename = Path(source["file"])
    if filename.name != source["file"] or filename.is_absolute():
        raise ValueError("Use somente o nome de um arquivo na pasta do manifesto")
    with (directory / filename).open("rb") as file:
        data = file.read(MAX_PDF_BYTES + 1)
    if len(data) > MAX_PDF_BYTES:
        raise ValueError("Documento acima do limite de tamanho")
    if sha256(data).hexdigest() != source["sha256"]:
        raise ValueError("SHA-256 do documento diverge do manifesto")
    return data


def checked_pdf(directory, source):
    if not re.fullmatch(re.escape(CDN) + r"[A-Za-z0-9_%-]+\.pdf", source["url"]):
        raise ValueError("URL de origem fora do CDN oficial verificado")
    data = checked_file(directory, source)
    if not data.startswith(b"%PDF-"):
        raise ValueError("Documento sem assinatura de PDF")
    return data


def publication_order(sources):
    documents = []
    for source in sources:
        published = datetime.fromisoformat(source["publishedAt"])
        if published.utcoffset() is None:
            raise ValueError("A versão do documento exige data, horário e fuso")
        documents.append((published, source))
    return sorted(documents, key=lambda entry: entry[0])


def source_metadata(source):
    return {key: source[key] for key in ("url", "sha256", "publishedAt")}


def normalize_name(name):
    return "".join(char for char in unicodedata.normalize("NFKD", name.lower())
                   if char.isalnum())


def official_result(directory, source, matches):
    url = RESULT_URL.fullmatch(source["url"])
    if not url:
        raise ValueError("URL de resultado fora das páginas oficiais verificadas")
    html = checked_file(directory, source).decode("utf-8")
    games = []
    marker = '"jogo":{"id_jogo"'
    decoder = json.JSONDecoder()
    for block in html.split('self.__next_f.push([1,"')[1:]:
        payload, _ = decoder.raw_decode('"' + block)
        offset = payload.find(marker)
        if offset != -1:
            game, _ = decoder.raw_decode(payload[offset + len('"jogo":'):])
            games.append(game)
    if len(games) != 1:
        raise ValueError("Formato da página de resultado não reconhecido")
    game = games[0]
    reference = int(game["num_jogo"])
    match = matches.get(reference)
    if (game["id_jogo"] != url[1] or game["ano"] != "2026"
            or game["campeonato"]["id"] != "1260611"
            or reference != source["reference"] or not match
            or int(game["rodada"]) != match["round"]):
        raise ValueError("Identidade do jogo oficial diverge do calendário")
    kickoff = datetime.strptime(game["data"].strip() + " " + game["hora"], "%d/%m/%Y %H:%M")
    if kickoff.replace(tzinfo=SAO_PAULO).isoformat() != match["kickoff"]:
        raise ValueError("Horário do resultado diverge do calendário")
    if not any(doc["title"] == "Súmula" and
               doc["url"].startswith("https://conteudo.cbf.com.br/")
               for doc in game["documentos"]):
        raise ValueError("Página sem súmula oficial publicada")
    score = {}
    for side, role in (("home", "mandante"), ("away", "visitante")):
        team = game[role]
        if (normalize_name(team["nome"]) != normalize_name(match[side].rsplit(" ", 1)[0])
                or not re.fullmatch(r"[0-9]{1,2}", team["gols"])):
            raise ValueError("Equipe ou placar do resultado inválido")
        score[side] = int(team["gols"])
    return reference, score


def import_calendar(manifest, directory):
    matches = {}
    versions = {}
    for published, source in publication_order(manifest["documents"]):
        data = checked_pdf(directory, source)
        if source["kind"] == "table":
            expected = {int(ref): round_number for ref, round_number in source["references"].items()}
            if not expected or any(not 1 <= ref <= 380 or not 1 <= rd <= 38
                                   for ref, rd in expected.items()):
                raise ValueError("Referências ou rodadas inválidas no manifesto")
            updates = table_rows(data, expected)
        elif source["kind"] == "postponement":
            # A reviewed IMT can explicitly remove a date. An omitted table
            # row alone is never evidence that the game was postponed.
            reference = source["reference"]
            if reference not in matches:
                raise ValueError("O adiamento exige um jogo já importado")
            updates = {reference: {**matches[reference], "kickoff": None, "status": "postponed"}}
        else:
            raise ValueError("Tipo de documento desconhecido")
        for reference, update in updates.items():
            previous = matches.get(reference)
            if previous and any(previous[key] != update[key] for key in ("round", "home", "away")):
                raise ValueError(f"Identidade divergente na referência {reference}")
            if previous and published == versions[reference]:
                if any(previous[key] != update[key] for key in ("kickoff", "status")):
                    raise ValueError(f"Revisões conflitantes na referência {reference}")
                continue
            matches[reference] = {
                **update, "reference": reference,
                "source": source_metadata(source),
            }
            versions[reference] = published
    if not matches:
        raise ValueError("Nenhum jogo importado")
    result_versions = {}
    for published, source in publication_order(manifest.get("results", [])):
        reference, score = official_result(directory, source, matches)
        match = matches[reference]
        if result_versions.get(reference) == published and match["score"] != score:
            raise ValueError(f"Resultados conflitantes na referência {reference}")
        match.update(status="finished", score=score, resultSource=source_metadata(source))
        result_versions[reference] = published

    dates = {}
    for reference, match in sorted(matches.items()):
        if match["kickoff"]:
            day = match["kickoff"][:10]
            date.fromisoformat(day)
            dates.setdefault(day, []).append(reference)
    return {"competition": "bra.1", "season": 2026,
            "matches": [matches[ref] for ref in sorted(matches)],
            "dates": dict(sorted(dates.items()))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    try:
        manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
        result = import_calendar(manifest, args.manifest.parent)
        if args.output.resolve() == args.manifest.resolve() or args.output.suffix != ".json":
            raise ValueError("A saída deve ser um JSON separado do manifesto")
        with tempfile.NamedTemporaryFile(dir=args.output.parent, delete=False,
                                         mode="w", encoding="utf-8") as file:
            temporary = Path(file.name)
            json.dump(result, file, ensure_ascii=False, indent=2)
            file.write("\n")
        try:
            temporary.replace(args.output)
        finally:
            temporary.unlink(missing_ok=True)
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f"Importação CBF interrompida: {error}\n")


if __name__ == "__main__":
    main()
