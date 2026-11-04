import { Link } from "react-router-dom";
import { useState } from "react";
import { useAccount } from "../account/AccountProvider";
import { HOME_TEAM_LIMIT, selectHomeTeams } from "../account/personalization";
import { useDailySummary, SummaryMatch } from "./DailySummaryPage";
import { keyOf, sports } from "../catalog";
export default function FavoritesPage() {
  const { user, loading, teams, preferences, mutate, saving } = useAccount();
  const [homeError, setHomeError] = useState("");
  const homeTeams = selectHomeTeams(teams, preferences.homeTeams).map(
    (team) => team.id,
  );
  async function toggleHomeTeam(id: string) {
    const next = homeTeams.includes(id)
      ? homeTeams.filter((team) => team !== id)
      : [...homeTeams, id];
    if (next.length > HOME_TEAM_LIMIT) return;
    setHomeError("");
    try {
      await mutate({ action: "home-teams", teams: next });
    } catch (error) {
      setHomeError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a seleção.",
      );
    }
  }
  const summary = useDailySummary();
  const matches = [
    ...new Map(
      [
        ...(summary.data?.live || []),
        ...(summary.data?.upcoming || []),
        ...(summary.data?.results || []),
      ].map((m) => [keyOf(m), m]),
    ).values(),
  ];
  return (
    <div className="account-page">
      <p className="eyebrow">PERTO DE QUEM VOCÊ TORCE</p>
      <h1>Meus favoritos</h1>
      {loading ? (
        <p>Carregando sua conta…</p>
      ) : !user ? (
        <section className="account-card">
          <p>
            Entre para sincronizar seus times e partidas entre dispositivos.
          </p>
          <Link className="admin-primary" to="/conta?next=/favoritos">
            Entrar ou criar conta
          </Link>
        </section>
      ) : (
        <>
          <section className="account-card">
            <h2>Times que você segue</h2>
            {!!teams.length && (
              <p aria-live="polite">
                <strong>
                  {homeTeams.length} de {HOME_TEAM_LIMIT} na Home.
                </strong>{" "}
                {homeTeams.length >= HOME_TEAM_LIMIT
                  ? "Retire um da Home para escolher outro."
                  : "Escolha quais times aparecem na Home."}
              </p>
            )}
            {homeError && <p role="alert">{homeError}</p>}
            <div className="favorite-team-grid">
              {teams.map((t) => (
                <article key={t.id}>
                  <Link to={"/times/" + encodeURIComponent(t.id)}>
                    {t.logo && (
                      <img src={t.logo} width={46} height={46} alt="" />
                    )}
                    <strong>{t.name}</strong>
                    <small>{sports.find((s) => s.id === t.sport)?.name}</small>
                  </Link>
                  <button
                    type="button"
                    className="favorite-home-toggle"
                    aria-pressed={homeTeams.includes(t.id)}
                    aria-label={"Mostrar " + t.name + " na Home"}
                    disabled={
                      saving ||
                      (!homeTeams.includes(t.id) &&
                        homeTeams.length >= HOME_TEAM_LIMIT)
                    }
                    onClick={() => void toggleHomeTeam(t.id)}
                  >
                    {homeTeams.includes(t.id) ? "Na Home ✓" : "Mostrar na Home"}
                  </button>
                  <button
                    disabled={saving}
                    onClick={() =>
                      void mutate({
                        action: "favorite",
                        kind: "team",
                        id: t.id,
                        selected: false,
                      }).catch(() => {})
                    }
                  >
                    Deixar de seguir
                  </button>
                </article>
              ))}
            </div>
            {!teams.length && (
              <p>
                Você ainda não segue um time.{" "}
                <Link to="/times">Encontre seu time →</Link>
              </p>
            )}
          </section>
          <section className="account-card">
            <h2>Partidas salvas</h2>
            {preferences.matches.map((id) => {
              const m = matches.find((m) => keyOf(m) === id);
              return (
                <div key={id}>
                  {m ? (
                    <SummaryMatch match={m} />
                  ) : (
                    <Link className="summary-news" to={"/partida/" + id}>
                      Partida salva ·{" "}
                      {sports.find((s) => s.id === id.split("/")[0])?.name} ·{" "}
                      {id.split("/").at(-1)}
                    </Link>
                  )}
                  <button
                    disabled={saving}
                    onClick={() =>
                      void mutate({
                        action: "favorite",
                        kind: "match",
                        id,
                        selected: false,
                      }).catch(() => {})
                    }
                  >
                    Remover favorito
                  </button>
                </div>
              );
            })}
            {!preferences.matches.length && (
              <p>Use a estrela nos cards dos jogos para salvar uma partida.</p>
            )}
            {summary.error && (
              <p>
                Os nomes de algumas partidas estão indisponíveis. Seus favoritos
                foram preservados.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
