import { readFile } from "node:fs/promises";
import {
  playerLeagues,
  registerBrazilSquads,
  saveBrazilPlayerProfile,
  syncBrazilPlayerDay,
} from "../server/brazil-players.mjs";

const [action, league, from, to = from] = process.argv
  .slice(2)
  .filter((arg) => arg !== "--force");
const day = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
if (action === "profile" && league && from) {
  await saveBrazilPlayerProfile(
    league,
    JSON.parse(await readFile(from, "utf8")),
  );
} else if (action === "rosters" && Object.hasOwn(playerLeagues, league)) {
  console.log({ league, teams: await registerBrazilSquads(league) });
} else if (
  action === "matches" &&
  Object.hasOwn(playerLeagues, league) &&
  day(from) &&
  day(to) &&
  Date.parse(to) >= Date.parse(from) &&
  Date.parse(to) - Date.parse(from) <= 30 * 86_400_000
) {
  for (
    let cursor = Date.parse(from);
    cursor <= Date.parse(to);
    cursor += 86_400_000
  ) {
    const date = new Date(cursor).toISOString().slice(0, 10);
    const result = await syncBrazilPlayerDay(league, date, {
      limit: 20,
      force: process.argv.includes("--force"),
    });
    console.log({ league, date, ...result });
    if (result.unavailable || result.pending) process.exitCode = 1;
  }
} else {
  console.error(
    `Use rosters <liga>, matches <liga> <início> [fim] [--force] ou profile <id> <arquivo.json>. Ligas: ${Object.keys(playerLeagues).join(", ")}.`,
  );
  process.exitCode = 1;
}
