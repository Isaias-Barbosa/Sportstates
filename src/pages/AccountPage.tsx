import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Newspaper,
  Star,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAccount } from "../account/AccountProvider";
import { accountClient } from "../account/client";
import FavoriteAgenda from "../account/FavoriteAgenda";
import PreferencesForm from "../account/PreferencesForm";
import { Notice } from "../components/shared";
export default function AccountPage() {
  const {
    user,
    teams,
    preferences,
    loading,
    refresh,
    logout,
    error: accountError,
    mutate,
    saving,
  } = useAccount();
  const [mode, setMode] = useState<"login" | "signup" | "recover" | "reset">(
      "login",
    ),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [code, setCode] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  function changeMode(nextMode: typeof mode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
    setCode("");
    setShowPassword(false);
  }
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
      if (mode === "recover") {
        await reset();
        return;
      }
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
        const restored = await refresh();
        if (!restored && mode === "login")
          throw Error(
            "O login foi aceito, mas não foi possível carregar sua sessão. Tente novamente; se persistir, confira a verificação do e-mail.",
          );
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
    <div className={`account-page${user ? "" : " account-auth-page"}`}>
      {user && (
        <>
          <p className="eyebrow">SEU ESPORTE. SUA CONTA.</p>
          <h1>Minha conta</h1>
        </>
      )}
      {loading && <p role="status">Verificando sua sessão…</p>}
      {user && (error || accountError) && (
        <Notice error>{error || accountError}</Notice>
      )}
      {user && message && <Notice>{message}</Notice>}
      {user ? (
        <>
          <section className="account-card profile-hero">
            <div className="profile-identity">
              <div className="profile-avatar">
                {teams[0]?.logo ? (
                  <img src={teams[0].logo} alt="Escudo do seu time favorito" />
                ) : (
                  <span>{user.name.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div>
                <span className="profile-eyebrow">
                  SUA ARQUIBANCADA DIGITAL
                </span>
                <h2>Olá, {user.name.split(" ")[0]}.</h2>
                <p>{user.email}</p>
              </div>
            </div>
            <div className="profile-stats">
              <span>
                <strong>{teams.length}</strong>{" "}
                {teams.length === 1 ? "time favorito" : "times favoritos"}
              </span>
              <span>
                <strong>{preferences.leagues?.length || "Todas"}</strong> ligas
              </span>
              <span>
                <strong>{preferences.matches.length}</strong> jogos salvos
              </span>
            </div>
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
          <FavoriteAgenda />
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
          <div className="auth-layout">
            <aside
              className="auth-story"
              aria-label="Sua experiência Sportstates"
            >
              <span className="auth-kicker">
                <span /> MAIS PERTO DO JOGO
              </span>
              <div className="auth-story-copy">
                <p className="auth-overline">SUA TORCIDA TEM LUGAR AQUI.</p>
                <h2>
                  O jogo muda.
                  <br />
                  Sua paixão <em>acompanha.</em>
                </h2>
                <p>
                  Seus times, os lances que importam e um resumo para começar o
                  dia por dentro de tudo.
                </p>
              </div>
              <ul className="auth-benefits">
                <li>
                  <Star size={19} aria-hidden="true" />
                  <span>
                    <strong>Siga sua torcida</strong>Times e jogos favoritos em
                    um só lugar.
                  </span>
                </li>
                <li>
                  <BellRing size={19} aria-hidden="true" />
                  <span>
                    <strong>Sinta cada lance</strong>Escolha os alertas que quer
                    receber.
                  </span>
                </li>
                <li>
                  <Newspaper size={19} aria-hidden="true" />
                  <span>
                    <strong>Comece bem o dia</strong>Um Resumo Diário com o que
                    você acompanha.
                  </span>
                </li>
              </ul>
              <span className="auth-story-footer">
                SPORTSTATES <span>O esporte não para.</span>
              </span>
            </aside>
            <section className="auth-panel" aria-labelledby="auth-title">
              <Link to="/" className="auth-back">
                <ArrowLeft size={15} aria-hidden="true" /> Voltar aos jogos
              </Link>
              {(mode === "login" || mode === "signup") && (
                <div className="auth-switch" aria-label="Acesso à conta">
                  <button
                    type="button"
                    aria-pressed={mode === "login"}
                    disabled={busy}
                    onClick={() => changeMode("login")}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    aria-pressed={mode === "signup"}
                    disabled={busy}
                    onClick={() => changeMode("signup")}
                  >
                    Criar conta
                  </button>
                </div>
              )}
              <div className="auth-intro">
                <span className="auth-step">
                  {mode === "recover" || mode === "reset"
                    ? "RECUPERAR ACESSO"
                    : "SUA CONTA SPORTSTATES"}
                </span>
                <h1 id="auth-title">
                  {mode === "signup"
                    ? "Entre para a torcida."
                    : mode === "recover"
                      ? "Esqueceu a senha?"
                      : mode === "reset"
                        ? "Defina sua nova senha."
                        : "Bom ter você de volta."}
                </h1>
                <p>
                  {mode === "signup"
                    ? "Crie sua conta e acompanhe o esporte do seu jeito."
                    : mode === "recover"
                      ? "Informe seu e-mail. Vamos enviar um código para você recuperar o acesso."
                      : mode === "reset"
                        ? "Digite o código recebido por e-mail e escolha uma nova senha."
                        : "Entre para encontrar seus favoritos e seu Resumo Diário."}
                </p>
              </div>
              <div aria-live="polite" aria-atomic="true">
                {(error || accountError) && (
                  <Notice error>{error || accountError}</Notice>
                )}
                {message && <Notice>{message}</Notice>}
              </div>
              <form
                className="account-form auth-form"
                onSubmit={submit}
                aria-busy={busy}
              >
                <fieldset disabled={busy}>
                  {mode === "signup" && (
                    <label htmlFor="account-name">
                      Seu nome
                      <input
                        id="account-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        maxLength={100}
                        autoComplete="name"
                        placeholder="Como podemos chamar você?"
                      />
                    </label>
                  )}
                  <label htmlFor="account-email">
                    E-mail
                    <input
                      id="account-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="username"
                      placeholder="voce@exemplo.com"
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                  </label>
                  {mode === "reset" && (
                    <label htmlFor="account-code">
                      Código de verificação
                      <input
                        id="account-code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        required
                        placeholder="Código recebido por e-mail"
                      />
                    </label>
                  )}
                  {mode !== "recover" && (
                    <div className="auth-password-group">
                      <div className="auth-label-row">
                        <label htmlFor="account-password">
                          {mode === "reset" ? "Nova senha" : "Senha"}
                        </label>
                        {mode === "login" && (
                          <button
                            type="button"
                            className="auth-text-button"
                            onClick={() => changeMode("recover")}
                          >
                            Esqueci minha senha
                          </button>
                        )}
                      </div>
                      <div className="auth-password">
                        <input
                          id="account-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={mode === "login" ? undefined : 8}
                          autoComplete={
                            mode === "login"
                              ? "current-password"
                              : "new-password"
                          }
                          placeholder={
                            mode === "login"
                              ? "Sua senha"
                              : "Crie uma senha com 8 ou mais caracteres"
                          }
                          aria-describedby={
                            mode === "login" ? undefined : "password-hint"
                          }
                        />
                        <button
                          type="button"
                          aria-label={
                            showPassword ? "Ocultar senha" : "Mostrar senha"
                          }
                          aria-pressed={showPassword}
                          onClick={() => setShowPassword((value) => !value)}
                        >
                          {showPassword ? (
                            <EyeOff size={19} />
                          ) : (
                            <Eye size={19} />
                          )}
                        </button>
                      </div>
                      {mode !== "login" && (
                        <small id="password-hint">
                          Use pelo menos 8 caracteres.
                        </small>
                      )}
                    </div>
                  )}
                  <button type="submit" className="auth-submit">
                    {busy ? (
                      <>
                        <LoaderCircle
                          size={18}
                          className="auth-spinner"
                          aria-hidden="true"
                        />{" "}
                        Aguarde…
                      </>
                    ) : (
                      <>
                        {mode === "signup"
                          ? "Criar minha conta"
                          : mode === "recover"
                            ? "Enviar código por e-mail"
                            : mode === "reset"
                              ? "Salvar nova senha"
                              : "Entrar na minha conta"}
                        <ArrowRight size={18} aria-hidden="true" />
                      </>
                    )}
                  </button>
                </fieldset>
              </form>
              {mode === "reset" && (
                <button
                  type="button"
                  className="auth-text-button auth-resend"
                  disabled={busy}
                  onClick={() => void reset()}
                >
                  Reenviar código
                </button>
              )}
              <div className="auth-bottom">
                {mode === "login" ? (
                  <>
                    Ainda não tem conta?{" "}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => changeMode("signup")}
                    >
                      Crie a sua
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => changeMode("login")}
                  >
                    <ArrowLeft size={14} aria-hidden="true" /> Voltar para
                    entrar
                  </button>
                )}
              </div>
              <p className="auth-security">
                <LockKeyhole size={14} aria-hidden="true" /> Seus favoritos e
                preferências acompanham sua conta.
              </p>
            </section>
          </div>
        )
      )}
    </div>
  );
}
