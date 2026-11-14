import { useApi } from "../hooks";

type CustomSection = {
  id: string;
  name: string;
  stale: boolean;
  items: { title: string; value: string; link?: string }[];
};

export default function CustomContent({
  target,
  league,
}: {
  target: "home" | "standings";
  league?: string;
}) {
  const query = new URLSearchParams({ target });
  if (league) query.set("league", league);
  const { data } = useApi<{ sections: CustomSection[] }>(
    "/api/custom-content?" + query,
    0,
  );
  return (
    data?.sections
      .filter((section) => section.items.length > 0)
      .map((section) => (
        <section key={section.id} className="custom-content panel">
          <h2>{section.name}</h2>
          {section.stale && <small>Última consulta disponível</small>}
          <ul>
            {section.items.map((item, index) => (
              <li key={index}>
                {item.link ? (
                  <a href={item.link} target="_blank" rel="noreferrer">
                    {item.title}
                  </a>
                ) : (
                  <strong>{item.title}</strong>
                )}
                {item.value && <span>{item.value}</span>}
              </li>
            ))}
          </ul>
        </section>
      )) ?? null
  );
}
