import importlib.util
from pathlib import Path
import unittest

script = Path(__file__).resolve().parents[1] / "scripts" / "collect-cbf-broadcasts.py"
spec = importlib.util.spec_from_file_location("cbf_broadcasts", script)
cbf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cbf)


class CbfBroadcastTests(unittest.TestCase):
    header = (
        "<title>ATH X VAS ㆍ Campeonato Brasileiro ㆍ Série A ㆍ 2026</title>"
        "<span>Fase Única | Rodada <!-- -->34<!-- --> | Jogo: <!-- -->338</span>"
    )

    def test_channels_are_deduplicated_without_splitting_platform_labels(self):
        html = self.header + "<span>Premiere, YouTube / Cazé TV, Premiere</span>"
        self.assertEqual(cbf.parse_channels(html, "a", 34, 338),
                         ["Premiere", "YouTube / Cazé TV"])

    def test_missing_channels_stay_empty(self):
        self.assertEqual(cbf.parse_channels(self.header, "a", 34, 338), [])

    def test_mismatched_identity_is_rejected(self):
        for identity in [("b", 34, 338), ("a", 35, 338), ("a", 34, 339)]:
            with self.subTest(identity=identity), self.assertRaises(ValueError):
                cbf.parse_channels(self.header, *identity)
