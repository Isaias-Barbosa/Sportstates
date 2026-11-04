import { useState, type FormEvent } from "react";
import { Notice } from "./shared";

type Review = {
  kind: "postponement";
  reference: number;
  file: string;
  url: string;
  sha256: string;
  publishedAt: string;
};

export default function AdminCbfReviews({ secret }: { secret: string }) {
  const [reference, setReference] = useState("");
  const [file, setFile] = useState("");
  const [url, setUrl] = useState("");
  const [sha256, setSha256] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function request(save: boolean) {
    setBusy(true);
    setFailed(false);
    setMessage("");
    setReviews([]);
    try {
      const response = await fetch(
        save
          ? "/api/admin/cbf-reviews"
          : "/api/admin/cbf-reviews?reference=" + encodeURIComponent(reference),
        {
          method: save ? "POST" : "GET",
          headers: {
            Authorization: "Bearer " + secret,
            "Content-Type": "application/json",
          },
          body: save
            ? JSON.stringify({
                reference: Number(reference),
                file: file.trim(),
                url: url.trim(),
                sha256: sha256.trim(),
                publishedAt: publishedAt + ":00-03:00",
                confirmed,
              })
            : undefined,
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Não foi possível acessar as revisões.");
      setReviews(save ? [body.review] : body.reviews);
      setMessage(
        save
          ? "Revisão salva."
          : body.reviews.length
            ? ""
            : "Nenhuma revisão encontrada.",
      );
    } catch (error) {
      setFailed(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Falha ao acessar as revisões.",
      );
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void request(true);
  }

  return (
    <section aria-labelledby="cbf-reviews-title">
      <h2 id="cbf-reviews-title">Revisão de adiamentos da CBF</h2>
      <p>
        Série A 2026. Use a IMT oficial para confirmar adiamentos sem nova data.
      </p>
      <form className="admin-modal admin-broadcast-modal admin-cbf-form" onSubmit={submit}>
        <label>
          Referência da partida
          <input
            type="number"
            min="1"
            max="380"
            required
            value={reference}
            onChange={(event) => {
              setReference(event.target.value);
              setConfirmed(false);
            }}
          />
        </label>
        <label>
          Publicação no horário de Brasília
          <input
            type="datetime-local"
            required
            value={publishedAt}
            onChange={(event) => {
              setPublishedAt(event.target.value);
              setConfirmed(false);
            }}
          />
        </label>
        <label>
          Link direto do PDF oficial
          <input
            type="url"
            required
            maxLength={500}
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setConfirmed(false);
            }}
          />
        </label>
        <label>
          Nome do PDF na pasta de importação
          <input
            required
            maxLength={124}
            value={file}
            onChange={(event) => {
              setFile(event.target.value);
              setConfirmed(false);
            }}
          />
        </label>
        <label>
          SHA-256 do PDF
          <input
            required
            pattern="[0-9a-fA-F]{64}"
            maxLength={64}
            value={sha256}
            onChange={(event) => {
              setSha256(event.target.value);
              setConfirmed(false);
            }}
          />
        </label>
        <label className="admin-check">
          <input
            type="checkbox"
            required
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          Conferi no documento oficial que esta partida foi adiada e está sem
          nova data.
        </label>
        <button className="admin-primary" type="submit" disabled={busy}>
          Salvar revisão
        </button>
        <button
          className="quiet-button"
          type="button"
          disabled={busy || !reference}
          onClick={() => void request(false)}
        >
          Buscar revisões pela referência
        </button>
      </form>
      {message && <Notice error={failed}>{message}</Notice>}
      {reviews.length > 0 && (
        <p>
          <a
            className="quiet-button"
            download={"cbf-revisoes-" + reviews[0].reference + ".json"}
            href={
              "data:application/json;charset=utf-8," +
              encodeURIComponent(
                JSON.stringify({ documents: reviews }, null, 2),
              )
            }
          >
            Baixar revisões para o manifesto
          </a>
        </p>
      )}
    </section>
  );
}
