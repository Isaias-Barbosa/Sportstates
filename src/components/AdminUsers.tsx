import { useEffect, useRef, useState } from "react";
import {
  Eye,
  X,
  Search,
  Users,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Notice } from "./shared";
type User = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  role: "admin" | "user";
  banned: boolean;
};
type Result = {
  users: User[];
  page: number;
  pageSize: number;
  total: number;
  verified: number;
};
function createdDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
export default function AdminUsers({ secret }: { secret: string }) {
  const [search, setSearch] = useState(""),
    [q, setQ] = useState(""),
    [status, setStatus] = useState("all"),
    [page, setPage] = useState(1),
    [reload, setReload] = useState(0);
  const [data, setData] = useState<Result | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    const params = new URLSearchParams({ q, status, page: String(page) });
    void fetch("/api/admin/users?" + params, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok)
          throw Error(body.error || "Não foi possível carregar os usuários.");
        return body as Result;
      })
      .then((result) => {
        if (!controller.signal.aborted) {
          if (page > Math.max(1, Math.ceil(result.total / result.pageSize))) {
            setPage(Math.max(1, Math.ceil(result.total / result.pageSize)));
            return;
          }
          setData(result);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Falha ao carregar usuários.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [secret, q, status, page, reload]);
  const [selected, setSelected] = useState<User | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);
  const pages = Math.max(1, Math.ceil((data?.total || 0) / 25));
  return (
    <section className="admin-users" aria-labelledby="admin-users-title">
      <div className="profile-section-title">
        <div>
          <span className="profile-eyebrow">COMUNIDADE SPORTSTATES</span>
          <h2 id="admin-users-title">Usuários cadastrados</h2>
          <p>
            Consulte as contas, a verificação de e-mail e a data de cadastro.
          </p>
        </div>
        <button
          className="broadcast-chip"
          disabled={loading}
          onClick={() => setReload((n) => n + 1)}
        >
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>
      <div className="admin-user-metrics">
        <div>
          <Users size={19} />
          <span>
            <strong>{data?.total ?? "—"}</strong>Contas encontradas
          </span>
        </div>
        <div>
          <CheckCircle2 size={19} />
          <span>
            <strong>{data?.verified ?? "—"}</strong>E-mails verificados
          </span>
        </div>
        <div>
          <Clock3 size={19} />
          <span>
            <strong>{data ? data.total - data.verified : "—"}</strong>
            Verificação pendente
          </span>
        </div>
      </div>
      <form
        className="admin-user-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQ(search.trim());
        }}
      >
        <label>
          <span>Buscar usuário</span>
          <div>
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome ou e-mail"
              maxLength={100}
            />
          </div>
        </label>
        <label>
          <span>Verificação do e-mail</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Todos</option>
            <option value="verified">Verificado</option>
            <option value="pending">Pendente</option>
          </select>
        </label>
        <button className="admin-primary">Buscar</button>
      </form>
      {error && (
        <Notice error>
          {error}{" "}
          <button onClick={() => setReload((n) => n + 1)}>
            Tentar novamente
          </button>
        </Notice>
      )}
      <div
        className="admin-user-table-wrap"
        tabIndex={0}
        role="region"
        aria-label="Tabela de usuários"
        aria-busy={loading}
      >
        <table className="admin-user-table">
          <caption className="sr-only">
            Contas cadastradas no Sportstates
          </caption>
          <thead>
            <tr>
              <th scope="col">Usuário</th>
              <th scope="col">E-mail</th>
              <th scope="col">Perfil</th>
              <th scope="col">Verificação</th>
              <th scope="col">Cadastro</th>
              <th scope="col">Opções</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} role="status">
                  Carregando usuários…
                </td>
              </tr>
            ) : data?.users.length ? (
              data.users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span className="admin-user-identity">
                      <span className="admin-user-avatar" aria-hidden="true">
                        {(u.name || u.email).slice(0, 1).toUpperCase()}
                      </span>
                      <span>
                        <strong>{u.name || "Sem nome informado"}</strong>
                        {u.banned && <small>Conta bloqueada</small>}
                      </span>
                    </span>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span
                      className={
                        "admin-user-badge " +
                        (u.role === "admin" ? "is-admin" : "")
                      }
                    >
                      {u.role === "admin" ? "Administrador" : "Usuário"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={
                        "admin-user-badge " +
                        (u.emailVerified ? "is-verified" : "is-pending")
                      }
                    >
                      {u.emailVerified ? "Verificado" : "Pendente"}
                    </span>
                  </td>
                  <td>{createdDate(u.createdAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="broadcast-chip admin-user-option"
                      aria-label={`Ver detalhes de ${u.name || u.email}`}
                      onClick={() => setSelected(u)}
                    >
                      <Eye size={16} aria-hidden="true" /> Detalhes
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>
                  {error
                    ? "Consulta indisponível."
                    : "Nenhum usuário encontrado para estes filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="admin-user-pagination">
        <span>
          {data?.total ?? 0} contas · Página {page} de {pages}
        </span>
        <div>
          <button
            className="broadcast-chip"
            disabled={loading || page <= 1}
            onClick={() => setPage((n) => n - 1)}
          >
            <ChevronLeft size={15} /> Anterior
          </button>
          <button
            className="broadcast-chip"
            disabled={loading || !data || page >= pages}
            onClick={() => setPage((n) => n + 1)}
          >
            Próxima <ChevronRight size={15} />
          </button>
        </div>
      </div>
      <dialog
        ref={dialog}
        className="admin-user-dialog"
        aria-labelledby="admin-user-dialog-title"
        onClose={() => setSelected(null)}
        onCancel={() => setSelected(null)}
      >
        {selected && (
          <>
            <div className="profile-section-title">
              <div>
                <span className="profile-eyebrow">CONTA SPORTSTATES</span>
                <h2 id="admin-user-dialog-title">Detalhes do usuário</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Fechar detalhes"
                autoFocus
                onClick={() => setSelected(null)}
              >
                <X size={20} />
              </button>
            </div>
            <dl>
              <div>
                <dt>Nome</dt>
                <dd>{selected.name || "Não informado"}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{selected.email}</dd>
              </div>
              <div>
                <dt>Perfil</dt>
                <dd>
                  {selected.role === "admin" ? "Administrador" : "Usuário"}
                </dd>
              </div>
              <div>
                <dt>Verificação do e-mail</dt>
                <dd>{selected.emailVerified ? "Verificado" : "Pendente"}</dd>
              </div>
              <div>
                <dt>Situação da conta</dt>
                <dd>{selected.banned ? "Bloqueada" : "Sem bloqueio"}</dd>
              </div>
              <div>
                <dt>Cadastrado em</dt>
                <dd>{createdDate(selected.createdAt)}</dd>
              </div>
              <div>
                <dt>ID do usuário</dt>
                <dd>{selected.id}</dd>
              </div>
            </dl>
            <button
              type="button"
              className="admin-primary"
              onClick={() => setSelected(null)}
            >
              Fechar
            </button>
          </>
        )}
      </dialog>
    </section>
  );
}
