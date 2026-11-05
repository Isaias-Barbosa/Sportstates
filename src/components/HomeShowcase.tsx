import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Pause, Play } from "lucide-react";
import type { FeaturedShowcase } from "../types";
import { time } from "../hooks";
import "./showcase.css";

export default function HomeShowcase({
  matchKey,
  showcase,
}: {
  matchKey: string;
  showcase: FeaturedShowcase;
}) {
  const section = useRef<HTMLElement>(null),
    video = useRef<HTMLVideoElement>(null);
  const [allowed, setAllowed] = useState(false),
    [visible, setVisible] = useState(false);
  const [manual, setManual] = useState(false),
    [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (
      navigator as Navigator & {
        connection?: {
          saveData?: boolean;
          addEventListener?: (type: string, listener: () => void) => void;
          removeEventListener?: (type: string, listener: () => void) => void;
        };
      }
    ).connection;
    const update = () => setAllowed(!motion.matches && !connection?.saveData);
    update();
    setVisible(document.visibilityState === "visible");
    motion.addEventListener("change", update);
    connection?.addEventListener?.("change", update);
    let intersects = true;
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              intersects = entry.isIntersecting;
              setVisible(intersects && document.visibilityState === "visible");
            },
            { threshold: 0.1 },
          );
    if (section.current) observer?.observe(section.current);
    const onVisibility = () =>
      setVisible(intersects && document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer?.disconnect();
      motion.removeEventListener("change", update);
      connection?.removeEventListener?.("change", update);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  const load = (allowed || manual) && visible && !failed;
  useEffect(() => {
    const player = video.current;
    if (!player) return;
    if (!load || paused) {
      player.pause();
      return;
    }
    let active = true;
    player.play().catch(() => {
      if (active) setPlaying(false);
    });
    return () => {
      active = false;
      player.pause();
    };
  }, [load, paused]);
  return (
    <section
      ref={section}
      className="hv-hero hv-showcase"
      aria-labelledby="hv-title"
    >
      <img
        className="hv-showcase-poster"
        src="/brand/stadium-viva.webp"
        alt=""
        aria-hidden="true"
        fetchPriority="high"
      />
      {(allowed || manual) && !failed && (
        <video
          ref={video}
          className="hv-showcase-video"
          src={load ? showcase.videoUrl : undefined}
          muted
          playsInline
          loop
          preload="none"
          poster="/brand/stadium-viva.webp"
          aria-hidden="true"
          tabIndex={-1}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => {
            setFailed(true);
            setPlaying(false);
          }}
        />
      )}
      <div className="hv-wrap hv-hero-inner">
        <div className="hv-hero-copy">
          <p className="hv-eyebrow">
            Vitrine Sportstates · {showcase.leagueName}
          </p>
          <span className="hv-showcase-badge">
            {showcase.kind === "replay"
              ? "Replay da partida"
              : "Vídeo do esporte"}
          </span>
          <h1 id="hv-title">{showcase.title || showcase.matchName}</h1>
          {showcase.title && (
            <p className="hv-showcase-match">{showcase.matchName}</p>
          )}
          <p>
            {new Intl.DateTimeFormat("pt-BR", {
              timeZone: "America/Sao_Paulo",
              day: "numeric",
              month: "long",
            }).format(new Date(showcase.kickoff))}{" "}
            · {time(showcase.kickoff)} · Brasília
          </p>
          <div className="hv-hero-actions">
            <span className="hv-primary">
              Acompanhar partida <ArrowRight size={17} aria-hidden="true" />
            </span>
          </div>
          <p className="hv-showcase-disclaimer">
            Vídeo de apresentação. O acompanhamento acontece na página do jogo.
          </p>
          {failed && (
            <p role="status">
              Vídeo indisponível. Você pode continuar para a partida.
            </p>
          )}
        </div>
      </div>
      <Link
        className="hv-showcase-link"
        to={"/partida/" + matchKey}
        aria-label={"Acompanhar " + showcase.matchName}
      />
      {!failed && (
        <button
          type="button"
          className="hv-showcase-playback"
          onClick={() => {
            if (playing) {
              setPaused(true);
              video.current?.pause();
            } else {
              setManual(true);
              setPaused(false);
              video.current?.play().catch(() => setPlaying(false));
            }
          }}
          aria-label={
            playing ? "Pausar vídeo da vitrine" : "Reproduzir vídeo da vitrine"
          }
        >
          {playing ? (
            <Pause size={16} aria-hidden="true" />
          ) : (
            <Play size={16} aria-hidden="true" />
          )}
          {playing ? "Pausar vídeo" : "Reproduzir vídeo"}
        </button>
      )}
    </section>
  );
}
