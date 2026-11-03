import test from "node:test";
import assert from "node:assert/strict";
import { parseLnbGames, parseLnbStandings } from "../server/lnb.mjs";

test("LNB calendar parses completed games without inventing future scores", () => {
  const html = `<table><tr><th>#</th><th>Data</th><th>Casa</th><th>Placar</th><th>Visitante</th></tr>
  <tr><td>1</td><td>17/10/2026 16:00</td><td>Mogi Basquete</td><td>84 X 73</td><td>Corinthians</td></tr></table>`;
  const result = parseLnbGames(html, "2026-10");
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].home.name, "Mogi Basquete");
  assert.equal(result.matches[0].away.name, "Corinthians");
  assert.equal(result.matches[0].home.score, "84");
  assert.equal(result.matches[0].away.score, "73");
  assert.equal(result.matches[0].state, "finished");
  assert.throws(() => parseLnbGames(html, "2026-11"), /não retornou jogos/);
});
test("LNB standings reject unexpected or incomplete HTML", () => {
  assert.throws(() => parseLnbStandings("<html></html>"), /não identificada/);
});
