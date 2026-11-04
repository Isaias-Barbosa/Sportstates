import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "../account/AccountProvider";

type Announcement = {
  id: string;
  title: string;
  body: string;
  url: string;
  createdAt: string;
};

export default function AnnouncementInbox({ onOpen }: { onOpen: () => void }) {
  const { request } = useAccount();
  const [items, setItems] = useState<Announcement[]>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void request<{ announcements: Announcement[] }>("/api/me/announcements", {
      signal: controller.signal,
    })
      .then(({ announcements }) => {
        if (!controller.signal.aborted) setItems(announcements);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [request]);
  return (
    <section
      className="notification-background"
      aria-label="Informes do Sportstates"
    >
      <strong>Informes do Sportstates</strong>
      {failed ? (
        <p>Não foi possível carregar os informes.</p>
      ) : !items ? (
        <p>Carregando informes…</p>
      ) : !items.length ? (
        <p>Nenhum informe recente.</p>
      ) : (
        <ul className="notification-inbox">
          {items.map((item) => (
            <li key={item.id}>
              <Link to={item.url} onClick={onOpen}>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
                <time dateTime={item.createdAt}>
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                    timeZone: "America/Sao_Paulo",
                  }).format(new Date(item.createdAt))}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
