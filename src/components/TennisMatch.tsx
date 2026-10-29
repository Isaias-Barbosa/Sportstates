import { useState } from "react";
import { useApi } from "../hooks";
import type { Match } from "../types";
import "./tennis-match.css";
type Player = {
  id: string;
  name: string;
  country?: string;
  rank?: number | null;
  careerHigh?: number | null;
  heightCm?: number | null;
  birthDate?: string | null;
  hand?: string | null;
  proYear?: number | null;
  photo?: {
    url: string;
    credit: string;
    license: string;
    sourceUrl: string;
    licenseUrl?: string | null;
  } | null;
};
type Insights = {
  players: Player[];
  statistics: { key: string; label: string; home: string; away: string }[];
  currentGame?: {
    home: string;
    away: string;
    server: string | null;
    tiebreak: boolean;
  } | null;
  history: {
    date: string;
    tournament: string;
    home: number;
    away: number;
    round: string;
  }[];
  sourceUrl: string;
  source: string;
  pending: boolean;
  partial?: boolean;
  fetchedAt: string;
  scoreSnapshot?: { number: number; home: number; away: number }[];
};
function Portrait({ player }: { player: Player }) {
  const [failed, setFailed] = useState<string>();
  return (
    <div className="tennis-portrait">
      {player.photo && failed !== player.photo.url ? (
        <img
          src={player.photo.url}
          alt={player.name}
          width={180}
          height={180}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(player.photo!.url)}
        />
      ) : (
        <span aria-label="Foto indisponível">
          {player.name
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")}
        </span>
      )}
    </div>
  );
}
export default function TennisMatch({
  match,
  view,
}: {
  match: Match;
  view: "overview" | "stats";
}) {
  const { data, error, loading, refresh } = useApi<Insights>(
    `/api/tennis-insights?id=${encodeURIComponent(match.id)}`,
    match.state === "live" ? 30000 : 300000,
  );
  const players =
    data?.players ||
    [match.home, match.away].map((p) => ({ id: p.id, name: p.name }) as Player);
  return (
    <section className="tennis-insights" aria-label="Detalhes do tênis">
      {view === "overview" && (
        <>
          <div className="tennis-athletes">
            {players.map((p) => (
              <article className="tennis-athlete" key={p.id}>
                <Portrait player={p} />
                <div>
                  <small>{p.country || "ATP · Simples masculino"}</small>
                  <h3>{p.name}</h3>
                  <dl>
                    {p.rank != null && (
                      <>
                        <dt>Ranking de simples</dt>
                        <dd>#{p.rank}</dd>
                      </>
                    )}
                    {p.careerHigh != null && (
                      <>
                        <dt>Melhor ranking</dt>
                        <dd>#{p.careerHigh}</dd>
                      </>
                    )}
                    {p.birthDate && (
                      <>
                        <dt>Nascimento</dt>
                        <dd>
                          {new Date(
                            p.birthDate + "T12:00:00Z",
                          ).toLocaleDateString("pt-BR", {
                            timeZone: "America/Sao_Paulo",
                          })}
                        </dd>
                      </>
                    )}
                    {p.heightCm != null && (
                      <>
                        <dt>Altura</dt>
                        <dd>{p.heightCm} cm</dd>
                      </>
                    )}
                    {p.hand && (
                      <>
                        <dt>Mão dominante</dt>
                        <dd>{p.hand}</dd>
                      </>
                    )}
                    {p.proYear != null && (
                      <>
                        <dt>Profissional desde</dt>
                        <dd>{p.proYear}</dd>
                      </>
                    )}
                  </dl>
                  {p.photo && (
                    <a
                      className="tennis-credit"
                      href={p.photo.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Foto: {p.photo.credit} · {p.photo.license} ↗
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
          {data?.currentGame && (
            <div className="tennis-current-game" role="status">
              <div>
                <small>
                  {data.currentGame.tiebreak ? "TIE-BREAK" : "GAME ATUAL"}
                </small>
                <strong>
                  {data.currentGame.home} : {data.currentGame.away}
                </strong>
              </div>
              <p>
                {data.currentGame.server
                  ? `🎾 Saque: ${data.currentGame.server === "home" ? match.home.name : match.away.name}`
                  : "Saque não informado"}
                <small>Dados Tennis.com · podem ter atraso</small>
              </p>
            </div>
          )}
        </>
      )}
      <div className="tennis-stat-heading">
        <h2>Estatísticas da partida</h2>
        {data?.fetchedAt && (
          <small>
            Consultado às{" "}
            {new Date(data.fetchedAt).toLocaleTimeString("pt-BR", {
              timeZone: "America/Sao_Paulo",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            BRT
          </small>
        )}
      </div>
      {loading && !data && (
        <p role="status">
          Buscando estatísticas e perfis… O placar continua atualizando.
        </p>
      )}
      {error && (
        <p>
          Não foi possível carregar os detalhes.{" "}
          <button onClick={refresh}>Tentar novamente</button>
        </p>
      )}
      {data?.statistics.length ? (
        <div className="table-scroll">
          <table className="tennis-stats-table">
            <thead>
              <tr>
                <th scope="col">{match.home.name}</th>
                <th scope="col">Indicador</th>
                <th scope="col">{match.away.name}</th>
              </tr>
            </thead>
            <tbody>
              {data.statistics.map((s) => (
                <tr key={s.key}>
                  <td>{s.home}</td>
                  <th scope="row">{s.label}</th>
                  <td>{s.away}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !loading && (
          <p>
            A fonte ainda não disponibilizou as estatísticas detalhadas desta
            partida. Aces, duplas faltas e break points aparecem quando
            publicados.
          </p>
        )
      )}
      {data?.scoreSnapshot?.length ? (
        <p className="tennis-source-note">
          Placar na fonte das estatísticas:{" "}
          {data.scoreSnapshot.map((s) => `${s.home}–${s.away}`).join(" · ")}.{" "}
          {data.pending ? "A fonte sinaliza dados ao vivo pendentes. " : ""}As
          fontes podem atualizar em momentos diferentes.
        </p>
      ) : null}
      {view === "overview" && !!data?.history.length && (
        <div className="tennis-history">
          <h2>Confrontos anteriores disponíveis</h2>
          <p>
            Recorte publicado pela fonte; não representa o histórico completo.
          </p>
          {data.history.map((h) => (
            <div key={h.date + h.tournament}>
              <span>
                {h.tournament}
                <small>
                  {new Date(h.date).toLocaleDateString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </small>
              </span>
              <strong>
                {h.home} × {h.away}
              </strong>
            </div>
          ))}
        </div>
      )}
      {data && (
        <p className="tennis-source-note">
          <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer">
            Estatísticas e perfis: {data.source} ↗
          </a>{" "}
          · Fotos com créditos individuais.
        </p>
      )}
    </section>
  );
}
