import { BRAZIL_STATE_LEAGUES } from "./catalog.mjs";
// Only configured football cups with knockout stages; never infer cup rules from IDs.
export const KNOCKOUT_LEAGUES = new Set([
  ...BRAZIL_STATE_LEAGUES,
  "bra.copa_do_brazil",
  "conmebol.libertadores",
  "conmebol.sudamericana",
  "eng.fa",
  "eng.league_cup",
  "esp.copa_del_rey",
  "ita.coppa_italia",
  "ger.dfb_pokal",
  "fra.coupe_de_france",
  "usa.open",
  "concacaf.leagues.cup",
  "concacaf.champions",
  "ksa.kings.cup",
  "afc.champions",
  "uefa.champions",
  "uefa.europa",
  "uefa.europa.conf",
]);
const key = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const PHASES = [
  ["preliminary-round", "Fase preliminar", ["preliminary round"]],
  ["qualifying-round", "Fase classificatória", ["qualifying round"]],
  ["round-of-64", "32 avos de final", ["round of 64", "32 avos de final"]],
  [
    "round-of-32",
    "16 avos de final",
    ["round of 32", "16 avos de final", "dezesseis avos de final"],
  ],
  [
    "round-of-16",
    "Oitavas de final",
    ["round of 16", "oitavas", "oitavas de final"],
  ],
  [
    "quarterfinals",
    "Quartas de final",
    ["quarterfinals", "quarter finals", "quartas", "quartas de final"],
  ],
  [
    "semifinals",
    "Semifinais",
    ["semifinals", "semi finals", "semi final", "semifinal", "semifinais"],
  ],
  [
    "third-place",
    "Disputa de terceiro lugar",
    [
      "third place",
      "third place playoff",
      "third place play off",
      "3rd place match",
      "disputa de terceiro lugar",
    ],
  ],
  ["final", "Final", ["final", "finals", "finais", "final de jogo"]],
  [
    "knockout-round-playoffs",
    "Playoffs eliminatórios",
    [
      "knockout round playoffs",
      "knockout round play offs",
      "playoffs eliminatorios",
    ],
  ],
];
const PT_ORDINALS = [
  "primeira",
  "segunda",
  "terceira",
  "quarta",
  "quinta",
  "sexta",
  "setima",
];
const ORDINALS = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
];
export function knockoutPhase(value) {
  const label = key(value);
  if (
    !label ||
    /group|grupo|league phase|league stage|fase de liga|regular season/.test(
      label,
    )
  )
    return null;
  const known = PHASES.find(([, , aliases]) => aliases.includes(label));
  if (known) return { id: known[0], name: known[1] };
  for (let i = 0; i < ORDINALS.length; i++) {
    const n = i + 1;
    if (
      [
        `${ORDINALS[i]} round`,
        `${ORDINALS[i]} phase`,
        `${ORDINALS[i]} stage`,
        `${PT_ORDINALS[i]} fase`,
        `${PT_ORDINALS[i]} rodada`,
        `${n}a fase`,
        `${n} fase`,
        `${n}a rodada`,
        `${n} rodada`,
      ].includes(label)
    )
      return { id: `${ORDINALS[i]}-round`, name: `${n}ª fase` };
  }
  // A calendar entry is still usable if the source supplies a less common stage.
  return { id: label.replaceAll(" ", "-"), name: String(value).slice(0, 100) };
}
// State championships can run multiple parallel trophies. Keep each bracket separate.
export function stateKnockoutPhase(value) {
  const label = key(value);
  for (const [id, name, aliases] of PHASES) {
    if (
      ![
        "round-of-64",
        "round-of-32",
        "round-of-16",
        "quarterfinals",
        "semifinals",
        "third-place",
        "final",
      ].includes(id)
    )
      continue;
    const alias = aliases.find(
      (alias) => label === alias || label.endsWith(" " + alias),
    );
    if (!alias) continue;
    const prefix = label.slice(0, label.length - alias.length).trim();
    if (!prefix || prefix === "playoffs") return { id, name };
    const trophies = {
      "taca guanabara": "Taça Guanabara",
      "taca rio": "Taça Rio",
      "trofeu inconfidencia": "Troféu Inconfidência",
      farroupilha: "Taça Farroupilha",
    };
    const trophy = trophies[prefix];
    if (trophy)
      return {
        id: prefix.replaceAll(" ", "-") + "-" + id,
        name: trophy + " · " + name,
      };
  }
  return null;
}
const validDate = (value) =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
function competitor(raw, hasScore) {
  const t = raw?.team || {};
  const name = String(t.displayName || t.name || "A definir");
  const pending =
    /^(tbd|to be determined|a definir|vencedor|winner)(\b|\s|$)/i.test(name);
  const score =
    typeof raw?.score === "object" ? raw.score?.displayValue : raw?.score;
  return {
    id: pending ? "" : String(t.id || raw?.id || ""),
    name: pending ? "A definir" : name,
    logo: pending ? null : t.logo || t.logos?.[0]?.href || null,
    score: hasScore && score != null ? String(score) : null,
    penalties:
      hasScore && raw?.shootoutScore != null ? String(raw.shootoutScore) : null,
  };
}
export function normalizeTournament(
  metadata,
  events,
  { stateCompetition = false } = {},
) {
  const phaseFor = stateCompetition ? stateKnockoutPhase : knockoutPhase;
  const season = metadata?.season;
  if (!Number.isInteger(season?.year))
    throw new Error("Temporada da copa indisponível.");
  const stages = new Map();
  function add(phase) {
    if (!phase) return null;
    if (!stages.has(phase.id)) stages.set(phase.id, { ...phase, fixtures: [] });
    return stages.get(phase.id);
  }
  for (const group of metadata.calendar || [])
    for (const entry of group.entries || []) add(phaseFor(entry.label));
  const currentRound = phaseFor(season.type?.name)?.id || null;
  const seen = new Set();
  const sorted = [
    ...new Map(events.map((event) => [String(event.id), event])).values(),
  ]
    .filter((e) => Number(e.season?.year) === season.year)
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  for (const event of sorted) {
    const c = event.competitions?.[0];
    if (
      !c ||
      !/^\d{1,15}$/.test(String(event.id || "")) ||
      seen.has(String(event.id))
    )
      continue;
    seen.add(String(event.id));
    // Event season.slug is the provider's stage, NOT the status (e.g. STATUS_FINAL).
    const phase = phaseFor(event.season?.slug || c.series?.title);
    if (!phase) continue;
    const stage = add(phase);
    const status = c.status || event.status || {};
    const state =
      status.type?.state === "in"
        ? "live"
        : status.type?.state === "post"
          ? "finished"
          : "scheduled";
    const participants = c.competitors || [];
    const home =
      participants.find((t) => t.homeAway === "home") || participants[0];
    const away =
      participants.find((t) => t.homeAway === "away") || participants[1];
    const leg = Number(c.leg?.value);
    stage.fixtures.push({
      id: String(event.id),
      date: validDate(event.date) ? event.date : null,
      timeConfirmed: c.timeValid !== false,
      home: competitor(home, state !== "scheduled"),
      away: competitor(away, state !== "scheduled"),
      state,
      statusName: status.type?.name || "",
      clock: status.displayClock || "",
      leg: leg === 1 ? "Ida" : leg === 2 ? "Volta" : null,
    });
  }
  return {
    season: {
      year: season.year,
      name: season.displayName || String(season.year),
    },
    currentRound,
    rounds: [...stages.values()],
  };
}

export async function fetchTournament(league, loadJson, requestedYear) {
  if (!KNOCKOUT_LEAGUES.has(league)) throw new Error("Copa inválida.");
  const base = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard`;
  const current = await loadJson(
    `${base}?${requestedYear ? `dates=${requestedYear}&` : ""}limit=1000&lang=pt&region=br`,
  );
  const metadata =
    current.leagues?.find((l) => l.slug === league) || current.leagues?.[0];
  const year = metadata?.season?.year;
  if (!Number.isInteger(year) || year < 2000 || year > 2100)
    throw new Error("Temporada da copa indisponível.");
  if (requestedYear && year !== requestedYear)
    throw new Error("A fonte não disponibilizou esta temporada.");
  const options = { stateCompetition: BRAZIL_STATE_LEAGUES.has(league) };
  if (requestedYear) {
    if (!Array.isArray(current.events))
      throw new Error("Jogos da temporada indisponíveis.");
    return {
      ...normalizeTournament(metadata, current.events, options),
      partial: current.events.length >= 1000,
    };
  }
  // Soccer's YYYY query includes a full calendar year. A European season spans two.
  // Subtract one day so midnight on Jan 1 doesn't add an irrelevant third year.
  const end = Date.parse(metadata.season.endDate);
  const lastYear = Number.isFinite(end)
    ? new Date(end - 86400000).getUTCFullYear()
    : year;
  const years = lastYear === year + 1 ? [year, year + 1] : [year];
  const responses = await Promise.allSettled(
    years.map((y) =>
      loadJson(`${base}?dates=${y}&limit=1000&lang=pt&region=br`),
    ),
  );
  const feeds = responses
    .filter((r) => r.status === "fulfilled" && Array.isArray(r.value.events))
    .map((r) => r.value);
  const result = normalizeTournament(
    metadata,
    [...feeds.flatMap((r) => r.events), ...(current.events || [])],
    options,
  );
  return {
    ...result,
    partial:
      feeds.length !== years.length ||
      feeds.some((r) => r.events.length >= 1000),
  };
}
