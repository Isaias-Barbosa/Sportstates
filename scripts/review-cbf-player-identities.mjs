import { readFile } from "node:fs/promises";
import { reviewCbfIdentities } from "../server/cbf-player-identities.mjs";

const [file, event] = process.argv.slice(2);
if (!file || !/^\d{1,12}$/.test(event ?? ""))
  throw new Error("Use <coleta.json> <id-evento-espn>.");
const collection = JSON.parse(await readFile(file, "utf8"));
const base =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/bra.copa_do_brazil";
async function get(path) {
  const response = await fetch(base + path, {
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error("ESPN indisponível: " + response.status);
  return response.json();
}
const summary = await get("/summary?event=" + event);
const competitors = summary.header?.competitions?.[0]?.competitors ?? [];
if (
  competitors.length !== 2 ||
  competitors.some((team) => !/^\d{1,12}$/.test(team.id ?? ""))
)
  throw new Error("Partida com clubes inválidos.");
const rosters = [];
for (const team of competitors)
  rosters.push(await get("/teams/" + team.id + "/roster"));
console.log(
  JSON.stringify(reviewCbfIdentities(collection, summary, rosters), null, 2),
);
