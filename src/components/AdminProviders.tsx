import { AdminCustomSources } from "./AdminStudio";
import { useEffect, useState } from "react";
import type { Scores } from "../types";
import { Notice } from "./shared";

const controls = [
  {
    key: "geFallback",
    title: "ge",
    feature: "Contingência dos placares do Brasileirão Série A",
    url: "https://ge.globo.com/futebol/brasileirao-serie-a/",
  },
  {
    key: "nbb365",
    title: "365Scores",
    feature: "Fonte prioritária para calendário e classificação do NBB",
    url: "https://www.365scores.com/",
  },
  {
    key: "nbbLnb",
    title: "LNB",
    feature: "Fonte oficial alternativa para calendário e classificação do NBB",
    url: "https://lnb.com.br/nbb/tabela-de-jogos/",
  },
] as const;
type Settings = Record<(typeof controls)[number]["key"], boolean>;
type ProviderResponse = {
  settings: Settings;
  writable: boolean;
  warning?: string;
};

const inventory = [
  [
    "ESPN",
    "Placares, detalhes, classificações e estatísticas das competições compatíveis",
    "https://www.espn.com.br/",
  ],
  [
    "CBF",
    "Dados oficiais de competições brasileiras e revisões de partidas",
    "https://www.cbf.com.br/",
  ],
  [
    "365Scores",
    "Calendários e classificações de competições complementares e detalhes do NBB",
    "https://www.365scores.com/",
  ],
  [
    "CBV",
    "Calendário e classificação do vôlei nacional",
    "https://cbv.com.br/",
  ],
  ["ATP", "Tênis e ranking", "https://www.atptour.com/"],
  [
    "ITTF / WTT",
    "Agenda e ranking de tênis de mesa",
    "https://worldtabletennis.com/",
  ],
  ["FEF", "Dados oficiais das copas do Equador", "https://www.fef.ec/"],
] as const;

export default function AdminProviders({
  secret,
  scores,
}: {
  secret: string;
  scores?: Scores;
}) {
  const [saved, setSaved] = useState<ProviderResponse>();
  const [draft, setDraft] = useState<Settings>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  async function request(
    signal?: AbortSignal,
    settings?: Settings,
  ): Promise<ProviderResponse> {
    const response = await fetch("/api/admin/providers", {
      method: settings ? "PUT" : "GET",
      cache: "no-store",
      signal,
      headers: {
        Authorization: `Bearer ${secret}`,
        ...(settings ? { "Content-Type": "application/json" } : {}),
      },
      body: settings ? JSON.stringify(settings) : undefined,
    });
    const result = await response.json();
    if (!response.ok)
      throw Error(result.error || "Não foi possível acessar as fontes.");
    return result;
  }

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    void request(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setSaved(result);
        setDraft(result.settings);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [secret, reload]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || busy || !saved?.writable) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await request(undefined, draft);
      setSaved(result);
      setDraft(result.settings);
      setMessage(
        result.warning ||
          "Opções salvas. As próximas consultas usarão a configuração atualizada após a renovação do cache.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar as opções.",
      );
    } finally {
      setBusy(false);
    }
  }

  const valid = draft && (draft.nbb365 || draft.nbbLnb);
  const changed = controls.some(
    ({ key }) => draft?.[key] !== saved?.settings[key],
  );

  return (
    <section className="admin-overview" aria-labelledby="admin-providers-title">
      <div className="admin-section-heading">
        <div>
          <h2 id="admin-providers-title">APIs e fontes</h2>
          <p>
            Consulte as integrações e escolha quais fontes usar nos fluxos
            configuráveis.
          </p>
        </div>
      </div>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      {!draft &&
        (error ? (
          <button onClick={() => setReload(reload + 1)}>
            Tentar novamente
          </button>
        ) : (
          <p>Carregando opções…</p>
        ))}
      {draft && (
        <form onSubmit={save}>
          <fieldset disabled={busy || !saved?.writable}>
            <legend>Fontes configuráveis</legend>
            <div className="admin-overview-panels">
              {controls.map(({ key, title, feature, url }) => (
                <div key={key} className="admin-overview-panel">
                  <h3>{title}</h3>
                  <p>{feature}</p>
                  <label>
                    <input
                      type="checkbox"
                      checked={draft[key]}
                      onChange={(e) =>
                        setDraft({ ...draft, [key]: e.target.checked })
                      }
                    />{" "}
                    Ativa nesta integração
                  </label>
                  <p>
                    <a href={url} target="_blank" rel="noreferrer">
                      Consultar fonte ↗
                    </a>
                  </p>
                </div>
              ))}
            </div>
            {!valid && (
              <Notice error>Mantenha ao menos uma fonte do NBB ativa.</Notice>
            )}
            <button className="admin-primary" disabled={!valid || !changed}>
              {busy ? "Salvando…" : "Salvar opções"}
            </button>
          </fieldset>
          {!saved?.writable && (
            <p>O Neon precisa estar configurado para gravar as opções.</p>
          )}
        </form>
      )}
      <div className="admin-overview-panels">
        <article className="admin-overview-panel"><h3>Esportes e contingência</h3><p>Brasileirão Série A: ESPN → ge em falha. NBB: 365Scores → LNB para calendário e classificação. Competições com dados oficiais cadastrados também usam os arquivos locais da CBF.</p></article>
        <article className="admin-overview-panel"><h3>Cache e validação</h3><p>Placares ao vivo têm cache mais curto. Fontes complementares usam cache por endpoint e preservam a última resposta válida por até uma hora após o vencimento. O painel conta competições consultadas, e a telemetria de requisições externas fica a cargo do provedor.</p></article>
      </div>
      <AdminCustomSources secret={secret} />
      <h3>Fontes observadas nos placares</h3>
      {scores?.sources?.length ? (
        <ul>
          {[...new Set(scores.sources.map((source) => source.provider))].map(
            (provider) => {
              const rows = scores.sources!.filter(
                (source) => source.provider === provider,
              );
              const warnings = rows.filter(
                (source) => source.state !== "ok",
              ).length;
              return (
                <li key={provider}>
                  <strong>{provider}</strong> · {rows.length} competições
                  consultadas · {warnings} com ressalvas
                </li>
              );
            },
          )}
        </ul>
      ) : (
        <p>Aguardando o resultado da consulta de placares.</p>
      )}
      <h3>Outras integrações de dados</h3>
      <div className="admin-overview-panels">
        {inventory.map(([name, purpose, url]) => (
          <article key={name} className="admin-overview-panel">
            <h4>
              <a href={url} target="_blank" rel="noreferrer">
                {name} ↗
              </a>
            </h4>
            <p>{purpose}</p>
          </article>
        ))}
      </div>
      <h3>Transmissões</h3>
      <p>
        Use a aba Transmissões para cadastrar ou corrigir o canal de uma partida
        com a referência da confirmação.
      </p>
    </section>
  );
}
