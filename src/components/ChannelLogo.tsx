import { useState } from "react";

// Brand assets published by the broadcasters on their own sites and GE's TV guide.
const logos: Record<string, string> = {
  hbomax:
    "https://yt3.googleusercontent.com/UitCgi-Xc2CoGyXEIKzcfug5nDFUegSJu9veove6qfVuDXKaZZsl0EVKHCEZeSg4j_OX06TEAbI=s96-c-k-c0x00ffffff-no-rj",
  nbalp:
    "https://yt3.googleusercontent.com/eGmO8yk_eHvLzEywzlPwRV_-7RiDayDLeXWWBVExMLN4qXA7z7fD6ldPXatXZiQOvgW4--jzNA=s96-c-k-c0x00ffffff-no-rj",
  wnbalp:
    "https://yt3.googleusercontent.com/df2L2yn3jhZyHQz0WIa8nRCCgDNmjhEXLl8K4EoyKwnAUc6qh3-Qb93I7wHUdZhl0Zw4ou56IQ=s96-c-k-c0x00ffffff-no-rj",

  cazetv:
    "https://yt3.googleusercontent.com/Zm3t3pgNIYY1HgkWYaWmU3E--oljMiWqX_2Ig4zkxziTkP3VOR9TGUmgJAPu7XrhP06ebxDg=s96-c-k-c0x00ffffff-no-rj",
  goat: "https://yt3.googleusercontent.com/NtXade9YlBhuNpJu5Tcj-PRXH57GtNbON4e6KgaGhZnuqKPDvrhUGcQl88j7F72BKLAaZ72QEow=s96-c-k-c0x00ffffff-no-rj",
  tnt: "https://yt3.googleusercontent.com/VQ2IGEcrhMSpuFb3RFDQOsVV9xI0shwQVorL8VLUGUGaV61Va1UMo4iwFOBVfOsrwTTYET22Hdk=s96-c-k-c0x00ffffff-no-rj",

  espn: "https://a.espncdn.com/prod/assets/icons/E.svg",
  disney:
    "https://s.sde.globo.com/media/broadcast/2024/08/27/Disney_App_Icon_1x1-Full_ycloEYC.png",
  prime: "https://s.sde.globo.com/media/broadcast/2025/04/25/prime.png",
  globo:
    "https://s.sde.globo.com/media/broadcast/2023/04/14/logo-rede-globo-azul-4096.png",
  record: "https://record.r7.com/pf/resources/images/recordtv.ico?d=672",
  sbt: "https://www.sbt.com.br/favicon.ico",
  band: "https://www.band.com.br/favicon-96x96.png",
  xsports: "https://www.xsports.com.br/static/assets/images/favicon-32x32.png",
  mlbtv:
    "https://www.mlbstatic.com/team-logos/apple-touch-icons-180x180/mlb.png",
  premiere:
    "https://s.sde.globo.com/media/broadcast/2023/04/14/Logo_Premiere.png",
  globoplay:
    "https://s.sde.globo.com/media/broadcast/2023/12/13/globoplay-thumb-65701.jpg",
  getv: "https://s.sde.globo.com/media/broadcast/2025/09/02/getv-icone-transmissao.png",
  sportv: "https://s.sde.globo.com/media/broadcast/2023/04/14/Logo_sportv.png",
};

const aliases: Record<string, string> = {
  espn1: "espn",
  espn2: "espn",
  espn3: "espn",
  espn4: "espn",
  espn5: "espn",
  espn6: "espn",
  espnyt: "espn",
  sportv1: "sportv",
  sportv2: "sportv",
  sportv3: "sportv",
  tntyt: "tnt",
};

export default function ChannelLogo({
  id,
  badge,
}: {
  id: string;
  badge?: string;
}) {
  const src = logos[aliases[id] || id];
  const [failedSrc, setFailedSrc] = useState<string>();
  return (
    <span className="channel-logo" aria-hidden="true">
      {src && failedSrc !== src ? (
        <img
          src={src}
          alt=""
          width={32}
          height={32}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span className="channel-logo-fallback">{badge || "TV"}</span>
      )}
    </span>
  );
}
