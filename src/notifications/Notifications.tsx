import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Bell, BellRing, X } from "lucide-react";
import { Link } from "react-router-dom";
import type { Detail, Match } from "../types";
import { sports } from "../catalog";
import { detectAlerts, matchKey, selectGame, type GameAlert } from "./events";

type Followed = Pick<Match, "sport" | "league" | "id" | "name" | "date"> & {
  system?: boolean;
};
const STORAGE = "sportstates:notifications:v1";
const valid = (v: unknown): v is Followed =>
  !!v &&
  typeof v === "object" &&
  ["sport", "league", "id", "name", "date"].every(
    (k) => typeof (v as Record<string, unknown>)[k] === "string",
  ) &&
  sports.some((s) => s.id === (v as Followed).sport);
function read(): Followed[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE) || "[]");
    if (!Array.isArray(value)) return [];
    const items = value
      .filter(valid)
      .filter((m) => Date.now() - Date.parse(m.date) < 48 * 3600000);
    return items
      .filter(
        (m, i) =>
          m.sport === items[0]?.sport &&
          items.findIndex((v) => matchKey(v) === matchKey(m)) === i,
      )
      .slice(0, 10);
  } catch {
    return [];
  }
}
const Context = createContext<{
  games: Followed[];
  choose: (m?: Match) => void;
}>({ games: [], choose: () => {} });
export function NotificationBell({
  match,
  text = false,
}: {
  match: Match;
  text?: boolean;
}) {
  const { games, choose } = useContext(Context);
  const selected = games.some((g) => matchKey(g) === matchKey(match));
  if (match.state === "finished") return null;
  return (
    <button
      type="button"
      className={`icon-button notification-bell ${selected ? "is-followed" : ""}`}
      aria-label={`${selected ? "Desativar" : "Ativar"} notificações: ${match.home.name} x ${match.away.name}`}
      aria-pressed={selected}
      title={
        selected
          ? "Notificações ativadas"
          : "Receber notificações desta partida"
      }
      onClick={() => choose(match)}
    >
      {selected ? <BellRing size={18} /> : <Bell size={18} />}{" "}
      {text && (
        <span>
          {selected ? "Notificações ativadas" : "Receber notificações"}
        </span>
      )}
    </button>
  );
}
export function NotificationSettingsButton() {
  const { games, choose } = useContext(Context);
  return (
    <button
      className="icon-button notification-bell"
      onClick={() => choose()}
      aria-label={`Gerenciar notificações${games.length ? `: ${games.length} jogos` : ""}`}
      title="Notificações"
    >
      <Bell size={19} />
      {games.length > 0 && (
        <span className="notification-count">{games.length}</span>
      )}
    </button>
  );
}

export default function NotificationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [games, setGames] = useState(read);
  const [open, setOpen] = useState(false);
  const [candidate, setCandidate] = useState<Match>();
  const [message, setMessage] = useState("");
  const [cards, setCards] = useState<GameAlert[]>([]);
  const panel = useRef<HTMLDialogElement>(null);
  const broadcast = useRef<BroadcastChannel | null>(null);
  const [activating, setActivating] = useState(false);
  const baselines = useRef(new Map<string, { detail: Detail; time: number }>());
  const seen = useRef(new Set<string>());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(games));
    } catch {
      setMessage(
        "Não foi possível salvar neste navegador. As escolhas valem apenas nesta sessão.",
      );
    }
  }, [games]);
  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel("sportstates-game-alerts");
    broadcast.current = channel;
    channel.onmessage = ({ data }) => {
      if (
        !data ||
        typeof data.id !== "string" ||
        typeof data.icon !== "string" ||
        typeof data.title !== "string" ||
        typeof data.body !== "string" ||
        typeof data.url !== "string" ||
        !data.url.startsWith("/partida/") ||
        seen.current.has(data.id)
      )
        return;
      seen.current.add(data.id);
      if (seen.current.size > 1000)
        seen.current.delete(seen.current.values().next().value!);
      setCards((old) => [...old, data].slice(-4));
      const timer = setTimeout(() => {
        setCards((old) => old.filter((c) => c.id !== data.id));
        timers.current = timers.current.filter((t) => t !== timer);
      }, 18000);
      timers.current.push(timer);
    };
    return () => {
      broadcast.current = null;
      channel.close();
    };
  }, []);
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === STORAGE) setGames(read());
    };
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("storage", sync);
      timers.current.forEach(clearTimeout);
    };
  }, []);
  useEffect(() => {
    if (open && !panel.current?.open) panel.current?.showModal();
    if (!open && panel.current?.open) panel.current.close();
  }, [open]);
  const choose = (m?: Match) => {
    if (m && games.some((g) => matchKey(g) === matchKey(m))) {
      setGames((gs) => gs.filter((g) => matchKey(g) !== matchKey(m)));
      baselines.current.delete(matchKey(m));
      return;
    }
    setCandidate(m);
    setMessage("");
    setOpen(true);
  };
  const activate = async (requestSystem: boolean) => {
    if (!candidate || activating) return;
    if (games.length >= 10 && games[0]?.sport === candidate.sport) {
      setMessage(
        "Você pode acompanhar até 10 jogos. Remova um para adicionar outro.",
      );
      return;
    }
    setActivating(true);
    // Permission is requested only in response to this explicit activation button.
    let permission = "unsupported";
    if (requestSystem && "Notification" in window) {
      try {
        permission =
          Notification.permission === "default"
            ? await Notification.requestPermission()
            : Notification.permission;
      } catch {
        /* In-page cards remain available. */
      }
    }
    if (permission === "granted" && "serviceWorker" in navigator) {
      try {
        await navigator.serviceWorker.register("/notifications-sw.js");
      } catch {
        /* Fall back to cards. */
      }
    }
    setActivating(false);
    const m = candidate;
    baselines.current.delete(matchKey(m));
    setGames((gs) =>
      selectGame(gs, {
        sport: m.sport,
        league: m.league,
        id: m.id,
        date: m.date,
        name: `${m.home.name} × ${m.away.name}`,
        system: requestSystem && permission === "granted",
      }),
    );
    setCandidate(undefined);
    setMessage(
      permission === "granted"
        ? "Ativado! Acompanhe os alertas com o site aberto. O sistema pode limitar avisos em segundo plano."
        : "Ativado para os cards do site. As notificações do sistema não estão disponíveis ou não foram autorizadas.",
    );
  };
  useEffect(() => {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout>;
    const keys = new Set(games.map(matchKey));
    for (const key of baselines.current.keys())
      if (!keys.has(key)) baselines.current.delete(key);
    const publish = async (alert: GameAlert) => {
      if (seen.current.has(alert.id)) return;
      seen.current.add(alert.id);
      if (seen.current.size > 1000)
        seen.current.delete(seen.current.values().next().value!);
      broadcast.current?.postMessage(alert);
      setCards((old) => [...old, alert].slice(-4));
      const timer = setTimeout(() => {
        setCards((old) => old.filter((c) => c.id !== alert.id));
        timers.current = timers.current.filter((t) => t !== timer);
      }, 18000);
      timers.current.push(timer);
      const mobile = window.matchMedia("(max-width: 700px)").matches;
      if (
        games.some(
          (g) => g.system && `/partida/${matchKey(g)}` === alert.url,
        ) &&
        (mobile || document.hidden) &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          const registration = await navigator.serviceWorker?.getRegistration(
            "/notifications-sw.js",
          );
          if (registration?.active)
            await registration.showNotification(
              `${alert.icon} ${alert.title}`,
              { body: alert.body, tag: alert.id, data: { url: alert.url } },
            );
          else if (!mobile) {
            const n = new Notification(`${alert.icon} ${alert.title}`, {
              body: alert.body,
              tag: alert.id,
            });
            n.onclick = () => {
              window.focus();
              window.location.assign(alert.url);
            };
          }
        } catch {
          /* The visible card is the fallback when the OS refuses delivery. */
        }
      }
    };
    const poll = async () => {
      if (controller.signal.aborted) return;
      await Promise.all(
        games.map(async (game) => {
          if (
            Date.parse(game.date) > Date.now() + 5 * 60000 ||
            Date.now() - Date.parse(game.date) > 48 * 3600000
          )
            return;
          const key = matchKey(game),
            old = baselines.current.get(key);
          if (old?.detail.match.state === "finished") return;
          try {
            const query = new URLSearchParams({
              sport: game.sport,
              league: game.league,
              id: game.id,
            });
            const response = await fetch(`/api/match?${query}`, {
              signal: controller.signal,
            });
            if (!response.ok) return;
            const detail: Detail = await response.json();
            if (
              controller.signal.aborted ||
              !detail.match ||
              !Array.isArray(detail.events) ||
              matchKey(detail.match) !== key ||
              detail.stale
            )
              return;
            const timestamp = Date.parse(detail.fetchedAt);
            if (
              !Number.isFinite(timestamp) ||
              (old && timestamp <= Date.parse(old.detail.fetchedAt))
            )
              return;
            if (
              old &&
              Date.now() - old.time < 120000 &&
              Date.parse(detail.fetchedAt) > Date.parse(old.detail.fetchedAt)
            )
              for (const alert of detectAlerts(old.detail, detail))
                await publish(alert);
            baselines.current.set(key, { detail, time: Date.now() });
          } catch {
            /* Retry on the next cycle; never turn an API failure into a score alert. */
          }
        }),
      );
      if (!controller.signal.aborted) timeout = setTimeout(poll, 30000);
    };
    // One polling tab per origin avoids duplicate system notifications and API calls.
    const run = async () => {
      if (controller.signal.aborted) return;
      baselines.current.clear();
      void poll();
      await new Promise<void>((resolve) =>
        controller.signal.addEventListener("abort", () => resolve(), {
          once: true,
        }),
      );
    };
    if (games.length) {
      if (navigator.locks)
        void navigator.locks
          .request(
            "sportstates-notifications",
            { signal: controller.signal },
            run,
          )
          .catch(() => {});
      else void run();
    }
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [games]);
  const sportName = sports.find((s) => s.id === games[0]?.sport)?.name;
  const switching =
    candidate && games.length > 0 && candidate.sport !== games[0].sport;
  return (
    <Context.Provider value={{ games, choose }}>
      {children}
      <section
        className="notification-stack"
        aria-label="Lances notificados"
        aria-live="polite"
        aria-relevant="additions"
      >
        {cards.map((c) => (
          <article className="game-notification" key={c.id}>
            <span className="game-notification-icon" aria-hidden="true">
              {c.icon}
            </span>
            <div>
              <strong>{c.title}</strong>
              <p>{c.body}</p>
              <Link to={c.url}>Acompanhar partida →</Link>
            </div>
            <button
              className="icon-button"
              aria-label="Fechar notificação"
              onClick={() =>
                setCards((old) => old.filter((v) => v.id !== c.id))
              }
            >
              <X size={16} />
            </button>
          </article>
        ))}
      </section>
      <dialog
        ref={panel}
        className="notification-dialog"
        aria-labelledby="notification-title"
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
      >
        <button
          className="icon-button notification-close"
          onClick={() => setOpen(false)}
          aria-label="Fechar configurações de notificações"
        >
          <X />
        </button>
        <BellRing className="notification-dialog-icon" size={28} />
        <h2 id="notification-title">No ritmo do jogo</h2>
        <p>
          Receba gols, cestas, pontos e cartões vermelhos, além de prorrogação e
          pênaltis no futebol.
        </p>
        <p className="notification-limit">
          Sem login: um esporte por vez, até 10 jogos neste navegador. Mantenha
          o site aberto. A atualização ocorre a cada 30 segundos e depende da
          cobertura da API. Com o site fechado, esta versão não envia avisos.
        </p>
        <p className="notification-limit">
          No computador, os lances aparecem como cards. No celular, o aviso do
          sistema depende da permissão e do suporte do navegador; no iPhone,
          pode exigir instalar o site na tela inicial. No tênis, informamos
          games e sets disponíveis na fonte.
        </p>
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        {candidate && (
          <div className="notification-choice">
            <strong>
              {candidate.home.name} × {candidate.away.name}
            </strong>
            {switching && (
              <p>
                Trocar o esporte substituirá os {games.length} jogos de{" "}
                {sportName} que você está acompanhando.
              </p>
            )}
            <button
              className="notification-action"
              onClick={() => void activate(true)}
              disabled={activating}
            >
              {switching
                ? "Trocar esporte e ativar"
                : "Ativar notificações deste jogo"}
            </button>
            <button
              className="notification-action notification-cards-only"
              disabled={activating}
              onClick={() => void activate(false)}
            >
              {switching
                ? "Trocar esporte e receber apenas cards"
                : "Receber apenas cards neste site"}
            </button>
          </div>
        )}
        <h3>
          {games.length
            ? `Acompanhando · ${sportName}`
            : "Nenhum jogo selecionado"}
        </h3>
        <ul className="notification-games">
          {games.map((g) => (
            <li key={matchKey(g)}>
              <Link
                to={`/partida/${matchKey(g)}`}
                onClick={() => setOpen(false)}
              >
                {g.name}
              </Link>
              <button
                className="icon-button"
                aria-label={`Remover notificações: ${g.name}`}
                onClick={() =>
                  setGames((old) =>
                    old.filter((v) => matchKey(v) !== matchKey(g)),
                  )
                }
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
        {!!games.length && (
          <button
            className="notification-action"
            onClick={() => {
              setGames([]);
              setMessage(
                "Todas as notificações foram desativadas neste navegador.",
              );
            }}
          >
            Desativar todas
          </button>
        )}
      </dialog>
    </Context.Provider>
  );
}
