import { useEffect, useRef, useState } from "react";
import {
  useAccount,
  type NotificationPreferences,
} from "../account/AccountProvider";
import { matchKey } from "./events.mjs";

const STORAGE = "sportstates:push-owner:v1";
const ANNOUNCEMENTS = "sportstates:push-announcements:v1:";
const ENDPOINT = "/api/me/push";
const WORKER = "/notifications-sw.js";

function storedOwner() {
  try {
    return localStorage.getItem(STORAGE);
  } catch {
    return null;
  }
}
function remember(owner: string | null) {
  try {
    if (owner) localStorage.setItem(STORAGE, owner);
    else localStorage.removeItem(STORAGE);
  } catch {
    /* Browser storage is optional for this session. */
  }
}

function publicKeyBytes(key: string) {
  const encoded = key
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(key.length / 4) * 4, "=");
  return Uint8Array.from(atob(encoded), (value) => value.charCodeAt(0));
}

async function subscription() {
  const registration = await navigator.serviceWorker.getRegistration(WORKER);
  return registration?.pushManager.getSubscription();
}

type Game = {
  sport: string;
  league: string;
  id: string;
  date: string;
  system?: boolean;
};

export function useBackgroundPush(
  games: Game[],
  preferences: NotificationPreferences,
  ready: boolean,
) {
  const { user, loading, request } = useAccount();
  const owner = user?.id;
  const [enabledOwner, setEnabledOwner] = useState(storedOwner);
  const [announcementOwner, setAnnouncementOwner] = useState<string>();
  const [publicKey, setPublicKey] = useState<string | null>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [testReceipt, setTestReceipt] = useState("");
  const [synced, setSynced] = useState(false);
  const queue = useRef(Promise.resolve());
  const supported =
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
  const active = !!owner && enabledOwner === owner;
  const announcements = !!owner && announcementOwner === owner;
  const payload = JSON.stringify({
    announcements,
    games: games
      .filter((game) => game.system)
      .map((game) => ({ key: matchKey(game), date: game.date })),
    preferences,
  });

  useEffect(() => {
    if (!owner) return;
    const load = () => {
      try {
        setAnnouncementOwner(
          localStorage.getItem(ANNOUNCEMENTS + owner) === "yes"
            ? owner
            : undefined,
        );
      } catch {
        setAnnouncementOwner(undefined);
      }
    };
    load();
    const sync = (event: StorageEvent) => {
      if (event.key === ANNOUNCEMENTS + owner) load();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [owner]);

  function setAnnouncements(enabled: boolean) {
    if (!owner) return;
    try {
      localStorage.setItem(ANNOUNCEMENTS + owner, enabled ? "yes" : "no");
    } catch {
      /* The selection still applies during this session. */
    }
    setAnnouncementOwner(enabled ? owner : undefined);
  }

  useEffect(() => {
    const syncOwner = (event: StorageEvent) => {
      if (event.key === STORAGE) setEnabledOwner(storedOwner());
    };
    window.addEventListener("storage", syncOwner);
    return () => window.removeEventListener("storage", syncOwner);
  }, []);

  useEffect(() => {
    if (loading || !supported || !enabledOwner || active) return;
    // The browser subscription belongs to one account on a shared device.
    let cancelled = false;
    void subscription()
      .then(async (current) => {
        if (cancelled) return;
        if (current) await current.unsubscribe();
        remember(null);
        setEnabledOwner(null);
        setSynced(false);
      })
      .catch(() =>
        setMessage(
          "Confira a permissão de notificações nas configurações do navegador.",
        ),
      );
    return () => {
      cancelled = true;
    };
  }, [loading, enabledOwner, active, supported]);

  useEffect(() => {
    if (!owner || !supported) return;
    const controller = new AbortController();
    setPublicKey(undefined);
    void fetch("/api/push/config", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) =>
        response.ok ? (await response.json()).publicKey : null,
      )
      .then((key) => {
        if (!controller.signal.aborted)
          setPublicKey(typeof key === "string" ? key : null);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPublicKey(null);
      });
    return () => controller.abort();
  }, [owner, supported]);

  useEffect(() => {
    if (!active || !ready || !supported || !publicKey) return;
    let cancelled = false;
    queue.current = queue.current
      .then(async () => {
        if (cancelled) return;
        const current = await subscription();
        if (cancelled) return;
        if (!current || Notification.permission !== "granted") {
          remember(null);
          setEnabledOwner(null);
          setSynced(false);
          return;
        }
        await request(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save",
            ...JSON.parse(payload),
            subscription: current.toJSON(),
          }),
        });
        if (!cancelled) setSynced(true);
      })
      .catch((error) => {
        if (!cancelled) {
          setSynced(false);
          setMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível sincronizar os alertas.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [active, ready, supported, publicKey, payload, request]);

  useEffect(() => {
    if (!supported || !active) return;
    function receiveTest(event: MessageEvent) {
      if (event.data?.type !== "sportstates-push-test") return;
      setTestReceipt(
        event.data.shown === true
          ? "O navegador recebeu o push e aceitou exibir o aviso."
          : "O navegador recebeu o push, mas não conseguiu exibir o aviso.",
      );
    }
    navigator.serviceWorker.addEventListener("message", receiveTest);
    return () =>
      navigator.serviceWorker.removeEventListener("message", receiveTest);
  }, [supported, active]);

  async function configure(action: "enable" | "remove" | "test" | "local") {
    if (busy || !owner || !supported) return;
    setBusy(true);
    setMessage("");
    try {
      if (action === "local") {
        if (Notification.permission !== "granted")
          throw new Error(
            "Autorize as notificações nas configurações do navegador.",
          );
        const registration =
          await navigator.serviceWorker.getRegistration(WORKER);
        if (!registration?.active)
          throw new Error(
            "Reabra o Sportstates para carregar o serviço de notificações.",
          );
        await registration.showNotification("Teste local do Sportstates", {
          body: "Este aviso foi solicitado diretamente neste dispositivo.",
          icon: "/brand/push-192.png",
          tag: "sportstates-local:" + Date.now(),
          data: { url: "/" },
        });
        setMessage(
          "Aviso local solicitado. Confira a central de notificações.",
        );
        return;
      }
      if (action === "test") {
        setTestReceipt("");
        const registration =
          await navigator.serviceWorker.getRegistration(WORKER);
        await registration?.update().catch(() => {});
      }
      if (action === "enable") {
        if (!publicKey) return;
        const permission =
          Notification.permission === "default"
            ? await Notification.requestPermission()
            : Notification.permission;
        if (permission !== "granted")
          throw new Error(
            "Autorize as notificações nas configurações do navegador.",
          );
        await navigator.serviceWorker.register(WORKER);
        const registration = await navigator.serviceWorker.ready;
        let current = await registration.pushManager.getSubscription();
        const key = publicKeyBytes(publicKey);
        const existingKey = current?.options.applicationServerKey;
        if (
          current &&
          existingKey &&
          new Uint8Array(existingKey).join(",") !== key.join(",")
        ) {
          await current.unsubscribe();
          current = null;
        }
        current ??= await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        });
        await request(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save",
            ...JSON.parse(payload),
            subscription: current.toJSON(),
          }),
        });
        remember(owner);
        setEnabledOwner(owner);
        setSynced(true);
        setMessage("Alertas em segundo plano ativados neste dispositivo.");
      } else {
        await queue.current;
        const current = await subscription();
        if (action === "test" && !current)
          throw new Error("Ative o dispositivo para enviar um teste.");
        if (current) {
          try {
            await request(ENDPOINT, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action, endpoint: current.endpoint }),
            });
          } finally {
            if (action === "remove") {
              await current.unsubscribe();
              remember(null);
              setEnabledOwner(null);
              setSynced(false);
            }
          }
        }
        if (action === "remove") {
          remember(null);
          setEnabledOwner(null);
          setSynced(false);
        }
        setMessage(
          action === "test"
            ? "Teste enviado ao serviço do navegador."
            : "Alertas em segundo plano desativados.",
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o dispositivo.",
      );
    } finally {
      setBusy(false);
    }
  }

  return {
    active,
    delivering: active && synced && !!publicKey,
    supported,
    publicKey,
    busy,
    message,
    testReceipt,
    announcements,
    setAnnouncements,
    configure,
  };
}
