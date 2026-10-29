import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Star } from "lucide-react";
import { useAccount, type FavoriteTeam } from "./AccountProvider";
import { useApi } from "../hooks";
import type { ClubDetails, CompetitionCatalog } from "../types";
import { GameList } from "../pages/TeamPage";
function TeamAgenda({ team }: { team: FavoriteTeam }) {
  const { data, error, loading, refresh } = useApi<ClubDetails>(
    "/api/team?id=" + encodeURIComponent(team.id),
    60000,
  );
  const [view, setView] = useState<"upcoming" | "results">("upcoming");
  return (
    <div className="profile-agenda">
      <div className="profile-section-title">
        <h3>
          <CalendarDays size={18} aria-hidden="true" /> Jogos de {team.name}
        </h3>
        <div className="profile-agenda-tabs">
          <button
            aria-pressed={view === "upcoming"}
            onClick={() => setView("upcoming")}
          >
            Próximos
          </button>
          <button
            aria-pressed={view === "results"}
            onClick={() => setView("results")}
          >
            Resultados
          </button>
        </div>
      </div>
      {loading ? (
        <p role="status">Carregando agenda do time…</p>
      ) : error ? (
        <p role="alert">
          Não foi possível atualizar a agenda.{" "}
          <button onClick={refresh}>Tentar novamente</button>
        </p>
      ) : (
        data && (
          <GameList
            matches={(view === "upcoming" ? data.upcoming : data.recent).slice(
              0,
              5,
            )}
            empty={
              view === "upcoming"
                ? "Ainda não há próximos jogos disponíveis"
                : "Ainda não há resultados disponíveis"
            }
          />
        )
      )}
    </div>
  );
}
export default function FavoriteAgenda() {
  const { teams, mutate, saving } = useAccount();
  const { data: catalog } = useApi<CompetitionCatalog>("/api/competitions", 0);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const team = teams.find((t) => t.id === selected) || teams[0];
  const leagueName = (t: FavoriteTeam) =>
    catalog?.sports
      .find((s) => s.id === t.sport)
      ?.leagues.find((l) => l.id === t.league)?.name || t.league;
  return (
    <section className="account-card profile-following">
      <div className="profile-section-title">
        <div>
          <span className="profile-eyebrow">SUA TORCIDA</span>
          <h2>Seus times em campo</h2>
        </div>
        <Link className="broadcast-chip" to="/times">
          <Star size={15} /> Escolher time
        </Link>
      </div>
      <p>
        Um favorito por liga. A agenda reúne os jogos do time nas competições em
        que ele participa.
      </p>
      {teams.length ? (
        <>
          <div
            className="profile-team-picker"
            aria-label="Escolher agenda de um time"
          >
            {teams.map((t) => (
              <button
                key={t.id}
                aria-pressed={team?.id === t.id}
                onClick={() => setSelected(t.id)}
              >
                {t.logo && <img src={t.logo} width={36} height={36} alt="" />}
                <span>
                  <strong>{t.name}</strong>
                  <small>{leagueName(t)}</small>
                </span>
              </button>
            ))}
          </div>
          {team && (
            <>
              <div className="profile-team-actions">
                <Link to={"/times/" + encodeURIComponent(team.id)}>
                  Ver página de {team.name} →
                </Link>
                <button
                  disabled={saving}
                  onClick={() => {
                    setError("");
                    void mutate({
                      action: "favorite",
                      kind: "team",
                      id: team.id,
                      selected: false,
                    }).catch(() =>
                      setError("Não foi possível remover o favorito."),
                    );
                  }}
                >
                  Deixar de seguir
                </button>
              </div>
              <TeamAgenda key={team.id} team={team} />
            </>
          )}
          {error && <p role="alert">{error}</p>}
        </>
      ) : (
        <div className="profile-empty">
          <Star size={30} />
          <h3>Qual é o seu time?</h3>
          <p>
            Abra a página de um time e toque em Favoritar time. Os próximos
            jogos aparecerão aqui.
          </p>
          <Link className="admin-primary" to="/times">
            Encontrar meu time →
          </Link>
        </div>
      )}
    </section>
  );
}
