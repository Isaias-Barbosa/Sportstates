import { useEffect, useState } from "react";
import { useAccount, type NotificationPreferences } from "./AccountProvider";
import { sports } from "../catalog";
import { playAlertSound, unlockSound } from "../notifications/sound";
export function NotificationPreferencesForm({
  value,
  onSave,
  saving = false,
}: {
  value: NotificationPreferences;
  onSave: (v: NotificationPreferences) => Promise<void> | void;
  saving?: boolean;
}) {
  const [draft, setDraft] = useState(value),
    [message, setMessage] = useState("");
  const valueKey = JSON.stringify(value);
  useEffect(() => setDraft(value), [valueKey]);
  function update<K extends keyof NotificationPreferences>(
    key: K,
    v: NotificationPreferences[K],
  ) {
    setDraft((d) => ({ ...d, [key]: v }));
  }
  return (
    <form
      className="account-form"
      onSubmit={(e) => {
        e.preventDefault();
        void Promise.resolve(onSave(draft))
          .then(() => setMessage("Preferências salvas."))
          .catch(() => setMessage("Não foi possível salvar. Tente novamente."));
      }}
    >
      <h3>Do seu jeito</h3>
      <label>
        Frequência dos alertas
        <select
          value={draft.mode}
          onChange={(e) =>
            update("mode", e.target.value as NotificationPreferences["mode"])
          }
        >
          <option value="important">Momentos importantes</option>
          <option value="all">Todos os eventos selecionados</option>
          <option value="results">Somente início e resultado</option>
        </select>
      </label>
      <p className="muted">
        Momentos importantes evita avisar cada cesta ou ponto. Mantém gols,
        mudanças de fase e fim de período/set quando a fonte informa.
      </p>
      {(
        [
          ["start", "Início da partida"],
          ["finish", "Resultado final"],
          ["score", "Gols, cestas e pontos"],
          ["red", "Cartão vermelho no futebol"],
          ["phase", "Prorrogação e pênaltis no futebol"],
          ["period", "Mudança de período ou set"],
        ] as const
      ).map(([key, label]) => (
        <label className="account-checkbox" key={key}>
          <input
            type="checkbox"
            checked={draft[key]}
            onChange={(e) => update(key, e.target.checked)}
          />
          {label}
        </label>
      ))}
      <label className="account-checkbox">
        <input
          type="checkbox"
          checked={draft.sound}
          onChange={(e) => {
            update("sound", e.target.checked);
            if (e.target.checked)
              void unlockSound().catch(() =>
                setMessage(
                  "Seu navegador bloqueou o áudio. Use o botão de testar som.",
                ),
              );
          }}
        />
        Ativar sons dos alertas
      </label>
      <label>
        Som
        <select
          value={draft.tone}
          onChange={(e) =>
            update("tone", e.target.value as NotificationPreferences["tone"])
          }
        >
          <option value="stadium">Placar</option>
          <option value="whistle">Apito</option>
          <option value="soft">Suave</option>
        </select>
      </label>
      <label>
        Volume: {Math.round(draft.volume * 100)}%
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(draft.volume * 100)}
          onChange={(e) => update("volume", Number(e.target.value) / 100)}
        />
      </label>
      <button
        type="button"
        className="broadcast-chip"
        onClick={() =>
          void unlockSound()
            .then(() => playAlertSound(draft, true))
            .catch(() => setMessage("Não foi possível reproduzir o som."))
        }
      >
        ▶ Testar som
      </button>
      <p className="muted">
        Sons personalizados funcionam com o site aberto e após uma interação. O
        volume e os sons dos avisos do sistema são controlados pelo aparelho.
      </p>
      <button className="admin-primary" disabled={saving}>
        Salvar alertas
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
export default function PreferencesForm() {
  const { preferences, mutate, saving } = useAccount();
  const [selected, setSelected] = useState(preferences.sports),
    [message, setMessage] = useState("");
  const sportsKey = preferences.sports.join("|");
  useEffect(() => setSelected(preferences.sports), [sportsKey]);
  return (
    <div className="account-preferences">
      <section className="account-card">
        <h2>Seus esportes</h2>
        <p>Personalize sua home e o Resumo Diário.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void mutate({ action: "sports", sports: selected })
              .then(() => setMessage("Esportes salvos."))
              .catch(() => setMessage("Não foi possível salvar."));
          }}
        >
          <div className="account-sport-grid">
            {sports.map((s) => (
              <label className="account-checkbox" key={s.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(s.id)}
                  onChange={(e) =>
                    setSelected((old) =>
                      e.target.checked
                        ? [...old, s.id]
                        : old.filter((v) => v !== s.id),
                    )
                  }
                />
                {s.icon} {s.name}
              </label>
            ))}
          </div>
          <button className="admin-primary" disabled={saving}>
            Salvar esportes
          </button>
          {message && <p role="status">{message}</p>}
        </form>
      </section>
      <section className="account-card">
        <NotificationPreferencesForm
          value={preferences.notifications}
          saving={saving}
          onSave={(n) => mutate({ action: "notifications", notifications: n })}
        />
      </section>
    </div>
  );
}
