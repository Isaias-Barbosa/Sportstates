import importlib.util
import json
from pathlib import Path
import unittest

path = Path(__file__).resolve().parents[1] / "scripts" / "collect-cbf-player-register.py"
spec = importlib.util.spec_from_file_location("cbf_register", path)
cbf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cbf)


class RegisterTests(unittest.TestCase):
    def page(self, rows):
        payload = json.dumps({"atletas": rows}, separators=(",", ":"))
        return "self.__next_f.push([1," + json.dumps(payload) + "])"

    def row(self, name="Julio Cesar de Souza Silva"):
        return {"atleta_id": "633319", "atleta_nome": name, "Atleta_apelido": "Julio César",
                "clube_id": "59116", "clube_nome_popular": "Outro Clube"}

    def test_preserves_identity_and_registration_without_asserting_current_club(self):
        rows = cbf.extract_register(self.page([self.row(), self.row()]), "59116")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["id"], "cbf-633319")
        self.assertEqual(rows[0]["registrationTeamId"], "59116")
        self.assertNotIn("currentClub", rows[0])

    def test_conflicting_name_or_registration_fails(self):
        with self.assertRaises(ValueError):
            cbf.extract_register(self.page([self.row(), self.row("Outra pessoa")]), "59116")
        with self.assertRaises(ValueError):
            cbf.extract_register(self.page([self.row()]), "60415")
