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
export default function About() {
  return (
    <>
      <div className="eyebrow">TRANSPARÊNCIA EM CAMPO</div>
      <h1>
        De onde vem o jogo<span className="green">?</span>
      </h1>
      <p className="lead">
        Um projeto de estudo, somente leitura, preparado para evoluir com novos
        provedores.
      </p>
      <div className="about-grid">
        <section>
          <Radio />
          <h2>Placares e partidas</h2>
          <p>
            Feeds públicos não oficiais da ESPN. Jogos e detalhes reais, sem
            chave e sem garantia de disponibilidade. Atualização da agenda a
            cada 60 segundos e dos detalhes a cada 30 segundos, com a aba
            visível.
          </p>
          <p>
            A cobertura de comentários, estatísticas e escalações varia. Textos
            dos lances são exibidos no idioma original.
          </p>
          <a
            href="https://github.com/pseudo-r/Public-ESPN-API"
            target="_blank"
            rel="noreferrer"
          >
            Referência comunitária ↗
          </a>
        </section>
        <section>
          <ArrowDownUp />
          <h2>Transferências</h2>
          <p>
            API-Football, com chave apenas no servidor. Consultas por ID do
            clube, com cache de 6 horas. IDs de equipes da ESPN e da
            API-Football são diferentes.
          </p>
          <a
            href="https://www.api-football.com/pricing"
            target="_blank"
            rel="noreferrer"
          >
            Planos e limites ↗
          </a>
        </section>
        <section>
          <Shield />
          <h2>Sem falsa cobertura</h2>
          <p>
            Uma falha de conexão é sinalizada. Nenhum placar ou lance
            demonstrativo substitui silenciosamente dados reais. Horários da
            agenda usam America/Sao_Paulo.
          </p>
          <p>
            Favoritos são salvos apenas neste navegador. Não há login, apostas
            nem alterações nos dados das fontes.
          </p>
        </section>
        <section>
          <TrendingUp />
          <h2>Espaço para crescer</h2>
          <p>
            Provedores isolados do frontend, cache e validação no backend. Para
            produção em escala: fonte licenciada com SLA, cache compartilhado,
            limites por usuário e monitoramento de consumo.
          </p>
          <Link to="/">Explorar os jogos →</Link>
        </section>
      </div>
      <div className="coverage-list">
        <h2>Cobertura inicial</h2>
        <p>
          Futebol: Brasileirão A/B, Premier League, LaLiga, Serie A, Bundesliga,
          Ligue 1 e Champions League. Basquete: NBA e WNBA. Também NFL, MLB e
          NHL. Novas competições são adicionadas no catálogo do servidor.
        </p>
      </div>
    </>
  );
}
