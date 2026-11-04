import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { keyOf } from "../catalog";
import type { Match } from "../types";
import { Loading, Notice } from "./shared";

export default function AdminAnnouncements({
  secret,
  date,
  setDate,
  matches,
  loading,
  error,
}: {
  secret: string;
  date: string;
  setDate: (date: string) => void;
  matches: Match[];
  loading: boolean;
  error?: string;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selected, setSelected] = useState<{ key: string; name: string }[]>([]);
  const [selection, setSelection] = useState("");
  const [publicationId, setPublicationId] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const destination =
    selected.length === 1 ? "/partida/" + selected[0].key : "/";
  const available = matches.filter(
    (match) =>
      /^\d{1,15}$/.test(match.id) &&
      !selected.some(({ key }) => key === keyOf(match)),
  );

  function preview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setMessage("");
    setPublicationId(crypto.randomUUID());
  }

  async function publish() {
    if (!publicationId || saving) return;
    setSaving(true);
    setMessage("");
    setFailed(false);
    try {
      const response = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + secret,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: publicationId,
          title,
          body,
          matches: selected.map(({ key }) => key),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Não foi possível publicar.");
      setMessage(
        result.created
          ? `Informe publicado no sino. Dispositivos na fila de envio: ${result.queued}.`
          : "Este informe já foi publicado.",
      );
      setTitle("");
      setBody("");
      setSelected([]);
      setPublicationId(undefined);
    } catch (error) {
      setFailed(true);
      setMessage(
        error instanceof Error ? error.message : "Não foi possível publicar.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="admin-announcements">
      <h2 id="admin-announcements">Notificações personalizadas</h2>
      <p>
        Publique um informe no sino das contas cadastradas. Dispositivos que
        aceitam informes também recebem um aviso do sistema.
      </p>
      {message && <Notice error={failed}>{message}</Notice>}
      {publicationId ? (
        <div className="admin-modal admin-broadcast-modal">
          <h3>Confirmar publicação</h3>
          <strong>{title.trim()}</strong>
          <p>{body.trim()}</p>
          <p>
            Ao tocar, o usuário abre{" "}
            <Link to={destination}>
              {selected.length === 1 ? selected[0].name : "a Home"}
            </Link>
            .
          </p>
          <button
            className="admin-primary"
            type="button"
            disabled={saving}
            onClick={() => void publish()}
          >
            {saving ? "Publicando…" : "Publicar informe"}
          </button>
          <button
            className="quiet-button"
            type="button"
            disabled={saving}
            onClick={() => setPublicationId(undefined)}
          >
            Voltar à edição
          </button>
        </div>
      ) : (
        <form className="admin-modal admin-broadcast-modal" onSubmit={preview}>
          <label>
            Título
            <input
              required
              maxLength={80}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Brasileirão Série A"
            />
          </label>
          <label>
            Mensagem
            <textarea
              required
              maxLength={240}
              rows={4}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="São Paulo x Corinthians. Hoje, às 21h, acompanhe com a gente."
            />
          </label>
          <label>
            Data das partidas
            <input
              type="date"
              value={date}
              onChange={(event) => {
                if (event.target.value) {
                  setDate(event.target.value);
                  setSelection("");
                }
              }}
            />
          </label>
          {loading && <Loading />}
          {error && <Notice error>{error}</Notice>}
          <label>
            Adicionar partida (opcional)
            <select
              value={selection}
              disabled={!available.length || selected.length >= 10}
              onChange={(event) => setSelection(event.target.value)}
            >
              <option value="">Escolha uma partida</option>
              {available.map((match) => (
                <option key={keyOf(match)} value={keyOf(match)}>
                  {match.home.name} × {match.away.name} · {match.leagueName}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="quiet-button"
            disabled={!selection || selected.length >= 10}
            onClick={() => {
              const match = available.find((game) => keyOf(game) === selection);
              if (match)
                setSelected([
                  ...selected,
                  {
                    key: selection,
                    name: match.home.name + " × " + match.away.name,
                  },
                ]);
              setSelection("");
            }}
          >
            Adicionar à notificação
          </button>
          {selected.length > 0 && (
            <ul className="notification-games">
              {selected.map((match) => (
                <li key={match.key}>
                  <span>{match.name}</span>
                  <button
                    type="button"
                    className="quiet-button"
                    onClick={() =>
                      setSelected(
                        selected.filter(({ key }) => key !== match.key),
                      )
                    }
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
          <small>
            Destino: {selected.length === 1 ? selected[0].name : "Home"}
          </small>
          <button
            className="admin-primary"
            type="submit"
            disabled={!title.trim() || !body.trim()}
          >
            Pré-visualizar informe
          </button>
        </form>
      )}
    </section>
  );
}
