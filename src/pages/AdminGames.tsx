import { useEffect, useRef, useState } from "react";
import AdminUsers from "../components/AdminUsers";
import AdminTeams from "../components/AdminTeams";
import AdminNeonLogin from "../components/AdminNeonLogin";
import AdminOverview from "../components/AdminOverview";
import { CalendarDays, Check, Pencil, X } from "lucide-react";
import { useApi, today, time, notifyCacheCleared } from "../hooks";
import { keyOf, sports } from "../catalog";
import {
  Crest,
  Empty,
  Loading,
  Notice,
  matchLabel,
} from "../components/shared";
import type { Match, Scores } from "../types";

type ManualBroadcast = {
  match_key: string;
  channel_name: string;
  url: string;
  reference_url: string;
  reviewed_on: string;
};

export default function AdminGames() {
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheMessage, setCacheMessage] = useState("");
  const [cacheError, setCacheError] = useState(false);
  async function clearCache() {
    if (clearingCache) return;
    setClearingCache(true);
    setCacheMessage("");
    setCacheError(false);
    try {
      const response = await fetch("/api/admin/cache", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Não foi possível limpar o cache.");
      notifyCacheCleared();
      setCacheMessage(
        body.warning ||
          "Cache limpo. Os dados serão atualizados nas próximas consultas.",
      );
    } catch (error) {
      setCacheError(true);
      setCacheMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível limpar o cache.",
      );
    } finally {
      setClearingCache(false);
    }
  }
  const [secret, setSecret] = useState("");
  const [section, setSection] = useState<
    "overview" | "games" | "broadcasts" | "teams" | "users"
  >("overview");
  const [draftSecret, setDraftSecret] = useState("");
  const [date, setDate] = useState(today());
  const [sport, setSport] = useState("all");
  const [selected, setSelected] = useState<Match | null>(null);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [broadcastEditing, setBroadcastEditing] = useState<Match | null>(null);
  const [broadcastChannel, setBroadcastChannel] = useState("");
  const [broadcastUrl, setBroadcastUrl] = useState("");
  const [broadcastReferenceUrl, setBroadcastReferenceUrl] = useState("");
  const [broadcastReviewedOn, setBroadcastReviewedOn] = useState(today());
  const [broadcastError, setBroadcastError] = useState("");
  const [savingBroadcast, setSavingBroadcast] = useState(false);
  const [manualBroadcasts, setManualBroadcasts] = useState<ManualBroadcast[]>(
    [],
  );
  const [manualBroadcastsError, setManualBroadcastsError] = useState("");
  const [manualBroadcastReload, setManualBroadcastReload] = useState(0);
  const closeButton = useRef<HTMLButtonElement>(null);
  const {
    data,
    error: scoreError,
    loading,
  } = useApi<Scores>("/api/scores?date=" + encodeURIComponent(date));
  const { data: feature, refresh } = useApi<{
    key: string | null;
    configured: boolean;
  }>("/api/featured?date=" + encodeURIComponent(date), 0);
  useEffect(() => {
    if (section !== "broadcasts" || !secret) return;
    const controller = new AbortController();
    setManualBroadcasts([]);
    setManualBroadcastsError("");
    const params = new URLSearchParams({ date });
    void fetch("/api/admin/broadcasts?" + params, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            body.error || "Não foi possível consultar fontes manuais.",
          );
        return body.broadcasts as ManualBroadcast[];
      })
      .then((broadcasts) => {
        if (!controller.signal.aborted) setManualBroadcasts(broadcasts);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setManualBroadcastsError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível consultar fontes manuais.",
          );
      });
    return () => controller.abort();
  }, [section, secret, date, manualBroadcastReload]);
  useEffect(() => {
    if (!selected) return;
    closeButton.current?.focus();
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) setSelected(null);
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [selected, saving]);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const r = await fetch("/api/admin/featured", {
        headers: { Authorization: `Bearer ${draftSecret}` },
        cache: "no-store",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setSecret(draftSecret);
      setDraftSecret("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível acessar.");
    }
  }
  async function save() {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const key = keyOf(selected);
      const r = await fetch("/api/admin/featured", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          date,
          key: checked
            ? key
            : feature?.key === key
              ? null
              : feature?.key || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setSelected(null);
      setNotice(
        j.warning ||
          (checked ? "Jogo do Dia atualizado." : "Destaque removido."),
      );
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }
  function editBroadcast(match: Match) {
    const key = keyOf(match);
    const manualLink = match.watch?.links.find(
      (link) => link.id === "admin-manual",
    );
    const manualRecord = manualBroadcasts.find(
      (entry) => entry.match_key === key,
    );
    setBroadcastEditing(match);
    setBroadcastChannel(manualLink?.name || manualRecord?.channel_name || "");
    setBroadcastUrl(manualLink?.url || manualRecord?.url || "");
    setBroadcastReferenceUrl(manualRecord?.reference_url || "");
    setBroadcastReviewedOn(manualRecord?.reviewed_on?.slice(0, 10) || today());
    setBroadcastError("");
  }
  async function saveBroadcast(event: React.FormEvent) {
    event.preventDefault();
    if (!broadcastEditing) return;
    setSavingBroadcast(true);
    setBroadcastError("");
    try {
      const response = await fetch("/api/admin/broadcasts", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          date,
          key: keyOf(broadcastEditing),
          channel: broadcastChannel,
          url: broadcastUrl,
          referenceUrl: broadcastReferenceUrl,
          reviewedOn: broadcastReviewedOn,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Não foi possível salvar a transmissão.");
      setBroadcastEditing(null);
      setNotice(body.warnings?.join(" ") || "Fonte de transmissão atualizada.");
      notifyCacheCleared();
      setManualBroadcastReload((value) => value + 1);
    } catch (cause) {
      setBroadcastError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar a transmissão.",
      );
    } finally {
      setSavingBroadcast(false);
    }
  }
  async function deleteBroadcast() {
    if (!broadcastEditing) return;
    if (!window.confirm("Remover a transmissão manual desta partida?")) return;
    setSavingBroadcast(true);
    setBroadcastError("");
    try {
      const response = await fetch("/api/admin/broadcasts", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ key: keyOf(broadcastEditing) }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.error || "Não foi possível remover a transmissão.",
        );
      setBroadcastEditing(null);
      setNotice(body.warnings?.join(" ") || "Transmissão manual removida.");
      notifyCacheCleared();
      setManualBroadcastReload((value) => value + 1);
    } catch (cause) {
      setBroadcastError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível remover a transmissão.",
      );
    } finally {
      setSavingBroadcast(false);
    }
  }
  if (!secret)
    return (
      <section className="admin-login">
        <div className="eyebrow">ÁREA ADMINISTRATIVA</div>
        <h1>Entrar no painel</h1>
        <p>Entre com a conta administradora do Neon.</p>
        <AdminNeonLogin onLogin={setSecret} />
        <details>
          <summary>Usar chave administrativa</summary>
          <form onSubmit={login}>
            <label>
              Chave de acesso
              <input
                type="password"
                autoComplete="current-password"
                value={draftSecret}
                onChange={(e) => setDraftSecret(e.target.value)}
                required
              />
            </label>
            <button className="admin-primary">Acessar painel</button>
          </form>
          {error && <Notice error>{error}</Notice>}
        </details>
      </section>
    );
  const matches = data?.matches || [];
  const available = sports.filter((s) => matches.some((m) => m.sport === s.id));
  const manualKeys = new Set(
    manualBroadcasts.map((broadcast) => broadcast.match_key),
  );
  const visible = matches.filter(
    (m) =>
      (sport === "all" || m.sport === sport) &&
      (section !== "broadcasts" || m.state !== "finished"),
  );
  const broadcastConfirmedByApi =
    !!broadcastEditing?.watch?.confirmedForMatch &&
    !broadcastEditing.watch.links.some((link) => link.id === "admin-manual");
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">ÁREA ADMINISTRATIVA</div>
          <h1>
            Painel administrativo<span className="green">.</span>
          </h1>
          <p>Gerencie jogos, times e usuários do Sportstates.</p>
        </div>
        <button
          className="quiet-button"
          onClick={() => {
            setSecret("");
            setNotice("");
          }}
        >
          Sair do painel
        </button>
      </div>
      <div className="admin-toolbar">
        <div>
          <strong>Cache de dados</strong>
          <p>
            Limpe para consultar novamente as fontes. Os cadastros são
            preservados.
          </p>
        </div>
        <button
          className="quiet-button"
          onClick={clearCache}
          disabled={clearingCache}
        >
          {clearingCache ? "Limpando…" : "Limpar cache"}
        </button>
      </div>
      {cacheMessage && <Notice error={cacheError}>{cacheMessage}</Notice>}
      <div className="tabs detail-tabs">
        <button
          className={section === "overview" ? "active" : ""}
          onClick={() => setSection("overview")}
        >
          Visão geral
        </button>
        <button
          className={section === "games" ? "active" : ""}
          onClick={() => setSection("games")}
        >
          Jogos do dia
        </button>
        <button
          className={section === "broadcasts" ? "active" : ""}
          onClick={() => setSection("broadcasts")}
        >
          Transmissões
        </button>
        <button
          className={section === "teams" ? "active" : ""}
          onClick={() => setSection("teams")}
        >
          Times
        </button>
        <button
          className={section === "users" ? "active" : ""}
          onClick={() => setSection("users")}
        >
          Usuários
        </button>
      </div>
      {section === "overview" ? (
        <AdminOverview
          secret={secret}
          scores={data}
          scoresLoading={loading}
          scoresError={scoreError}
        />
      ) : section === "users" ? (
        <AdminUsers secret={secret} />
      ) : section === "teams" ? (
        <AdminTeams secret={secret} />
      ) : (
        <>
          <div className="admin-toolbar">
            <label>
              <CalendarDays size={18} />
              <input
                type="date"
                aria-label="Data dos jogos"
                value={date}
                onChange={(e) => {
                  if (e.target.value) {
                    setDate(e.target.value);
                    setNotice("");
                  }
                }}
              />
            </label>
            <p>
              {section === "broadcasts"
                ? "Cadastre uma fonte manual ou complemente as opções já confirmadas para a partida."
                : "Uma partida em destaque por data."}
            </p>
          </div>
          {error && !selected && <Notice error>{error}</Notice>}
          {notice && <Notice>{notice}</Notice>}
          {feature?.configured === false && (
            <Notice error>Armazenamento do destaque não configurado.</Notice>
          )}
          <div className="section-heading">
            <h2>Escolha seu esporte</h2>
          </div>
          <div className="sport-cards">
            <button
              className={"sport-card " + (sport === "all" ? "selected" : "")}
              onClick={() => setSport("all")}
            >
              <strong>Todos os esportes</strong>
              <small>{matches.length} jogos</small>
            </button>
            {available.map((s) => (
              <button
                key={s.id}
                className={"sport-card " + (sport === s.id ? "selected" : "")}
                onClick={() => setSport(s.id)}
              >
                <span className="sport-icon">{s.icon}</span>
                <strong>{s.name}</strong>
                <small>
                  {matches.filter((m) => m.sport === s.id).length} jogos
                </small>
              </button>
            ))}
          </div>
          <div className="admin-list">
            <div className="admin-table-head">
              <span>Partida</span>
              <span>Horário / situação</span>
              <span>Opções</span>
            </div>
            {scoreError && <Notice error>{scoreError}</Notice>}
            {section === "broadcasts" && manualBroadcastsError && (
              <Notice error>{manualBroadcastsError}</Notice>
            )}
            {loading ? (
              <Loading />
            ) : !visible.length ? (
              <Empty
                title={
                  section === "broadcasts"
                    ? "Nenhuma transmissão pendente"
                    : "Nenhum jogo encontrado"
                }
              >
                {section === "broadcasts"
                  ? "Não há partidas não encerradas nesta data."
                  : "Selecione outra data ou esporte."}
              </Empty>
            ) : (
              visible.map((m) => (
                <div className="admin-game" key={keyOf(m)}>
                  <div className="admin-game-name">
                    <Crest team={m.home} />
                    <span>
                      <strong>
                        {m.home.name} × {m.away.name}
                      </strong>
                      <small>
                        {m.leagueName}
                        {feature?.key === keyOf(m) && " · Jogo do Dia"}
                      </small>
                    </span>
                    <Crest team={m.away} />
                  </div>
                  <span>
                    {m.state === "scheduled" ? time(m.date) : matchLabel(m)}
                  </span>
                  <button
                    className="edit-game"
                    aria-label={
                      section === "broadcasts"
                        ? `Informar transmissão de ${m.home.name} x ${m.away.name}`
                        : `Editar ${m.home.name} x ${m.away.name}`
                    }
                    onClick={() => {
                      setError("");
                      if (section === "broadcasts") editBroadcast(m);
                      else {
                        setSelected(m);
                        setChecked(feature?.key === keyOf(m));
                      }
                    }}
                  >
                    <Pencil size={17} />
                    <span>
                      {section === "broadcasts"
                        ? manualKeys.has(keyOf(m)) ||
                          m.watch?.links.some(
                            (link) => link.id === "admin-manual",
                          )
                          ? "Editar fonte"
                          : "Informar fonte"
                        : "Editar"}
                    </span>
                  </button>
                </div>
              ))
            )}
          </div>
          {selected && (
            <div
              className="admin-modal-backdrop"
              onClick={(e) => {
                if (e.target === e.currentTarget && !saving) setSelected(null);
              }}
            >
              <div
                className="admin-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-title"
              >
                <div className="modal-head">
                  <div>
                    <span className="eyebrow">EDITAR PARTIDA</span>
                    <h2 id="edit-title">
                      {selected.home.name} × {selected.away.name}
                    </h2>
                  </div>
                  <button
                    ref={closeButton}
                    className="icon-button"
                    aria-label="Fechar"
                    onClick={() => setSelected(null)}
                    disabled={saving}
                  >
                    <X />
                  </button>
                </div>
                <p>
                  {selected.leagueName} · {time(selected.date)} · Brasília
                </p>
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                  />
                  <span>
                    <strong>Jogo do Dia</strong>
                    <small>
                      Exibir no destaque da home em Todos os esportes.
                    </small>
                  </span>
                </label>
                {checked && feature?.key && feature.key !== keyOf(selected) && (
                  <p>Esta escolha substituirá o destaque atual dessa data.</p>
                )}
                {error && <Notice error>{error}</Notice>}
                <div className="modal-actions">
                  <button onClick={() => setSelected(null)} disabled={saving}>
                    Cancelar
                  </button>
                  <button
                    className="admin-primary"
                    onClick={save}
                    disabled={saving}
                  >
                    <Check size={16} />
                    {saving ? "Salvando…" : "Salvar alteração"}
                  </button>
                </div>
              </div>
            </div>
          )}
          {broadcastEditing && (
            <div
              className="admin-modal-backdrop"
              onClick={(event) => {
                if (event.target === event.currentTarget && !savingBroadcast)
                  setBroadcastEditing(null);
              }}
            >
              <form
                className="admin-modal admin-broadcast-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="broadcast-edit-title"
                onSubmit={saveBroadcast}
              >
                <div className="modal-head">
                  <div>
                    <span className="eyebrow">TRANSMISSÃO DA PARTIDA</span>
                    <h2 id="broadcast-edit-title">
                      {broadcastEditing.home.name} ×{" "}
                      {broadcastEditing.away.name}
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Fechar"
                    onClick={() => setBroadcastEditing(null)}
                    disabled={savingBroadcast}
                  >
                    <X />
                  </button>
                </div>
                <p>
                  {broadcastEditing.leagueName} · {time(broadcastEditing.date)}
                </p>
                <p>
                  Use o nome do canal ou plataforma e um link HTTPS oficial.
                  A fonte manual fica vinculada somente a esta partida.
                </p>
                {broadcastConfirmedByApi && (
                  <Notice>
                    Já existe transmissão confirmada automaticamente. O link
                    manual será adicionado como opção complementar, sem
                    substituir os canais confirmados.
                  </Notice>
                )}
                <label>
                  Canal ou plataforma
                  <input
                    value={broadcastChannel}
                    onChange={(event) =>
                      setBroadcastChannel(event.target.value)
                    }
                    maxLength={80}
                    required
                    placeholder="Ex.: ESPN, Prime Video, canal oficial"
                  />
                </label>
                <label>
                  Link oficial
                  <input
                    type="url"
                    value={broadcastUrl}
                    onChange={(event) => setBroadcastUrl(event.target.value)}
                    maxLength={500}
                    required
                    placeholder="https://..."
                  />
                </label>
                <label>
                  Link da confirmação (opcional)
                  <input
                    type="url"
                    value={broadcastReferenceUrl}
                    onChange={(event) =>
                      setBroadcastReferenceUrl(event.target.value)
                    }
                    maxLength={500}
                    placeholder="https://fonte-oficial.com/programacao"
                  />
                </label>
                <label>
                  Data da revisão
                  <input
                    type="date"
                    value={broadcastReviewedOn}
                    onChange={(event) =>
                      setBroadcastReviewedOn(event.target.value)
                    }
                    required
                  />
                </label>
                {broadcastError && <Notice error>{broadcastError}</Notice>}
                <div className="modal-actions">
                  {manualKeys.has(keyOf(broadcastEditing)) && (
                    <button
                      type="button"
                      onClick={deleteBroadcast}
                      disabled={savingBroadcast}
                    >
                      Remover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setBroadcastEditing(null)}
                    disabled={savingBroadcast}
                  >
                    Cancelar
                  </button>
                  <button
                    className="admin-primary"
                    type="submit"
                    disabled={savingBroadcast}
                  >
                    {savingBroadcast ? "Salvando…" : "Salvar fonte"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </>
  );
}
