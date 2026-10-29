import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { sports as fallbackSports } from "../catalog";
import { useApi } from "../hooks";
import type { CompetitionCatalog } from "../types";
import { leagueLinks } from "../league-navigation";

export default function SportsNavigation() {
  const { search, pathname } = useLocation();
  const params = new URLSearchParams(search);
  const [expandedSport, setExpandedSport] = useState<string | null>(
    params.get("sport"),
  );
  const [expandedLeague, setExpandedLeague] = useState<string | null>(
    params.get("sport") && params.get("league")
      ? `${params.get("sport")}/${params.get("league")}`
      : null,
  );
  const { data, loading, error, refresh } = useApi<CompetitionCatalog>(
    "/api/competitions",
    0,
  );
  const sports =
    data?.sports || fallbackSports.map((s) => ({ ...s, leagues: [] }));
  function links(sport: string, league: string, name: string) {
    return (
      <div className="menu-league-links">
        {leagueLinks(sport, league).map((link) => {
          const active =
            pathname === link.to.split("?")[0] &&
            params.get("sport") === sport &&
            (params.get("league") || "all") === league;
          return (
            <Link
              key={link.label}
              to={link.to}
              aria-label={`${link.label} · ${name}`}
              aria-current={active ? "page" : undefined}
              className={active ? "is-current" : ""}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    );
  }
  return (
    <div className="menu-sports">
      {sports.map((s) => {
        const open = expandedSport === s.id;
        return (
          <section className="menu-sport" key={s.id}>
            <button
              type="button"
              className="menu-sport-toggle"
              aria-expanded={open}
              aria-controls={`menu-sport-${s.id}`}
              onClick={() => setExpandedSport(open ? null : s.id)}
            >
              <span aria-hidden="true">{s.icon}</span>
              <strong>{s.name}</strong>
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            {open && (
              <div id={`menu-sport-${s.id}`} className="menu-sport-content">
                <div className="menu-all-leagues">
                  <span>Todas as ligas</span>
                  {links(s.id, "all", s.name)}
                </div>
                {loading && (
                  <p className="menu-catalog-message" role="status">
                    Carregando ligas…
                  </p>
                )}
                {error && (
                  <div className="menu-catalog-message" role="alert">
                    <p>Não foi possível carregar as ligas.</p>
                    <button type="button" onClick={refresh}>
                      Tentar novamente
                    </button>
                  </div>
                )}
                {s.leagues
                  .filter((l) => s.id !== "soccer" || l.teamLeague)
                  .map((l) => {
                    const key = `${s.id}/${l.id}`,
                      expanded = expandedLeague === key;
                    return (
                      <div className="menu-league" key={l.id}>
                        <button
                          type="button"
                          className="menu-league-toggle"
                          aria-expanded={expanded}
                          aria-controls={`menu-league-${s.id}-${l.id}`}
                          onClick={() =>
                            setExpandedLeague(expanded ? null : key)
                          }
                        >
                          <span>{l.name}</span>
                          <ChevronDown size={14} aria-hidden="true" />
                        </button>
                        {expanded && (
                          <div id={`menu-league-${s.id}-${l.id}`}>
                            {links(s.id, l.id, l.name)}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
