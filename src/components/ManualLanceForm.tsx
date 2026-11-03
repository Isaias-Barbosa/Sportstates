
import { useEffect, useState } from "react";

type LanceType =
  | "goal"
  | "penalty"
  | "red_card"
  | "save"
  | "chance"
  | "other";

type Props = {
  initialType: "goal" | "other";
  onClose: () => void;
};

const MAX_FILE_SIZE = 4 * 1024 * 1024;

const acceptedTypes = new Set([
  "image/gif",
  "image/webp",
  "video/mp4",
]);

export default function ManualLanceForm({
  initialType,
  onClose,
}: Props) {
  const [type, setType] = useState<LanceType>(initialType);
  const [minute, setMinute] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState<"url" | "upload">("url");
  const [mediaUrl, setMediaUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");

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
      setError("O arquivo ultrapassa o limite provisório de 4 MB.");
      return;
    }

    setFile(selected);
  }

  const isVideo = file?.type === "video/mp4";

  const validMinute =
    /^(?:\d{1,3})(?:\+\d{1,2})?$/.test(minute.trim());

  const validUrl = (() => {
    if (!mediaUrl.trim()) return false;
    try {
      const parsed = new URL(mediaUrl);
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
    (source === "upload" ? !!file : validUrl) &&
    !error;

  return (
    <section
      className="manual-lance-form"
      aria-label="Formulário de lance"
    >
      <div className="manual-lance-form-header">
        <h3>
          {initialType === "goal"
            ? "Adicionar Gol"
            : "Adicionar Lance na Partida"}
        </h3>

        <button type="button" onClick={onClose}>
          Fechar
        </button>
      </div>

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
        <option value="goal">Gol</option>
        <option value="penalty">Pênalti</option>
        <option value="red_card">Cartão vermelho</option>
        <option value="save">Defesa</option>
        <option value="chance">Chance clara</option>
        <option value="other">Outro lance</option>
      </select>

      <label htmlFor="manual-lance-minute">
        Minuto da partida
      </label>

      <input
        id="manual-lance-minute"
        value={minute}
        onChange={(event) => setMinute(event.target.value)}
        placeholder="Ex.: 87 ou 90+3"
        maxLength={6}
      />

      {minute && !validMinute && (
        <small role="alert">
          Informe um minuto válido, como 45 ou 90+3.
        </small>
      )}

      <label htmlFor="manual-lance-description">
        Descrição
      </label>

      <textarea
        id="manual-lance-description"
        value={description}
        onChange={(event) =>
          setDescription(event.target.value)
        }
        placeholder="Descreva a jogada..."
        maxLength={500}
        rows={3}
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
            URL do GIF ou vídeo
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
            Selecionar arquivo
          </label>

          <input
            key={source}
            id="manual-lance-file"
            type="file"
            accept="image/gif,image/webp,video/mp4,.gif,.webp,.mp4"
            onChange={(event) =>
              selectFile(event.target.files?.[0])
            }
          />

          {file && (
            <p>
              Arquivo selecionado: {file.name}
            </p>
          )}
        </>
      )}

      {source === "upload" && preview && (
        <div className="manual-lance-preview">
          {isVideo ? (
            <video
              src={preview}
              controls
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={preview}
              alt="Prévia do lance"
            />
          )}
        </div>
      )}

      {error && <p role="alert">{error}</p>}

      <div className="manual-lance-form-actions">
        <button type="button" onClick={onClose}>
          Cancelar
        </button>

        <button
          type="button"
          disabled
          title={
            ready
              ? "A gravação será implementada no Passo 5"
              : "Preencha o minuto e a mídia"
          }
        >
          Salvar lance
        </button>
      </div>

      <small>
        Formulário em preparação. O salvamento no Neon
        será habilitado na próxima etapa.
      </small>
    </section>
  );
}
