import { Navigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Loading, Notice, Empty } from "../components/shared";
export type Player = {
  id: string;
  name: string;
  rank: number;
  previous: number;
  points: number;
  photo: string | null;
  flag: string | null;
  country: string;
  age: number | null;
};
export type AthletesData = {
  players: Player[];
  updatedAt: string;
  source: string;
};
export default function TennisAthletesPage() {
  const [params] = useSearchParams();
  const next = new URLSearchParams(params);
  next.set(
    "sport",
    params.get("sport") === "table-tennis" ? "table-tennis" : "tennis",
  );
  return <Navigate to={"/times?" + next} replace />;
}
export function AthletesContent({
  table,
  data,
  loading,
  error,
  refresh,
}: {
  table: boolean;
  data?: AthletesData;
  loading: boolean;
  error?: string;
  refresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(30);
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  const players = (data?.players || []).filter((p) =>
    normalize(p.name + " " + p.country).includes(normalize(query)),
  );
  return (
    <>
      <div className="athletes-section-title">
        <div>
          <div className="eyebrow">
            {table ? "🏓 TÊNIS DE MESA MASCULINO" : "🎾 TÊNIS MASCULINO"}
          </div>
          <h2>{table ? "Atletas da ITTF / WTT" : "Atletas da ATP"}</h2>
          <p>Ranking de simples masculino, pontos e países dos jogadores.</p>
        </div>
      </div>
      <label className="athlete-search">
        Buscar atleta ou país
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(30);
          }}
          placeholder="Nome do atleta ou país"
        />
      </label>
      {loading ? (
        <Loading />
      ) : error && !data ? (
        <Notice error>
          {error}
          <button onClick={refresh}>Tentar novamente</button>
        </Notice>
      ) : !players.length ? (
        <Empty title="Nenhum atleta encontrado">
          Altere o nome ou o país pesquisado.
        </Empty>
      ) : (
        <>
          <div className="tennis-athlete-grid">
            {players.slice(0, limit).map((p) => (
              <article className="tennis-athlete-card" key={p.id}>
                <span className="athlete-rank">#{p.rank}</span>
                {p.photo && (
                  <img
                    className="athlete-photo"
                    src={p.photo}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
                <h2>{p.name}</h2>
                <p>
                  {p.flag && (
                    <img className="athlete-flag" src={p.flag} alt="" />
                  )}
                  {p.country}
                  {p.age ? ` · ${p.age} anos` : ""}
                </p>
                <strong>{p.points.toLocaleString("pt-BR")} pontos</strong>
                <small>
                  {p.previous === p.rank
                    ? "Posição mantida"
                    : p.previous > p.rank
                      ? `↑ Subiu ${p.previous - p.rank} posições`
                      : `↓ Caiu ${p.rank - p.previous} posições`}
                </small>
              </article>
            ))}
          </div>
          {limit < players.length && (
            <button
              className="broadcast-chip"
              onClick={() => setLimit((n) => n + 30)}
            >
              Mostrar mais atletas
            </button>
          )}
          <p className="muted">
            {data?.source}
            {data?.updatedAt
              ? ` · Atualizado em ${new Date(data.updatedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
              : ""}
            . A lista segue a cobertura da fonte.
          </p>
        </>
      )}
    </>
  );
}
