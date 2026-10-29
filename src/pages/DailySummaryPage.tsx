import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "../account/AccountProvider";
import type { FavoriteTeam } from "../account/AccountProvider";
import type { Match } from "../types";
import { dateLabel, time } from "../hooks";
import { matchScore, Crest } from "../components/shared";
import MatchBroadcasts from "../components/MatchBroadcasts";
import { keyOf } from "../catalog";
type Summary = {
  date: string;
  live: Match[];
  upcoming: Match[];
  results: Match[];
  watch: Match[];
  news: {
    title: string;
    url: string;
    published: string;
    sourceName?: string;
  }[];
  teams: FavoriteTeam[];
  partial: boolean;
  onboarding: boolean;
  fetchedAt: string;
};
export function useDailySummary() {
  const { user, request } = useAccount();
  const [state, setState] = useState<{
      owner?: string;
      data?: Summary;
      error?: string;
      loading: boolean;
    }>({ loading: true }),
    [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((r) => r + 1), []);
  useEffect(() => {
    if (!user) {
      setState({ loading: false });
      return;
    }
    const owner = user.id,
      controller = new AbortController();
    setState({ owner, loading: true });
    void request<Summary>("/api/me/summary", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ owner, data, loading: false });
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setState({ owner, error: e.message, loading: false });
      });
    return () => controller.abort();
  }, [user?.id, request, revision]);
  return {
    ...(state.owner === user?.id ? state : { loading: !!user }),
    refresh,
  };
}
export function SummaryMatch({
  match,
  watch = false,
}: {
  match: Match;
  watch?: boolean;
}) {
  return (
    <article className="summary-match">
      <Link to={"/partida/" + keyOf(match)} className="summary-match-link">
        <small>
          {match.leagueName} ·{" "}
          {match.state === "live"
            ? "Ao vivo"
            : match.state === "finished"
              ? "Encerrado"
              : time(match.date) + " BRT"}
        </small>
        <span>
          <Crest team={match.home} />
          <b>{match.home.name}</b>
          <strong>
            {match.state === "scheduled" ? "×" : matchScore(match)}
          </strong>
          <b>{match.away.name}</b>
          <Crest team={match.away} />
        </span>
      </Link>
      {watch && <MatchBroadcasts match={match} />}
    </article>
  );
}
export default function DailySummaryPage() {
  const { user, loading: authLoading } = useAccount();
  const { data, error, loading, refresh } = useDailySummary();
  return (
    <div className="account-page">
      <p className="eyebrow">SEU DIA DE ESPORTE</p>
      <h1>Resumo Diário</h1>
      {authLoading ? (
        <p role="status">Verificando sua conta…</p>
      ) : !user ? (
        <section className="account-card">
          <h2>Um resumo feito para você</h2>
          <p>
            Entre ou crie uma conta para ver a agenda dos seus favoritos,
            resultados, notícias e transmissões confirmadas.
          </p>
          <Link className="admin-primary" to="/conta?next=/resumo-diario">
            Entrar ou criar conta
          </Link>
        </section>
      ) : (
        <>
          <div className="account-actions">
            <p>Olá, {user.name}. Seu esporte em um só lugar.</p>
            <button
              className="broadcast-chip"
              disabled={loading}
              onClick={refresh}
            >
              Atualizar resumo
            </button>
            <Link to="/conta">Personalizar interesses →</Link>
          </div>
          {loading && <p role="status">Preparando seu resumo…</p>}
          {error && (
            <p role="alert">
              {error} <button onClick={refresh}>Tentar novamente</button>
            </p>
          )}
          {data && (
            <>
              {data.onboarding ? (
                <section className="account-card">
                  <h2>Vamos montar seu primeiro resumo?</h2>
                  <p>
                    Escolha seus esportes na conta ou siga um time na página
                    dele. Seus próximos resumos serão personalizados.
                  </p>
                  <Link className="admin-primary" to="/conta">
                    Escolher meus esportes
                  </Link>
                  <Link className="broadcast-chip" to="/times">
                    Encontrar meu time
                  </Link>
                </section>
              ) : (
                <>
                  <p className="muted">
                    {dateLabel(data.date)} · Consultado às{" "}
                    {time(data.fetchedAt)} BRT. Use Atualizar para consultar
                    novamente.
                  </p>
                  {data.partial && (
                    <p className="notice">
                      Algumas fontes estão indisponíveis ou incompletas.
                      Exibindo os dados disponíveis.
                    </p>
                  )}
                  <div className="summary-metrics">
                    <div>
                      <strong>{data.live.length}</strong>Ao vivo
                    </div>
                    <div>
                      <strong>{data.upcoming.length}</strong>Próximos hoje
                    </div>
                    <div>
                      <strong>{data.results.length}</strong>Resultados de hoje e
                      ontem
                    </div>
                    <div>
                      <strong>{data.watch.length}</strong>Com transmissão
                      confirmada
                    </div>
                  </div>
                  {(
                    [
                      ["Ao vivo agora", data.live],
                      ["Próximos jogos de hoje", data.upcoming],
                      ["Resultados de hoje e ontem", data.results],
                    ] as const
                  ).map(([title, matches]) => (
                    <section className="account-card" key={title}>
                      <h2>{title}</h2>
                      {matches.length ? (
                        matches
                          .slice(0, 12)
                          .map((m) => <SummaryMatch key={keyOf(m)} match={m} />)
                      ) : (
                        <p>
                          Nenhuma partida disponível neste recorte dos seus
                          interesses.
                        </p>
                      )}
                    </section>
                  ))}
                  <section className="account-card">
                    <h2>Onde assistir oficialmente</h2>
                    <p>
                      Aqui entram apenas partidas com transmissão identificada
                      para o confronto. Os demais guias continuam disponíveis na
                      página do jogo.
                    </p>
                    {data.watch.length ? (
                      data.watch
                        .slice(0, 8)
                        .map((m) => (
                          <SummaryMatch key={keyOf(m)} match={m} watch />
                        ))
                    ) : (
                      <p>
                        Ainda não há transmissões confirmadas para os jogos
                        deste resumo. Isso não significa que não sejam
                        transmitidos.
                      </p>
                    )}
                  </section>
                  <section className="account-card">
                    <h2>Notícias no seu radar</h2>
                    {data.news.length ? (
                      data.news.map((n) => (
                        <a
                          className="summary-news"
                          href={n.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          key={n.url}
                        >
                          <strong>{n.title}</strong>
                          <small>
                            {n.sourceName || "Ler na fonte original"} ↗
                          </small>
                        </a>
                      ))
                    ) : (
                      <p>
                        Nenhuma notícia correspondente aos seus interesses nas
                        fontes disponíveis.
                      </p>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
