import { leagueSelection } from "../league-navigation";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useApi } from "../hooks";
import { Empty, Loading, Notice } from "../components/shared";
import type { ClubProfile, CompetitionCatalog } from "../types";

const teamCount = (count: number) =>
  `${count} ${count === 1 ? "time" : "times"}`;

export default function TeamsPage() {
  const { data, error, loading, refresh } = useApi<{ teams: ClubProfile[] }>(
    "/api/teams",
    60000,
  );
  const {
    data: catalog,
    error: catalogError,
    loading: catalogLoading,
    refresh: refreshCatalog,
  } = useApi<CompetitionCatalog>("/api/competitions", 0);
  const [params, setParams] = useSearchParams();
  const { sport, league: resolvedLeague } = leagueSelection(params, catalog);
  const league =
    params.get("league") === "unassigned" ? "unassigned" : resolvedLeague;
  function setLeague(id: string) {
    const next = new URLSearchParams(params);
    next.set("sport", sport);
    if (id === "all") next.delete("league");
    else next.set("league", id);
    setParams(next);
  }
  function setSport(id: string) {
    setParams({ sport: id });
  }
  const sportTeams = (data?.teams || []).filter(
    (t) => (t.sport || "soccer") === sport,
  );
  const selected = catalog?.sports.find((s) => s.id === sport);
  const leagues = (selected?.leagues || []).filter(
    (l) =>
      l.teamLeague ||
      league === l.id ||
      sportTeams.some((t) => t.league === l.id),
  );
  const unassigned = sportTeams.filter(
    (t) => !selected?.leagues.some((l) => l.id === t.league),
  );
  const groups = leagues
    .filter((l) => league === "all" || league === l.id)
    .map((l) => ({ ...l, teams: sportTeams.filter((t) => t.league === l.id) }));
  const visibleUnassigned = league === "all" || league === "unassigned";
  const visibleTeams =
    league === "unassigned"
      ? unassigned
      : league === "all"
        ? sportTeams
        : sportTeams.filter((t) => t.league === league);
  if (["tennis", "table-tennis"].includes(sport))
    return (
      <Navigate
        to={
          sport === "table-tennis"
            ? "/atletas?sport=table-tennis"
            : "/atletas?sport=tennis&league=atp"
        }
        replace
      />
    );
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">CONHEÇA AS EQUIPES</div>
          <h1>
            Times<span className="green">.</span>
          </h1>
          <p>Escolha um esporte e uma liga para conhecer os times.</p>
        </div>
      </div>
      {loading || catalogLoading ? (
        <Loading />
      ) : error || catalogError ? (
        <Notice error>
          {error || catalogError}{" "}
          <button
            onClick={() => {
              refresh();
              refreshCatalog();
            }}
          >
            Tentar novamente
          </button>
        </Notice>
      ) : (
        <>
          <h2>Escolha seu esporte</h2>
          <div className="sport-cards standings-sports">
            {catalog?.sports.map((s) => (
              <button
                type="button"
                key={s.id}
                className={"sport-card " + (sport === s.id ? "selected" : "")}
                aria-pressed={sport === s.id}
                onClick={() => {
                  setSport(s.id);
                }}
              >
                <span className="sport-icon">{s.icon}</span>
                <strong>{s.name}</strong>
                <small>
                  {teamCount(
                    (data?.teams || []).filter(
                      (t) => (t.sport || "soccer") === s.id,
                    ).length,
                  )}
                </small>
              </button>
            ))}
          </div>
          <div className="section-heading">
            <h2>Escolha sua liga</h2>
          </div>
          <div
            className="standings-leagues team-league-filters"
            aria-label="Filtrar times por liga"
          >
            <button
              type="button"
              className={
                "standings-league " + (league === "all" ? "selected" : "")
              }
              aria-pressed={league === "all"}
              onClick={() => setLeague("all")}
            >
              <span>{selected?.icon}</span>
              <strong>Todas as ligas</strong>
              <small>{teamCount(sportTeams.length)}</small>
            </button>
            {leagues.map((l) => (
              <button
                type="button"
                key={l.id}
                className={
                  "standings-league " + (league === l.id ? "selected" : "")
                }
                aria-pressed={league === l.id}
                onClick={() => setLeague(l.id)}
              >
                <span>{selected?.icon}</span>
                <strong>{l.name}</strong>
                <small>
                  {teamCount(
                    sportTeams.filter((t) => t.league === l.id).length,
                  )}
                </small>
              </button>
            ))}
            {unassigned.length > 0 && (
              <button
                type="button"
                className={
                  "standings-league " +
                  (league === "unassigned" ? "selected" : "")
                }
                aria-pressed={league === "unassigned"}
                onClick={() => setLeague("unassigned")}
              >
                <span>{selected?.icon}</span>
                <strong>Liga não informada</strong>
                <small>{teamCount(unassigned.length)}</small>
              </button>
            )}
          </div>
          {groups
            .filter((g) => g.teams.length)
            .map((group) => (
              <section key={group.id}>
                <div className="section-heading">
                  <h2>{group.name}</h2>
                  <span>{teamCount(group.teams.length)}</span>
                </div>
                <div className="club-grid">
                  {group.teams.map((t) => (
                    <ClubCard
                      key={t.id}
                      team={t}
                      subtitle={t.city || group.name}
                    />
                  ))}
                </div>
              </section>
            ))}
          {visibleUnassigned && unassigned.length > 0 && (
            <section>
              <div className="section-heading">
                <h2>Liga não informada</h2>
              </div>
              <div className="club-grid">
                {unassigned.map((t) => (
                  <ClubCard
                    key={t.id}
                    team={t}
                    subtitle={t.city || "Liga não informada"}
                  />
                ))}
              </div>
            </section>
          )}
          {!visibleTeams.length && (
            <Empty
              title={
                league === "all"
                  ? "Nenhum time cadastrado neste esporte"
                  : "Nenhum time cadastrado nesta liga"
              }
            >
              Os clubes aparecerão aqui após o cadastro no painel.
            </Empty>
          )}
        </>
      )}
    </>
  );
}
function ClubCard({ team, subtitle }: { team: ClubProfile; subtitle: string }) {
  return (
    <Link className="club-card" to={"/times/" + encodeURIComponent(team.id)}>
      {team.logo && <img src={team.logo} alt="" />}
      <div>
        <strong>{team.name}</strong>
        <small>{subtitle}</small>
      </div>
      <span>↗</span>
    </Link>
  );
}
