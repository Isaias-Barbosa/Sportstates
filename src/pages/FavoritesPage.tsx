import { Link } from "react-router-dom";
import { useAccount } from "../account/AccountProvider";
import { useDailySummary, SummaryMatch } from "./DailySummaryPage";
import { keyOf, sports } from "../catalog";
export default function FavoritesPage() {
  const { user, loading, teams, preferences, mutate, saving } = useAccount();
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
