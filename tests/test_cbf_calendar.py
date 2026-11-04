import hashlib
import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "import-cbf-calendar.py"
SPEC = importlib.util.spec_from_file_location("cbf_calendar", SCRIPT)
cbf = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(cbf)


class CalendarImportTest(unittest.TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.directory = Path(directory.name)

    def document(self, day, kind="table"):
        filename = f"revision-{day}.pdf"
        data = f"%PDF-1.4 test {day}".encode()
        (self.directory / filename).write_bytes(data)
        return {
            "kind": kind, "file": filename, "url": cbf.CDN + filename,
            "sha256": hashlib.sha256(data).hexdigest(),
            "publishedAt": f"2026-10-{day:02d}T10:00:00-03:00",
            "references": {"341": 35}, "reference": 341,
        }

    def import_documents(self, *documents):
        return cbf.import_calendar({"documents": documents}, self.directory)

    def table(self, day):
        return {341: {
            "round": 35, "home": "Flamengo RJ", "away": "Athletico PR",
            "kickoff": f"2026-11-{day:02d}T20:30:00-03:00", "status": "scheduled",
        }}

    def test_new_version_replaces_date_even_with_unordered_documents(self):
        first, second = self.document(11), self.document(12)
        with patch.object(cbf, "table_rows", side_effect=[self.table(18), self.table(21)]):
            calendar = self.import_documents(second, first)
        self.assertEqual(calendar["dates"], {"2026-11-21": [341]})
        self.assertEqual(len(calendar["matches"]), 1)
        self.assertEqual(calendar["matches"][0]["source"]["sha256"], second["sha256"])

    def test_reviewed_postponement_removes_date_until_new_schedule(self):
        first, postponed, rescheduled = (
            self.document(11), self.document(12, "postponement"), self.document(13)
        )
        with patch.object(cbf, "table_rows", return_value=self.table(18)):
            calendar = self.import_documents(first, postponed)
        self.assertEqual(calendar["dates"], {})
        self.assertEqual(calendar["matches"][0]["status"], "postponed")
        self.assertIsNone(calendar["matches"][0]["kickoff"])
        with patch.object(cbf, "table_rows", side_effect=[self.table(18), self.table(25)]):
            calendar = self.import_documents(first, postponed, rescheduled)
        self.assertEqual(calendar["dates"], {"2026-11-25": [341]})

    def test_identical_imports_deduplicate_and_conflicting_versions_fail(self):
        document = self.document(11)
        with patch.object(cbf, "table_rows", return_value=self.table(18)):
            self.assertEqual(len(self.import_documents(document, document)["matches"]), 1)
        with patch.object(cbf, "table_rows", side_effect=[self.table(18), self.table(19)]):
            with self.assertRaisesRegex(ValueError, "conflitantes"):
                self.import_documents(document, document)

    def result_document(self, with_report):
        game = {
            "id_jogo": "900001", "num_jogo": "341", "ano": "2026", "rodada": "35",
            "campeonato": {"id": "1260611"}, "data": "18/11/2026", "hora": "20:30",
            "mandante": {"nome": "Flamengo", "gols": "0"},
            "visitante": {"nome": "Athletico", "gols": "0"},
            "documentos": [{"title": "Súmula", "url": "https://conteudo.cbf.com.br/test.pdf"}]
            if with_report else [],
        }
        payload = json.dumps({"jogo": game}, separators=(",", ":"))
        data = ("<script>self.__next_f.push([1," + json.dumps(payload) + "])</script>").encode()
        (self.directory / "result.html").write_bytes(data)
        return {
            "file": "result.html", "sha256": hashlib.sha256(data).hexdigest(),
            "url": ("https://www.cbf.com.br/futebol-brasileiro/jogos/campeonato-brasileiro/"
                    "serie-a/2026/flamengo-x-athletico/900001"),
            "publishedAt": "2026-11-19T10:00:00-03:00", "reference": 341,
        }

    def test_result_requires_official_report_and_preserves_zero_scores(self):
        document = self.document(11)
        with patch.object(cbf, "table_rows", return_value=self.table(18)):
            with self.assertRaisesRegex(ValueError, "sem súmula"):
                cbf.import_calendar(
                    {"documents": [document], "results": [self.result_document(False)]},
                    self.directory,
                )
            calendar = cbf.import_calendar(
                {"documents": [document], "results": [self.result_document(True)]},
                self.directory,
            )
        match = calendar["matches"][0]
        self.assertEqual(match["status"], "finished")
        self.assertEqual(match["score"], {"home": 0, "away": 0})
        self.assertIn("resultSource", match)

    def test_changed_bytes_are_rejected_before_parsing(self):
        document = self.document(11)
        (self.directory / document["file"]).write_bytes(b"%PDF-1.4 changed")
        with self.assertRaisesRegex(ValueError, "SHA-256"):
            self.import_documents(document)

    def test_unverified_origin_is_rejected(self):
        document = self.document(11)
        document["url"] = "https://cbf-hml.cbf.com.br/file.pdf"
        with self.assertRaisesRegex(ValueError, "CDN oficial"):
            self.import_documents(document)


if __name__ == "__main__":
    unittest.main()
