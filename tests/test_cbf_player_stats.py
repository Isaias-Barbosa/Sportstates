import importlib.util
from pathlib import Path
import unittest

path = Path(__file__).resolve().parents[1] / "scripts" / "collect-cbf-player-stats.py"
spec = importlib.util.spec_from_file_location("cbf_player_stats", path)
cbf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cbf)


def fixture():
    def team(team_id):
        return {"id": str(team_id), "nome": f"Clube {team_id}", "gols": "0",
                "atletas": [{"id": str(team_id * 100 + index), "nome": f"01 - Atleta {index}",
                             "entrou_jogando": "true"} for index in range(11)], "alteracoes": []}
    return {"id_jogo": "123", "ano": "2026", "campeonato": {"id": "1260615"},
            "num_jogo": "12", "data": "18/02/2026", "hora": "16:00",
            "mandante": team(1), "visitante": team(2), "registros": [],
            "documentos": [{"title": "Súmula", "url": "https://conteudo.cbf.com.br/sumulas/2026/42412se.pdf"}]}


class CbfPlayerTests(unittest.TestCase):
    def test_assists_stay_unknown_and_data_requires_identity_review(self):
        result = cbf.normalize(fixture(), "123")
        self.assertEqual(len(result["players"]), 22)
        self.assertTrue(result["requiresReview"])
        self.assertEqual(result["identityNamespace"], "cbf")
        self.assertIsNone(result["players"][0]["assists"])

    def test_red_card_keeps_raw_classification_for_report_review(self):
        game = fixture()
        game["registros"] = [{"id": "99", "clube_id": "1", "atleta_id": "100",
                              "tipo": "PENALIDADE", "resultado": "VERMELHO2AMARELO"}]
        result = cbf.normalize(game, "123")
        self.assertEqual(result["players"][0]["reds"], 1)
        self.assertEqual(result["cards"][0]["reportedType"], "VERMELHO2AMARELO")

    def test_mismatched_score_identity_and_unknown_event_fail(self):
        game = fixture()
        game["mandante"]["gols"] = "1"
        with self.assertRaises(ValueError):
            cbf.normalize(game, "123")
        with self.assertRaises(ValueError):
            cbf.normalize(fixture(), "999")
        game = fixture()
        game["registros"] = [{"id": "99", "clube_id": "1", "atleta_id": "100",
                              "tipo": "GOL", "resultado": "CT"}]
        with self.assertRaises(ValueError):
            cbf.normalize(game, "123")
