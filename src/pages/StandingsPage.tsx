import { useState } from "react";
import { ChevronDown, Trophy } from "lucide-react";
import { useApi, today } from "../hooks";
import type { CompetitionCatalog } from "../types";
import { Empty, Loading, Notice } from "../components/shared";
import StandingsTable from "../components/StandingsTable";

export default function StandingsPage() {
  const { data, loading, error, refresh } = useApi<CompetitionCatalog>(
    "/api/competitions",
    0,
  );
  const [sport, setSport] = useState("soccer");
  const [region, setRegion] = useState("brasil");
  const [scope, setScope] = useState("local");
  const [league, setLeague] = useState("bra.1");
  const selected = data?.sports.find((s) => s.id === sport);
  const group =
    scope === "local"
      ? data?.soccerRegions?.find((r) => r.id === region)
      : data?.soccerInternationalGroups?.find((g) => g.id === scope);
  const visible =
    sport === "soccer" && group
      ? selected?.leagues.filter((l) => group.competitions.includes(l.id))
      : selected?.leagues;

  const stateIds =
    sport === "soccer" && scope === "local" && region === "brasil"
      ? data?.soccerRegions?.find((r) => r.id === "brasil")
          ?.stateCompetitions || []
      : [];
  const isState = stateIds.includes(league);
  const currentYear = Number(today().slice(0, 4));
  const selectedName =
    selected?.leagues.find((l) => l.id === league)?.name || "Classificação";

  function changeSport(id: string) {
    setSport(id);
    setScope("local");
    const first = data?.sports.find((s) => s.id === id)?.leagues[0]?.id || "";
    setLeague(
      id === "soccer"
        ? data?.soccerRegions?.find((r) => r.id === region)?.competitions[0] ||
            first
        : first,
    );
  }
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">TABELAS E COMPETIÇÕES</div>
          <h1>Classificações</h1>
          <p>
            Escolha os campeonatos locais ou explore os torneios internacionais.
          </p>
        </div>
      </div>
      {loading && <Loading />}
      {error && (
        <Notice error>
          {error} <button onClick={refresh}>Tentar novamente</button>
        </Notice>
      )}
      {data && (
        <>
          <h2>Escolha seu esporte</h2>
          <div className="sport-cards standings-sports">
            {data.sports.map((s) => (
              <button
                type="button"
                key={s.id}
                className={`sport-card ${sport === s.id ? "selected" : ""}`}
                aria-pressed={sport === s.id}
                onClick={() => changeSport(s.id)}
              >
                <span className="sport-icon">{s.icon}</span>
                <strong>{s.name}</strong>
                <small>
                  {s.leagues.length}{" "}
                  {s.leagues.length === 1 ? "competição" : "competições"}
                </small>
              </button>
            ))}
          </div>
          {sport === "soccer" && (
            <div className="standings-filters">
              <div className="standings-filter">
                <label htmlFor="standings-region">Liga ou região</label>
                <select
                  id="standings-region"
                  value={scope === "local" ? region : ""}
                  onChange={(e) => {
                    const next = e.target.value;
                    setRegion(next);
                    setScope("local");
                    setLeague(
                      data.soccerRegions?.find((r) => r.id === next)
                        ?.competitions[0] || "",
                    );
                  }}
                >
                  <option value="" disabled>
                    Selecione uma região
                  </option>
                  {data.soccerRegions?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <small>Ligas nacionais e competições locais.</small>
              </div>
              {data.soccerInternationalGroups?.map((g) => (
                <div className="standings-filter" key={g.id}>
                  <label htmlFor={`standings-${g.id}`}>{g.name}</label>
                  <select
                    id={`standings-${g.id}`}
                    value={scope === g.id ? league : ""}
                    onChange={(e) => {
                      setScope(g.id);
                      setLeague(e.target.value);
                    }}
                  >
                    <option value="" disabled>
                      Selecione uma competição
                    </option>
                    {g.competitions
                      .map((id) => selected?.leagues.find((l) => l.id === id))
                      .filter((l) => l !== undefined)
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                  </select>
                  <small>
                    {g.id === "americas"
                      ? "Competições entre clubes das Américas."
                      : "Competições entre clubes da Europa e da Ásia."}
                  </small>
                </div>
              ))}
            </div>
          )}
          <div className="section-heading">
            <h2>
              Competições{" "}
              {sport === "soccer" && group
                ? `· ${group.name}`
                : `de ${selected?.name}`}
            </h2>
          </div>
          <div className="standings-leagues">
            {visible?.map((l) => (
              <button
                type="button"
                key={l.id}
                className={`standings-league ${league === l.id ? "selected" : ""}`}
                aria-pressed={league === l.id}
                onClick={() => setLeague(l.id)}
              >
                <span>{selected?.icon}</span>
                <strong>{l.name}</strong>
                <small>
                  {l.hasKnockout
                    ? "Ver fases e classificação →"
                    : "Ver classificação →"}
                </small>
              </button>
            ))}
          </div>
          {!!stateIds.length && (
            <details className="state-championships">
              <summary>
                <Trophy size={22} />
                <span>
                  <strong>Estaduais</strong>
                  <small>
                    Temporada {currentYear} · Escolha seu campeonato
                  </small>
                </span>
                <ChevronDown size={20} />
              </summary>
              <div className="state-championship-options">
                <p>
                  Classificação e fases eliminatórias dos campeonatos estaduais
                  cobertos pela fonte.
                </p>
                <div className="standings-leagues">
                  {stateIds
                    .map((id) => selected?.leagues.find((l) => l.id === id))
                    .filter((l) => l !== undefined)
                    .map((l) => (
                      <button
                        type="button"
                        key={l.id}
                        className={`standings-league ${league === l.id ? "selected" : ""}`}
                        aria-pressed={league === l.id}
                        onClick={() => setLeague(l.id)}
                      >
                        <Trophy size={21} />
                        <strong>{l.name}</strong>
                        <small>{currentYear} · Classificação e fases →</small>
                      </button>
                    ))}
                </div>
                {isState && (
                  <div className="state-championship-results">
                    <div className="section-heading">
                      <h2>
                        {selectedName} · {currentYear}
                      </h2>
                    </div>
                    <StandingsTable
                      key={`${sport}/${league}/${currentYear}`}
                      sport={sport}
                      league={league}
                      season={currentYear}
                    />
                  </div>
                )}
              </div>
            </details>
          )}
          {!isState && (
            <>
              <div className="section-heading">
                <h2>{selectedName}</h2>
              </div>
              {league ? (
                <StandingsTable
                  key={`${sport}/${league}`}
                  sport={sport}
                  league={league}
                />
              ) : (
                <Empty title="Sem competições disponíveis">
                  Escolha outra região ou esporte.
                </Empty>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
