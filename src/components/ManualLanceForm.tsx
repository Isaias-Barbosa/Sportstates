
import { useEffect, useState } from "react";
import { accountToken } from "../account/client";
import type {
  Match,
  MatchHighlights,
  MatchIncident,
  ManualLance,
} from "../types";

type LanceType =
  | "goal"
  | "penalty"
  | "red_card"
  | "save"
  | "chance"
  | "other";

type Props = {
  initialType: "goal" | "other";
  match: Match;
  highlights?: MatchHighlights;
  onClose: () => void;
  onSaved: () => void;
  existing?: ManualLance | null;
};

type ExistingGoal = {
  key: string;
  goal: MatchIncident;
  teamId: string;
  teamName: string;
};

function normalizeMatchMinute(value: string): string {
  const clean = value.trim().replace(/[’′]/g, "'").replace(/\s+/g, "");
  const parsed = /^(\d{1,3})(?:\+(\d{1,2}))?'?(?::[0-5]\d)?$/.exec(clean);
  return parsed
    ? parsed[1] + (parsed[2] ? "+" + parsed[2] : "")
    : "";
}

const MAX_FILE_SIZE = 2_500_000;

const acceptedTypes = new Set([
  "image/gif",
  "image/webp",
  "video/mp4",
]);

export default function ManualLanceForm({
  initialType,
  match,
  highlights,
  onClose,
  onSaved,
  existing,
}: Props) {
  const goals: ExistingGoal[] = [
    ...(highlights?.home || []).map((goal) => ({
      key: `${match.home.id}:${goal.id}`,
      goal,
      teamId: match.home.id,
      teamName: match.home.name,
    })),
    ...(highlights?.away || []).map((goal) => ({
      key: `${match.away.id}:${goal.id}`,
      goal,
      teamId: match.away.id,
      teamName: match.away.name,
    })),
  ]
    .filter(({ goal }) => goal.kind === "goal")
    .sort((a, b) => {
      const minuteValue = (value: string) =>
        (value.match(/\d+/g) || [])
          .reduce((sum, part) => sum + Number(part), 0);

      return (
        (a.goal.period || 0) - (b.goal.period || 0) ||
        (a.goal.order ?? minuteValue(a.goal.minute) * 60) -
          (b.goal.order ?? minuteValue(b.goal.minute) * 60)
      );
    });

  const [selectedGoalKey, setSelectedGoalKey] =
    useState(existing?.eventId ? (goals.find((item) => item.goal.id === existing.eventId)?.key || "manual") : goals[0]?.key || "manual");

  const [type, setType] = useState<LanceType>(
    existing?.lanceType || (initialType === "goal" ? "goal" : "other")
  );

  const [minute, setMinute] = useState(existing?.minute || "");
  const [description, setDescription] = useState(existing?.description || "");

  const [source, setSource] =
    useState<"url" | "upload">(existing?.mediaSource || "url");

  const [mediaUrl, setMediaUrl] = useState(existing?.mediaSource === "url" ? existing.mediaUrl : "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isGoalMode = initialType === "goal";

  const selectedGoal = isGoalMode
    ? goals.find((item) => item.key === selectedGoalKey)
    : undefined;

  const isLinkedGoal = Boolean(selectedGoal);

  const effectiveType: LanceType = isGoalMode
    ? "goal"
    : type;

  const originalMinute = selectedGoal
    ? selectedGoal.goal.minute
    : minute.trim();

  const effectiveMinute = normalizeMatchMinute(originalMinute);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function selectFile(selected?: File) {
    setError("");
    setFile(null);

    if (!selected) return;

    if (!acceptedTypes.has(selected.type)) {
      setError("Escolha um GIF, WebP ou MP4 válido.");
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setError("O arquivo ultrapassa o limite de 2,5 MB.");
      return;
    }

    setFile(selected);
  }

  const validMinute = Boolean(effectiveMinute);

  const validUrl = (() => {
    try {
      const parsed = new URL(mediaUrl.trim());

      return (
        parsed.protocol === "https:" &&
        !parsed.username &&
        !parsed.password
      );
    } catch {
      return false;
    }
  })();

  const ready =
    validMinute &&
    (source === "upload" ? Boolean(file) : validUrl) &&
    !error;


  async function submit() {
    if (!ready || saving) return;
    setSaving(true);
    setError("");
    try {
      const token = await accountToken();
      if (!token) throw Error("Sessão expirada.");
      let mediaBase64;
      if (source === "upload" && file) {
        mediaBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
          reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
          reader.readAsDataURL(file);
        });
      }
      const response = await fetch("/api/lances", {
        method: existing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          id: existing?.id,
          matchId: match.sport + "/" + match.league + "/" + match.id,
          eventId: selectedGoal?.goal.id || null,
          lanceType: effectiveType,
          minute: effectiveMinute,
          description,
          mediaSource: source,
          mediaUrl: source === "url" ? mediaUrl.trim() : null,
          mediaBase64,
          mediaType: file?.type,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Falha ao salvar lance.");
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const matchKey =
    `${match.sport}/${match.league}/${match.id}`;

  return (
    <section
      className="manual-lance-form"
      aria-label="Cadastro de mídia de lance"
    >
      <div className="manual-lance-form-header">
        <h3>
          {isGoalMode
            ? "Adicionar vídeo de gol"
            : "Adicionar lance na partida"}
        </h3>

        <button type="button" onClick={onClose}>
          Fechar
        </button>
      </div>

      <p>
        <strong>{match.home.name}</strong>
        {" × "}
        <strong>{match.away.name}</strong>
      </p>

      {isGoalMode && (
        <>
          <label htmlFor="manual-existing-goal">
            Selecione o gol da partida
          </label>

          <select
            id="manual-existing-goal"
            value={selectedGoalKey}
            onChange={(event) =>
              setSelectedGoalKey(event.target.value)
            }
          >
            {goals.map(({ key, goal, teamName }) => (
              <option key={key} value={key}>
                {goal.minute || "Sem minuto"} -{" "}
                {goal.player} ({teamName})
                {goal.ownGoal
                  ? " - Gol contra"
                  : goal.penalty
                    ? " - Pênalti"
                    : ""}
              </option>
            ))}

            <option value="manual">
              + Gol não registrado na partida
            </option>
          </select>

          {selectedGoal && (
            <div className="manual-lance-selected-goal">
              <strong>
                ⚽ {selectedGoal.goal.player}
              </strong>

              <p>
                {selectedGoal.teamName}
                {" · "}
                {selectedGoal.goal.minute}
              </p>

              <small>
                O vídeo será associado a este gol.
                Não será criado um segundo gol.
              </small>
            </div>
          )}

          {!goals.length && (
            <p>
              Nenhum gol foi identificado automaticamente.
              Você pode cadastrar um lance manual.
            </p>
          )}
        </>
      )}

      {!isGoalMode && (
        <>
          <label htmlFor="manual-lance-type">
            Tipo de lance
          </label>

          <select
            id="manual-lance-type"
            value={type}
            onChange={(event) =>
              setType(event.target.value as LanceType)
            }
          >
            <option value="penalty">Pênalti</option>
            <option value="red_card">Cartão vermelho</option>
            <option value="save">Defesa</option>
            <option value="chance">Chance clara</option>
            <option value="other">Outro lance</option>
          </select>
        </>
      )}

      {isLinkedGoal ? (
        <p>
          <strong>Minuto:</strong>{" "}
          {effectiveMinute || "Não informado pela fonte"}
        </p>
      ) : (
        <>
          <label htmlFor="manual-lance-minute">
            Minuto do lance
          </label>

          <input
            id="manual-lance-minute"
            value={minute}
            maxLength={6}
            onChange={(event) =>
              setMinute(event.target.value)
            }
            placeholder="Ex.: 87 ou 90+3"
          />
        </>
      )}

      {!validMinute && (
        <small role="alert">
          {isLinkedGoal
            ? "O minuto retornado pela fonte não pôde ser interpretado. Tente outro gol ou informe o problema."
            : "Informe um minuto válido, como 45 ou 90+3."}
        </small>
      )}
      {!ready && validMinute && (
        <small role="status">
          {source === "url"
            ? "Adicione um link HTTPS válido para GIF, WebP ou MP4."
            : "Selecione um arquivo GIF, WebP ou MP4 de até 2,5 MB."}
        </small>
      )}

      <label htmlFor="manual-lance-description">
        Descrição (opcional)
      </label>

      <textarea
        id="manual-lance-description"
        rows={3}
        maxLength={500}
        value={description}
        onChange={(event) =>
          setDescription(event.target.value)
        }
        placeholder="Ex.: Finalização de fora da área..."
      />

      <label htmlFor="manual-lance-source">
        Origem da mídia
      </label>

      <select
        id="manual-lance-source"
        value={source}
        onChange={(event) => {
          setSource(event.target.value as "url" | "upload");
          setFile(null);
          setMediaUrl("");
          setError("");
        }}
      >
        <option value="url">Link HTTPS</option>
        <option value="upload">Arquivo do computador</option>
      </select>

      {source === "url" ? (
        <>
          <label htmlFor="manual-lance-url">
            Link do vídeo ou GIF
          </label>

          <input
            id="manual-lance-url"
            type="url"
            value={mediaUrl}
            onChange={(event) =>
              setMediaUrl(event.target.value)
            }
            placeholder="https://exemplo.com/gol.mp4"
          />
        </>
      ) : (
        <>
          <label htmlFor="manual-lance-file">
            Selecionar GIF, WebP ou MP4
          </label>

          <input
            id="manual-lance-file"
            type="file"
            accept=".gif,.webp,.mp4,image/gif,image/webp,video/mp4"
            onChange={(event) =>
              selectFile(event.target.files?.[0])
            }
          />

          {file && <p>Arquivo: {file.name}</p>}
        </>
      )}

      {source === "upload" && preview && (
        <div className="manual-lance-preview">
          {file?.type === "video/mp4" ? (
            <video
              src={preview}
              controls
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={preview}
              alt="Prévia da mídia selecionada"
            />
          )}
        </div>
      )}

      {error && <p role="alert">{error}</p>}

      <div className="manual-lance-form-actions">
        <button type="button" onClick={onClose}>
          Cancelar
        </button>

        <button type="button" disabled={!ready || saving} onClick={() => void submit()}>
          {isLinkedGoal
            ? "Vincular mídia ao gol"
            : "Cadastrar lance"}
        </button>
      </div>

      <small>
        Partida: {matchKey}
        {selectedGoal
          ? ` · Evento: ${selectedGoal.goal.id}`
          : " · Novo evento manual"}
      </small>

      <small>
        Os lances serão salvos no Neon.
      </small>
    </section>
  );
}
