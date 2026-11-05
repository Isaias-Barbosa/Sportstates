import { importReviewedCbfMatches } from "../server/cbf-reviewed-player-stats.mjs";
if (!process.argv.includes("--apply")) {
  console.log("Use --apply para importar as duas partidas revisadas no banco indicado em DATABASE_URL.");
} else {
  if (!process.env.DATABASE_URL) throw new Error("Neon não configurado.");
  console.log(await importReviewedCbfMatches());
}
