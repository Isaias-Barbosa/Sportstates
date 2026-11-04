import { useSearchParams } from "react-router-dom";
import { standingsSelection } from "../league-navigation";
import { ChevronDown, Trophy } from "lucide-react";
import { useApi, today } from "../hooks";
import type { CompetitionCatalog } from "../types";
import { Empty, Loading, Notice } from "../components/shared";
import LeagueOverview from "../components/LeagueOverview";
import StandingsTable from "../components/StandingsTable";

export default function StandingsPage() {
  const { data, loading, error, refresh } = useApi<CompetitionCatalog>(
    "/api/competitions",
    0,
  );
  const [params, setParams] = useSearchParams();
  const { sport, league, selected, scope, region, group } = standingsSelection(
    params,
    data,
  );
  function setLeague(id: string) {
    const next = new URLSearchParams(params);
    next.set("sport", sport);
    next.set("league", id);
    setParams(next);
  }
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
  const selectedCompetition = selected?.leagues.find((l) => l.id === league);
  const selectedName = selectedCompetition?.name || "Classificação";

  function changeSport(id: string) {
    const first = data?.sports.find((s) => s.id === id)?.leagues[0]?.id || "";
    setParams({ sport: id, league: first });
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
              <div className="standings-region-picker">
                <h2>Escolha uma liga ou região</h2>
                <div
                  className="standings-region-nav"
                  aria-label="Ligas e regiões"
                >
                  {data.soccerRegions?.map((r) => {
                    const competitionCount =
                      r.competitions.length +
                      (r.stateCompetitions?.length || 0);
                    return (
                      <button
                        type="button"
                        key={r.id}
                        className={`standings-region-option ${scope === "local" && region === r.id ? "selected" : ""}`}
                        aria-pressed={scope === "local" && region === r.id}
                        onClick={() =>
                          setParams({
                            sport: "soccer",
                            region: r.id,
                            scope: "local",
                            league: r.competitions[0] || "",
                          })
                        }
                      >
                        <strong>{r.name}</strong>
                        <small>
                          {competitionCount}{" "}
                          {competitionCount === 1
                            ? "competição"
                            : "competições"}
                        </small>
                      </button>
                    );
                  })}
                </div>
              </div>
              {data.soccerInternationalGroups?.map((g) => (
                <div className="standings-filter" key={g.id}>
                  <label htmlFor={`standings-${g.id}`}>{g.name}</label>
                  <select
                    id={`standings-${g.id}`}
                    value={scope === g.id ? league : ""}
                    onChange={(e) => {
                      setParams({
                        sport: "soccer",
                        scope: g.id,
                        league: e.target.value,
                      });
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
          {data.warnings?.map((warning) => (
            <Notice key={warning}>{warning}</Notice>
          ))}
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
                {l.tournamentFormat && (
                  <small className="standings-league-format">
                    {l.tournamentFormat}
                  </small>
                )}
                {l.tournamentStarted && (
                  <small className="standings-tournament-started">
                    Torneio iniciado
                  </small>
                )}
                <small className="standings-league-action">
                  {l.hasKnockout
                    ? "Ver fases e classificação →"
                    : "Ver classificação →"}
                </small>
              </button>
            ))}
          </div>
          {!!stateIds.length && (
            <details
              className="state-championships"
              open={isState || undefined}
            >
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
                    <LeagueOverview
                      key={`${sport}/${league}/${currentYear}`}
                      sport={sport}
                      league={league}
                      season={currentYear}
                      statistics={selectedCompetition?.statistics}
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
                <>
                  {selectedCompetition?.tournamentFormat && (
                    <p className="standings-format-note">
                      Formato: {selectedCompetition.tournamentFormat}. A tabela
                      abaixo segue a etapa mais recente disponibilizada pela
                      fonte.
                    </p>
                  )}
                  {selectedCompetition?.provider === "fef" ? (
                    <details
                      className="league-table-panel league-disclosure"
                      open
                    >
                      <summary className="league-panel-heading league-panel-toggle">
                        <span className="league-panel-icon">
                          <Trophy size={20} aria-hidden="true" />
                        </span>
                        <span className="league-panel-copy">
                          <span className="league-panel-title">
                            Classificação e fases
                          </span>
                          <span className="league-panel-subtitle">
                            {selectedName}
                          </span>
                        </span>
                        <ChevronDown
                          className="league-panel-chevron"
                          size={19}
                          aria-hidden="true"
                        />
                      </summary>
                      {selectedCompetition.tournamentSource && (
                        <a
                          className="standings-link"
                          href={selectedCompetition.tournamentSource}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Calendário oficial da FEF ↗
                        </a>
                      )}
                      <StandingsTable
                        key={`${sport}/${league}`}
                        sport={sport}
                        league={league}
                      />
                    </details>
                  ) : (
                    <LeagueOverview
                      key={`${sport}/${league}`}
                      sport={sport}
                      league={league}
                      statistics={selectedCompetition?.statistics}
                    />
                  )}
                </>
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
