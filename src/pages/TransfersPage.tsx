import React, { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Globe2,
  LayoutGrid,
  Radio,
  RefreshCw,
  Search,
  Shield,
  Star,
  TrendingUp,
  Info,
  MapPin,
  Clock3,
} from "lucide-react";
import type { Scores, Detail, Transfers } from "../types";
import { useApi, useFavorites, today, time, dateLabel } from "../hooks";
import { sports, keyOf } from "../catalog";
import {
  Crest,
  Notice,
  Empty,
  Loading,
  matchLabel,
} from "../components/shared";
export default function TransfersPage() {
  const [team, setTeam] = useState("33");
  const [input, setInput] = useState("33");
  const [search, setSearch] = useState("");
  const { data, error, loading, refresh } = useApi<Transfers>(
    "/api/transfers?team=" + encodeURIComponent(team),
    0,
  );
  const list = (data?.transfers || []).filter((t) =>
    `${t.player} ${t.from} ${t.to}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">FUTEBOL / MERCADO</div>
          <h1>
            Novas cores.
            <br />
            Novos capítulos<span className="green">.</span>
          </h1>
          <p>
            Transferências registradas por clube, da mais recente à mais antiga.
          </p>
        </div>
        <ArrowDownUp size={56} className="green" />
      </div>
      <div className="transfer-controls">
        <label>
          Clube
          <select
            value={team}
            onChange={(e) => {
              setTeam(e.target.value);
              setInput(e.target.value);
            }}
          >
            <option value="33">Manchester United</option>
            <option value="34">Newcastle</option>
            <option value="40">Liverpool</option>
            <option value="50">Manchester City</option>
            <option value="127">Flamengo</option>
            <option value="121">Palmeiras</option>
            {!["33", "34", "40", "50", "127", "121"].includes(team) && (
              <option value={team}>Clube #{team}</option>
            )}
          </select>
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (/^\d{1,7}$/.test(input)) setTeam(input);
          }}
        >
          <label>
            Outro clube (ID API-Football)
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              required
              pattern="[0-9]{1,7}"
              inputMode="numeric"
            />
          </label>
          <button className="primary-button">Consultar</button>
        </form>
        <label className="search">
          <Search size={16} />
          <input
            placeholder="Buscar jogador ou clube"
            aria-label="Buscar jogador ou clube"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <Notice error>
          {error} <button onClick={refresh}>Tentar novamente</button>
        </Notice>
      ) : data?.configured === false ? (
        <div className="setup-card">
          <span className="promo-icon">
            <ArrowDownUp />
          </span>
          <h2>Pronto para conectar ao mercado.</h2>
          <p>
            Esta página usa dados reais da API-Football e precisa de uma chave
            no servidor.
          </p>
          <code>API_FOOTBALL_KEY=sua_chave</code>
          <p>
            Adicione a variável no arquivo .env local ou nas variáveis da Vercel
            e reinicie ou faça um novo deploy. A chave nunca é enviada ao
            navegador.
          </p>
          <a
            className="primary-button"
            href="https://dashboard.api-football.com/"
            target="_blank"
            rel="noreferrer"
          >
            Obter chave da API ↗
          </a>
          <small>
            O plano gratuito tem cota diária. Consulte a cobertura e as
            condições do provedor.
          </small>
        </div>
      ) : list.length ? (
        <div className="transfer-list">
          {list.map((t, i) => (
            <article key={t.playerId + "-" + t.date + "-" + i}>
              <div className="player-avatar">
                {t.player
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div>
                <h3>{t.player}</h3>
                <small>
                  {t.date} · {t.type || "Valor não informado"}
                </small>
              </div>
              <div className="transfer-clubs">
                <span>{t.from}</span>
                <ArrowRight size={20} />
                <strong>{t.to}</strong>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="Nenhuma transferência encontrada">
          O clube, o filtro ou a cobertura do seu plano podem não ter registros
          disponíveis.
        </Empty>
      )}
      {data?.fetchedAt && (
        <div className="updated">
          API-Football · Consultado às {time(data.fetchedAt)} · Cache de até 6
          horas
        </div>
      )}
    </>
  );
}
