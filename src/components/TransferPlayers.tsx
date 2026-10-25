import { useState } from "react";
import { ArrowRight, Calendar, ChevronDown } from "lucide-react";
import type { PlayerPhoto, PlayerPhotos } from "../types";
import { useApi } from "../hooks";
import type { PlayerGroup, TransferRecord } from "../transfer-groups";

function money(value: number | string | null | undefined) {
  return value == null
    ? "Não informado"
    : typeof value === "number"
      ? new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        }).format(value)
      : value;
}
export default function TransferPlayers({
  groups,
  provider,
}: {
  groups: PlayerGroup[];
  provider: string;
}) {
  // Transfermarkt IDs are not interchangeable with API-Football IDs.
  return provider === "tm" ? (
    <LicensedPlayers groups={groups} />
  ) : (
    <PlayerList groups={groups} />
  );
}
function LicensedPlayers({ groups }: { groups: PlayerGroup[] }) {
  const ids = groups
    .map((g) => g.id)
    .sort()
    .join(",");
  const { data } = useApi<PlayerPhotos>(
    "/api/market?operation=photos&ids=" + encodeURIComponent(ids),
    0,
  );
  return (
    <>
      <PlayerList groups={groups} photos={data?.photos} />
      <p className="photo-note">
        Fotos: Wikimedia Commons, quando o jogador é identificado pelo ID e a
        fonte informa uma licença de reutilização compatível. Créditos e licença
        em cada foto. Sem foto disponível, exibimos as iniciais.
        {data?.warnings.length
          ? " O serviço de fotos está temporariamente indisponível."
          : ""}
      </p>
    </>
  );
}
function PlayerList({
  groups,
  photos,
}: {
  groups: PlayerGroup[];
  photos?: Record<string, PlayerPhoto | null>;
}) {
  return (
    <div className="transfer-player-list">
      {groups.map((g) => (
        <PlayerCard key={g.id} group={g} photo={photos?.[g.id]} />
      ))}
    </div>
  );
}
function PlayerCard({
  group,
  photo,
}: {
  group: PlayerGroup;
  photo?: PlayerPhoto | null;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const latest = group.history[0];
  const older = group.history.slice(1);
  return (
    <article className="transfer-player-card">
      <div className="transfer-player-heading">
        <div className="player-avatar">
          {photo && failed !== photo.url ? (
            <img
              src={photo.url}
              alt={`Foto de ${group.name}`}
              width={64}
              height={64}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setFailed(photo.url)}
            />
          ) : (
            group.name
              .split(" ")
              .map((s) => s[0])
              .slice(0, 2)
              .join("")
          )}
        </div>
        <div>
          <h3>{group.name}</h3>
          <span className="player-record-count">
            {group.history.length}{" "}
            {group.history.length === 1
              ? "movimentação registrada"
              : "movimentações registradas"}{" "}
            · Mais recente abaixo
          </span>
        </div>
      </div>
      {photo && failed !== photo.url && (
        <p className="photo-credit">
          <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
            Foto: {photo.author}
          </a>{" "}
          ·{" "}
          <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
            {photo.license}
          </a>{" "}
          · Wikimedia Commons
        </p>
      )}
      <Movement transfer={latest} />
      {older.length > 0 && (
        <details className="player-history">
          <summary>
            <span>
              Ver histórico ({older.length}{" "}
              {older.length === 1
                ? "movimentação anterior"
                : "movimentações anteriores"}
              )
            </span>
            <ChevronDown size={15} />
          </summary>
          <div>
            {older.map((t, i) => (
              <Movement key={t.id || `${t.date}-${i}`} transfer={t} />
            ))}
          </div>
        </details>
      )}
    </article>
  );
}
function Movement({ transfer: t }: { transfer: TransferRecord }) {
  return (
    <div className="player-movement">
      <div className="transfer-info">
        <small className="transfer-meta">
          <Calendar size={12} />
          {t.date || "Data não informada"} · {t.type}
          {t.upcoming ? " · Prevista" : ""}
        </small>
      </div>
      <div className="transfer-clubs">
        <span>{t.from}</span>
        <ArrowRight size={18} className="transfer-arrow" />
        <strong>{t.to}</strong>
      </div>
      <div className="transfer-values">
        <span className="transfer-fee">Taxa: {money(t.fee)}</span>
        <span className="transfer-mktval">
          Valor de mercado: {money(t.marketValue)}
        </span>
      </div>
    </div>
  );
}
