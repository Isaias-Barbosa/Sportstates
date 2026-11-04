const API = "https://api.jolpi.ca/ergast/f1";
const LIMIT = 30;

function raceTable(payload, season) {
  const { MRData } = payload ?? {};
  const races = MRData?.RaceTable?.Races;
  if (
    !Array.isArray(races) ||
    races.length > LIMIT ||
    String(MRData.RaceTable.season) !== String(season)
  )
    throw new Error("Resposta de Fórmula 1 inválida.");
  return races;
}

function normalizeRace(race, season) {
  const round = Number(race?.round);
  if (
    String(race?.season) !== String(season) ||
    !Number.isInteger(round) ||
    round < 1 ||
    round > LIMIT ||
    typeof race.raceName !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(race.date) ||
    !Number.isFinite(Date.parse(race.date))
  )
    throw new Error("GP inválido na fonte de Fórmula 1.");
  const timed = race.time && /^\d{2}:\d{2}:\d{2}Z$/.test(race.time);
  const startsAt = timed ? race.date + "T" + race.time : null;
  return {
    round,
    name: race.raceName,
    date: race.date,
    startsAt:
      startsAt && Number.isFinite(Date.parse(startsAt)) ? startsAt : null,
    circuit: race.Circuit?.circuitName || "",
    locality: race.Circuit?.Location?.locality || "",
    country: race.Circuit?.Location?.country || "",
  };
}

export async function f1Calendar(season, json) {
  const payload = await json(`${API}/${season}/races/?limit=${LIMIT}`);
  return raceTable(payload, season)
    .map((race) => normalizeRace(race, season))
    .sort((first, second) => first.round - second.round);
}

export async function f1Result(season, round, json) {
  const payload = await json(
    `${API}/${season}/${round}/results/?limit=${LIMIT}`,
  );
  const races = raceTable(payload, season);
  if (!races.length) return null;
  const [race] = races;
  const event = normalizeRace(race, season);
  if (
    races.length !== 1 ||
    (round !== "last" && event.round !== Number(round)) ||
    !Array.isArray(race.Results) ||
    race.Results.length > LIMIT
  )
    throw new Error("Resultado de GP inválido.");
  const drivers = race.Results.map((result) => {
    const { Driver, Constructor, position, positionText, status, Time } =
      result;
    if (
      !Driver?.driverId ||
      !Number.isInteger(Number(position)) ||
      typeof Driver.givenName !== "string" ||
      typeof Driver.familyName !== "string"
    )
      throw new Error("Piloto inválido no resultado de GP.");
    return {
      id: Driver.driverId,
      position: Number(position),
      positionText: positionText || "",
      name: [Driver.givenName, Driver.familyName].filter(Boolean).join(" "),
      team: Constructor?.name || "",
      time: Time?.time || "",
      status: status || "",
    };
  });
  return { race: event, drivers };
}

export async function f1Standings(season, category, json) {
  const payload = await json(
    `${API}/${season}/${category}standings/?limit=${LIMIT}`,
  );
  const lists = payload?.MRData?.StandingsTable?.StandingsLists;
  if (!Array.isArray(lists) || lists.length > 1)
    throw new Error("Classificação de Fórmula 1 inválida.");
  if (!lists.length) return { round: null, entries: [] };
  const [list] = lists;
  const round = Number(list.round);
  const driver = category === "driver";
  const rows = driver ? list.DriverStandings : list.ConstructorStandings;
  if (
    String(list.season) !== String(season) ||
    !Number.isInteger(round) ||
    round < 1 ||
    round > LIMIT ||
    !Array.isArray(rows) ||
    rows.length > LIMIT
  )
    throw new Error("Classificação de Fórmula 1 inválida.");
  const entries = rows.map((row) => {
    const id = driver ? row.Driver?.driverId : row.Constructor?.constructorId;
    const name = driver
      ? [row.Driver?.givenName, row.Driver?.familyName]
          .filter(Boolean)
          .join(" ")
      : row.Constructor?.name;
    const position = Number(row.position);
    const points = Number(row.points);
    const wins = Number(row.wins);
    if (
      !/^[a-z0-9_]+$/.test(id || "") ||
      !name ||
      !Number.isInteger(position) ||
      position < 1 ||
      !Number.isFinite(points) ||
      !Number.isInteger(wins) ||
      wins < 0
    )
      throw new Error("Entrada inválida na classificação de Fórmula 1.");
    const teams =
      driver && Array.isArray(row.Constructors)
        ? row.Constructors.map(({ constructorId, name }) => ({
            id: constructorId,
            name,
          }))
        : undefined;
    return { id, name, position, points, wins, teams };
  });
  return { round, entries: entries.sort((a, b) => a.position - b.position) };
}
