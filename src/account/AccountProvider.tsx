import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { Star, UserRound } from "lucide-react";
import { accountClient, accountToken } from "./client";
export type NotificationPreferences = {
  mode: "all" | "important" | "results";
  score: boolean;
  red: boolean;
  phase: boolean;
  start: boolean;
  finish: boolean;
  period: boolean;
  sound: boolean;
  tone: "stadium" | "whistle" | "soft";
  volume: number;
};
export const defaultNotifications: NotificationPreferences = {
  mode: "important",
  score: true,
  red: true,
  phase: true,
  start: true,
  finish: true,
  period: true,
  sound: false,
  tone: "stadium",
  volume: 0.45,
};
export type Preferences = {
  matches: string[];
  teams: string[];
  sports: string[];
  notifications: NotificationPreferences;
};
export type FavoriteTeam = {
  id: string;
  name: string;
  logo: string;
  sport: string;
  league: string;
};
type User = { id: string; name: string; email: string; emailVerified: boolean };
const empty = (): Preferences => ({
  matches: [],
  teams: [],
  sports: [],
  notifications: { ...defaultNotifications },
});
type Account = {
  user: User | null;
  preferences: Preferences;
  teams: FavoriteTeam[];
  loading: boolean;
  saving: boolean;
  error: string;
  refresh: () => Promise<boolean>;
  mutate: (action: unknown) => Promise<void>;
  request: <T>(url: string, init?: RequestInit) => Promise<T>;
  logout: () => Promise<void>;
};
const Context = createContext<Account | null>(null);
export function useAccount() {
  const account = useContext(Context);
  if (!account) throw Error("Conta indisponível.");
  return account;
}
export default function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [preferences, setPreferences] = useState(empty),
    [teams, setTeams] = useState<FavoriteTeam[]>([]),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const identity = useRef<string | null>(null),
    generation = useRef(0),
    queue = useRef(Promise.resolve()),
    busyRef = useRef(false);
  const request = useCallback(
    async <T,>(url: string, init?: RequestInit): Promise<T> => {
      if (!url.startsWith("/api/me") || url.startsWith("//"))
        throw Error("Destino inválido.");
      const token = await accountToken();
      if (!token) throw Error("Entre na sua conta para continuar.");
      const r = await fetch(url, {
        ...init,
        cache: "no-store",
        headers: { ...init?.headers, Authorization: "Bearer " + token },
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Não foi possível acessar sua conta.");
      return d as T;
    },
    [],
  );
  const refresh = useCallback(async () => {
    if (busyRef.current) return false;
    const run = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const token = await accountToken();
      if (run !== generation.current) return false;
      if (!token) {
        identity.current = null;
        setUser(null);
        setPreferences(empty());
        setTeams([]);
        return false;
      }
      const r = await fetch("/api/me", {
        cache: "no-store",
        headers: { Authorization: "Bearer " + token },
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Não foi possível carregar a conta.");
      if (run !== generation.current) return false;
      identity.current = d.user.id;
      setUser(d.user);
      setPreferences(d.preferences);
      setTeams(d.teams);
      return true;
    } catch (e) {
      if (run === generation.current) {
        identity.current = null;
        setUser(null);
        setPreferences(empty());
        setTeams([]);
        setError(e instanceof Error ? e.message : "Falha ao carregar a conta.");
      }
      return false;
    } finally {
      if (run === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const wake = () => {
      if (!document.hidden) void refresh();
    };
    window.addEventListener("focus", wake);
    return () => {
      generation.current++;
      window.removeEventListener("focus", wake);
    };
  }, [refresh]);
  const mutate = useCallback(
    (action: unknown) => {
      const owner = identity.current;
      if (!owner)
        return Promise.reject(
          Error("Entre na sua conta para salvar suas preferências."),
        );
      const task = queue.current
        .catch(() => {})
        .then(async () => {
          if (identity.current !== owner)
            throw Error("A sessão mudou. Tente novamente.");
          busyRef.current = true;
          generation.current++;
          setLoading(false);
          setSaving(true);
          setError("");
          try {
            const d = await request<{
              preferences: Preferences;
              teams: FavoriteTeam[];
            }>("/api/me", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(action),
            });
            if (identity.current === owner) {
              setPreferences(d.preferences);
              setTeams(d.teams);
            }
          } catch (e) {
            if (identity.current === owner)
              setError(
                e instanceof Error ? e.message : "Não foi possível salvar.",
              );
            throw e;
          } finally {
            busyRef.current = false;
            setSaving(false);
          }
        });
      queue.current = task;
      return task;
    },
    [request],
  );
  const logout = useCallback(async () => {
    const result = await (await accountClient()).signOut();
    if (result.error) throw Error("Não foi possível encerrar a sessão.");
    generation.current++;
    identity.current = null;
    setUser(null);
    setPreferences(empty());
    setTeams([]);
    setError("");
    setLoading(false);
  }, []);
  return (
    <Context.Provider
      value={{
        user,
        preferences,
        teams,
        loading,
        saving,
        error,
        refresh,
        mutate,
        request,
        logout,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function AccountButton() {
  const { user } = useAccount();
  return (
    <Link
      to="/conta"
      className="navbar-login"
      aria-label={user ? "Minha conta" : "Entrar ou criar conta"}
    >
      <UserRound size={17} />
      <span>{user ? "Minha conta" : "Entrar"}</span>
    </Link>
  );
}
export function FavoriteTeamButton({ id }: { id: string }) {
  const { user, preferences, mutate, saving } = useAccount();
  const selected = preferences.teams.includes(id);
  const [message, setMessage] = useState("");
  if (!user)
    return (
      <Link className="broadcast-chip" to="/conta">
        <Star size={16} />
        Entre para seguir este time
      </Link>
    );
  return (
    <>
      <button
        type="button"
        className="broadcast-chip"
        aria-pressed={selected}
        disabled={saving}
        onClick={() => {
          setMessage("");
          void mutate({
            action: "favorite",
            kind: "team",
            id,
            selected: !selected,
          }).catch((e) => setMessage(e.message));
        }}
      >
        <Star size={16} fill={selected ? "currentColor" : "none"} />
        {selected ? "Time favorito" : "Seguir time"}
      </button>
      {message && <p role="alert">{message}</p>}
    </>
  );
}
