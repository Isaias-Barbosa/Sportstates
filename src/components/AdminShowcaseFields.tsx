import "./showcase.css";
export type ShowcaseDraft = {
  enabled: boolean;
  videoUrl: string;
  kind: "replay" | "sport";
  title: string;
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
          <label>
            Chamada do banner <small>(opcional)</small>
            <input
              maxLength={88}
              value={value.title}
              placeholder="Uma noite de clássico. Acompanhe conosco."
              onChange={(event) =>
                onChange({ ...value, title: event.target.value })
              }
            />
          </label>
          <small>
            Sem chamada personalizada, o banner mostra os nomes dos times.
          </small>
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
