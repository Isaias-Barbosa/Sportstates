import "./showcase.css";
import {
  showcaseCharacterLimits,
  countShowcaseCharacters,
  trimShowcaseCharacters,
} from "../showcase-text.mjs";
export type ShowcaseDraft = {
  enabled: boolean;
  videoUrl: string;
  kind: "replay" | "sport";
  title: string;
  fontSize: "small" | "medium" | "large";
  characterLimit: number;
};

export default function AdminShowcaseFields({
  value,
  onChange,
  disabled = false,
}: {
  value: ShowcaseDraft;
  onChange: (value: ShowcaseDraft) => void;
  disabled?: boolean;
}) {
  const preview =
    /^https:\/\//i.test(value.videoUrl.trim()) &&
    /\.(mp4|webm)(?:\?|$)/i.test(value.videoUrl.trim());
  const count = countShowcaseCharacters(value.title),
    overLimit = count > value.characterLimit;
  return (
    <fieldset className="admin-showcase-fields" disabled={disabled}>
      <legend>Vitrine com vídeo</legend>
      <label className="admin-check">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(event) =>
            onChange({ ...value, enabled: event.target.checked })
          }
        />
        <span>
          <strong>Usar vídeo no banner da home</strong>
          <small>O banner inteiro leva à página desta partida.</small>
        </span>
      </label>
      {value.enabled && (
        <>
          <label>
            Tipo de vídeo
            <select
              value={value.kind}
              onChange={(event) =>
                onChange({
                  ...value,
                  kind: event.target.value as ShowcaseDraft["kind"],
                })
              }
            >
              <option value="replay">
                Replay ou melhores momentos desta partida
              </option>
              <option value="sport">Vídeo de apresentação do esporte</option>
            </select>
          </label>
          <label>
            Link do vídeo
            <input
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              maxLength={2048}
              value={value.videoUrl}
              placeholder="https://seu-site.com/video.mp4"
              onChange={(event) =>
                onChange({ ...value, videoUrl: event.target.value })
              }
              aria-describedby="showcase-video-help"
            />
          </label>
          <small id="showcase-video-help">
            Use um link direto HTTPS de arquivo MP4 ou WebM. Links de páginas do
            YouTube não funcionam aqui. O vídeo fica sem som e é identificado
            como replay ou vídeo do esporte.
          </small>
          <div className="admin-showcase-typography">
            <label>
              Tamanho da fonte
              <select
                aria-label="Tamanho da fonte"
                value={value.fontSize}
                onChange={(event) =>
                  onChange({
                    ...value,
                    fontSize: event.target.value as ShowcaseDraft["fontSize"],
                  })
                }
              >
                <option value="small">Pequena</option>
                <option value="medium">Média</option>
                <option value="large">Grande</option>
              </select>
            </label>
            <label>
              Limite de caracteres
              <select
                aria-label="Limite de caracteres"
                value={value.characterLimit}
                onChange={(event) =>
                  onChange({
                    ...value,
                    characterLimit: Number(event.target.value),
                  })
                }
              >
                {showcaseCharacterLimits.map((limit) => (
                  <option key={limit} value={limit}>
                    {limit} caracteres
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Chamada do banner <small>(opcional)</small>
            <input
              value={value.title}
              placeholder="Uma noite de clássico. Acompanhe conosco."
              aria-describedby="showcase-title-count"
              aria-invalid={overLimit || undefined}
              onChange={(event) =>
                onChange({
                  ...value,
                  title: overLimit
                    ? event.target.value
                    : trimShowcaseCharacters(
                        event.target.value,
                        value.characterLimit,
                      ),
                })
              }
            />
          </label>
          <div
            className={
              "admin-showcase-counter" + (overLimit ? " is-over-limit" : "")
            }
          >
            <small id="showcase-title-count" role="status">
              {count} / {value.characterLimit} caracteres
            </small>
            {overLimit && (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    title: trimShowcaseCharacters(
                      value.title,
                      value.characterLimit,
                    ),
                  })
                }
              >
                Ajustar ao limite
              </button>
            )}
          </div>
          {overLimit && (
            <small role="alert">
              A chamada ultrapassa o limite. Reduza o texto ou escolha um limite
              maior antes de salvar.
            </small>
          )}
          <small>
            Sem chamada personalizada, o banner mostra os nomes dos times.
          </small>
          <div
            className="admin-showcase-title-preview"
            data-title-size={value.fontSize}
          >
            <span>Prévia da chamada</span>
            <h3>{value.title || "O próximo grande jogo começa aqui."}</h3>
          </div>
          {preview && (
            <div className="admin-showcase-preview">
              <span>Prévia do vídeo</span>
              <video
                key={value.videoUrl}
                src={value.videoUrl.trim()}
                controls
                muted
                playsInline
                preload="none"
                poster="/brand/stadium-viva.webp"
              />
              <small>
                Na home, o vídeo reproduz sem som e o clique abre o jogo.
              </small>
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}
