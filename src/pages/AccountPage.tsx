import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAccount } from "../account/AccountProvider";
import { accountClient } from "../account/client";
import PreferencesForm from "../account/PreferencesForm";
import { Notice } from "../components/shared";
export default function AccountPage() {
  const {
    user,
    loading,
    refresh,
    logout,
    error: accountError,
    mutate,
    saving,
  } = useAccount();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login"),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [code, setCode] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [params] = useSearchParams();
  const next = params.get("next");
  const destination =
    next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
      ? next
      : "/resumo-diario";
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const auth = await accountClient();
      const result =
        mode === "signup"
          ? await auth.signUp.email({
              name,
              email,
              password,
              callbackURL: location.origin + "/conta",
            })
          : mode === "reset"
            ? await auth.emailOtp.resetPassword({ email, otp: code, password })
            : await auth.signIn.email({ email, password });
      if (result.error)
        throw Error(
          mode === "signup"
            ? "Não foi possível criar a conta. Confira os dados; se já tiver cadastro, use Entrar ou recupere a senha."
            : mode === "reset"
              ? "Confira o código recebido e tente novamente."
              : "Não foi possível entrar. Confira o e-mail, a senha e a verificação da conta.",
        );
      setPassword("");
      setCode("");
      if (mode === "reset") {
        setMode("login");
        setMessage("Senha atualizada. Entre com a nova senha.");
      } else {
        await refresh();
        setMessage(
          mode === "signup"
            ? "Cadastro enviado. Se a verificação for solicitada, confira seu e-mail antes de entrar."
            : "Você entrou na sua conta.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao acessar a conta.");
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    if (!email) {
      setError("Informe seu e-mail primeiro.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await (
        await accountClient()
      ).emailOtp.requestPasswordReset({ email });
      if (r.error)
        throw Error("Não foi possível enviar o código. Tente novamente.");
      setMode("reset");
      setMessage(
        "Se a conta estiver disponível, o código será enviado ao e-mail informado.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="account-page">
      <p className="eyebrow">SEU ESPORTE. SUA CONTA.</p>
      <h1>{user ? "Minha conta" : "Entre para acompanhar do seu jeito"}</h1>
      {loading && <p role="status">Verificando sua sessão…</p>}
      {(error || accountError) && (
        <Notice error>{error || accountError}</Notice>
      )}
      {message && <Notice>{message}</Notice>}
      {user ? (
        <>
          <section className="account-card">
            <h2>Olá, {user.name}</h2>
            <p>{user.email}</p>
            <div className="account-actions">
              <Link className="admin-primary" to={destination}>
                Abrir Resumo Diário
              </Link>
              <Link className="broadcast-chip" to="/favoritos">
                Meus favoritos
              </Link>
              <button
                className="broadcast-chip"
                onClick={() =>
                  void logout().catch(() =>
                    setError("Não foi possível sair. Tente novamente."),
                  )
                }
              >
                Sair da conta
              </button>
            </div>
          </section>
          <PreferencesForm />
          <section className="account-card">
            <h2>Favoritos deste navegador</h2>
            <p>
              Você pode copiar os jogos salvos antes do login para sua conta. Os
              favoritos já sincronizados serão preservados.
            </p>
            <button
              className="broadcast-chip"
              disabled={saving}
              onClick={() => {
                void (async () => {
                  try {
                    const ids = JSON.parse(
                      localStorage.getItem("sportstates:favorites") || "[]",
                    );
                    if (!Array.isArray(ids)) throw Error();
                    for (const id of ids.slice(0, 200))
                      if (
                        typeof id === "string" &&
                        /^[a-z-]+\/[a-z0-9._-]+\/\d{1,15}$/.test(id)
                      )
                        await mutate({
                          action: "favorite",
                          kind: "match",
                          id,
                          selected: true,
                        });
                    setMessage("Favoritos copiados para sua conta.");
                  } catch {
                    setError(
                      "Não foi possível importar todos os favoritos. Tente novamente.",
                    );
                  }
                })();
              }}
            >
              Importar favoritos do navegador
            </button>
          </section>
        </>
      ) : (
        !loading && (
          <section className="account-card account-login">
            <div className="account-actions">
              <button
                className="broadcast-chip"
                aria-pressed={mode === "login"}
                onClick={() => setMode("login")}
              >
                Entrar
              </button>
              <button
                className="broadcast-chip"
                aria-pressed={mode === "signup"}
                onClick={() => setMode("signup")}
              >
                Criar conta
              </button>
            </div>
            <form className="account-form" onSubmit={submit}>
              {mode === "signup" && (
                <label>
                  Seu nome
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={100}
                    autoComplete="name"
                  />
                </label>
              )}
              <label>
                E-mail
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                />
              </label>
              {mode === "reset" && (
                <label>
                  Código recebido
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                  />
                </label>
              )}
              <label>
                {mode === "reset" ? "Nova senha" : "Senha"}
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                />
              </label>
              <button className="admin-primary" disabled={busy}>
                {busy
                  ? "Aguarde…"
                  : mode === "signup"
                    ? "Criar minha conta"
                    : mode === "reset"
                      ? "Salvar nova senha"
                      : "Entrar"}
              </button>
              <button
                className="broadcast-chip"
                type="button"
                disabled={busy}
                onClick={() => void reset()}
              >
                Receber código para recuperar senha
              </button>
            </form>
            <p>
              Seus favoritos e preferências ficam vinculados à sua conta. O
              Resumo Diário é exclusivo para usuários cadastrados.
            </p>
          </section>
        )
      )}
    </div>
  );
}
