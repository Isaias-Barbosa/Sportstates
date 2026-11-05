import { get, put } from "@vercel/blob";
import { timingSafeEqual, createHash } from "node:crypto";
import { validDate } from "./data.mjs";
import { leagueFor } from "./catalog.mjs";
const pathFor = (date) => `featured/${date}.json`;
export function authorized(header, secret = process.env.ADMIN_ACCESS_KEY) {
  if (
    !secret ||
    secret.length < 32 ||
    typeof header !== "string" ||
    !header.startsWith("Bearer ")
  )
    return false;
  const hash = (x) => createHash("sha256").update(x).digest();
  return timingSafeEqual(hash(header.slice(7)), hash(secret));
}
export function validateShowcase(value) {
  if (value == null) return null;
  if (
    typeof value !== "object" ||
    Array.isArray(value) ||
    !["replay", "sport"].includes(value.kind)
  )
    throw new Error("Escolha replay da partida ou vídeo do esporte.");
  if (typeof value.videoUrl !== "string" || value.videoUrl.length > 2048)
    throw new Error("Informe um link direto HTTPS para um vídeo MP4 ou WebM.");
  let url;
  try {
    url = new URL(value.videoUrl.trim());
  } catch {
    throw new Error("Informe um link direto HTTPS para um vídeo MP4 ou WebM.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash ||
    url.port ||
    !url.hostname.includes(".") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) ||
    url.hostname.includes(":") ||
    /\.(?:localhost|local|internal)$/i.test(url.hostname) ||
    !/\.(?:mp4|webm)$/i.test(url.pathname)
  )
    throw new Error(
      "Use um link direto HTTPS público terminado em .mp4 ou .webm; links de páginas do YouTube não funcionam neste campo.",
    );
  const title = typeof value.title === "string" ? value.title.trim() : "";
  if (title.length > 88 || /[\u0000-\u001f]/.test(title))
    throw new Error("A chamada pode ter até 88 caracteres.");
  return { videoUrl: url.href, kind: value.kind, title };
}
export function showcaseForMatch(value, match) {
  const video = validateShowcase(value);
  if (!video) return null;
  if (
    !match?.home?.name ||
    !match?.away?.name ||
    !match.leagueName ||
    !Number.isFinite(Date.parse(match.date))
  )
    throw new Error("Partida indisponível para a vitrine.");
  return {
    ...video,
    matchName: `${match.home.name} × ${match.away.name}`,
    leagueName: match.leagueName,
    kickoff: match.date,
  };
}
function storedShowcase(value) {
  const video = validateShowcase(value);
  if (
    !video ||
    typeof value.matchName !== "string" ||
    !value.matchName.trim() ||
    value.matchName.length > 200 ||
    typeof value.leagueName !== "string" ||
    !value.leagueName.trim() ||
    value.leagueName.length > 120 ||
    !Number.isFinite(Date.parse(value.kickoff))
  )
    throw new Error("Dados da vitrine inválidos.");
  return {
    ...video,
    matchName: value.matchName,
    leagueName: value.leagueName,
    kickoff: value.kickoff,
  };
}
export async function readFeatured(
  date,
  { read = get, configured = !!process.env.BLOB_READ_WRITE_TOKEN } = {},
) {
  if (!validDate(date)) throw new Error("Data inválida.");
  if (!configured) return { date, key: null, configured: false };
  const file = await read(pathFor(date), {
    access: "private",
    useCache: false,
  });
  if (!file || file.statusCode !== 200)
    return { date, key: null, configured: true };
  const data = JSON.parse(await new Response(file.stream).text());
  const key = validKey(data.key) ? data.key : null;
  let showcase = null;
  if (key && data.showcase) {
    try {
      showcase = storedShowcase(data.showcase);
    } catch {
      /* A bad video never hides the selected match. */
    }
  }
  return { date, key, configured: true, ...(showcase ? { showcase } : {}) };
}
export async function saveFeatured(
  date,
  key,
  showcase = null,
  { write = put, configured = !!process.env.BLOB_READ_WRITE_TOKEN } = {},
) {
  if (
    !validDate(date) ||
    (key !== null && !validKey(key)) ||
    (showcase && key === null)
  )
    throw new Error("Data ou partida inválida.");
  if (!configured) throw new Error("Armazenamento não configurado.");
  const video = showcase ? storedShowcase(showcase) : null;
  await write(
    pathFor(date),
    JSON.stringify({ date, key, ...(video ? { showcase: video } : {}) }),
    {
      access: "private",
      contentType: "application/json",
      allowOverwrite: true,
      addRandomSuffix: false,
    },
  );
}
export function validKey(key) {
  if (typeof key !== "string") return false;
  const parts = key.split("/");
  return (
    parts.length === 3 &&
    !!leagueFor(parts[0], parts[1]) &&
    /^\d{1,15}$/.test(parts[2])
  );
}
