// Public LNB HTML adapter. The league publishes tables rather than a stable JSON API.
// Reject unfamiliar markup instead of inventing scores or standings.
const BASE = "https://lnb.com.br/nbb";
const clean = (html) => String(html || "")
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/\s+/g, " ").trim();
const cells = (row) => [...row.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)]
  .map((m) => clean(m[1]));
const rows = (html) => [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
  .map((m) => cells(m[1])).filter((r) => r.length);
export async function loadLnbHtml(path, fetchImpl = fetch) {
  const response = await fetchImpl(BASE + path, {
    headers: { Accept: "text/html", "User-Agent": "Sportstates/1.0" },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("LNB indisponível (HTTP " + response.status + ")");
  return response.text();
}
export function parseLnbGames(html, month) {
  const matches = [];
  for (const row of rows(html)) {
    const joined = row.join(" | ");
    const date = joined.match(/(\d{2})\/(\d{2})\/(20\d{2})\s+(\d{2}):(\d{2})/);
    if (!date) continue;
    const iso = `${date[3]}-${date[2]}-${date[1]}`;
    if (!iso.startsWith(month)) continue;
    const dateIndex = row.findIndex((cell) => /\d{2}\/\d{2}\/20\d{2}/.test(cell));
    const after = row.slice(dateIndex + 1);
    const scoreIndex = after.findIndex((cell) => /\b\d{1,3}\s*[xX×-]\s*\d{1,3}\b/.test(cell));
    if (scoreIndex < 1) continue;
    const homeName = after[scoreIndex - 1]?.trim();
    const awayName = after[scoreIndex + 1]?.trim();
    if (!homeName || !awayName || homeName.length > 90 || awayName.length > 90) continue;
    const score = after[scoreIndex].match(/(\d{1,3})\s*[xX×-]\s*(\d{1,3})/);
    const gameNumber = Number(row[0]) || matches.length + 1;
    const dateIso = `${iso}T${date[4]}:${date[5]}:00-03:00`;
    const finished = !!score && Date.parse(dateIso) < Date.now();
    matches.push({
      id: `lnb-${date[3]}-${gameNumber}`, sport: "basketball",
      league: "nbb", leagueName: "NBB", date: dateIso,
      name: `${awayName} x ${homeName}`,
      home: { id: `lnb-${homeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name: homeName, score: finished ? score[1] : null },
      away: { id: `lnb-${awayName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name: awayName, score: finished ? score[2] : null },
      state: finished ? "finished" : "scheduled", source: "LNB",
      round: after.find((v) => /rodada/i.test(v)) || undefined,
      venue: after.find((v) => /gin[aá]sio|arena/i.test(v)) || "",
    });
  }
  if (!matches.length) throw new Error("LNB não retornou jogos estruturados para este mês.");
  return { matches, partial: false };
}
export function parseLnbStandings(html) {
  const table = rows(html);
  const headerIndex = table.findIndex((r) =>
    r.some((v) => /equipes/i.test(v)) && r.some((v) => /vit/i.test(v)));
  if (headerIndex < 0) throw new Error("Tabela de classificação da LNB não identificada.");
  const header = table[headerIndex].map((v) => v.toUpperCase().trim());
  const statIndex = (name) => header.findIndex((v) => v === name);
  const result = [];
  for (const row of table.slice(headerIndex + 1)) {
    // LNB renders rank, acronym and team name inside the same EQUIPES cell.
    const first = row[0] || "";
    const match = first.match(/^\\s*(\\d{1,2})\\s+(.+)$/);
    if (!match) { if (result.length) break; else continue; }
    const rank = match[1];
    const name = (row.length > header.length ? row[1] : match[2]).trim();
    if (!name || name.length > 100) continue;
    const stat = (key) => {
      const i = statIndex(key);
      return i >= 0 ? row[i] || "—" : "—";
    };
    result.push({
      id: `lnb-${name.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")}`,
      name, rank, logo: null,
      stats: {
        gamesPlayed: stat("JOG"), wins: stat("VIT"), losses: stat("DER"),
        pointsFor: stat("PRO"), pointsAgainst: stat("CON"),
        pointDifference: stat("SAL"), points: stat("PON"),
      },
    });
  }
  if (result.length < 10) throw new Error("Classificação LNB incompleta.");
  return [{ name: "NBB · fase de classificação", rows: result }];
}
