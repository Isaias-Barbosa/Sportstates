import type { ManualLance } from "../types";

export default function ManualLanceMedia({ lance }: { lance: ManualLance }) {
  return (
    <div className="manual-lance-preview">
      <p><strong>{lance.minute}' · {lance.description || lance.lanceType}</strong></p>
      {lance.mediaType === "mp4" ? (
        <video controls playsInline preload="metadata" src={lance.mediaUrl} />
      ) : (
        <img src={lance.mediaUrl} alt={lance.description || "Lance da partida"} loading="lazy" />
      )}
    </div>
  );
}
