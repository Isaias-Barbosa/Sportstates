import SportsNavigation from "./components/SportsNavigation";
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, NavLink, Route, Routes } from "react-router-dom";
import {
  Activity,
  Newspaper,
  Sun,
  Moon,
  Globe2,
  LayoutGrid,
  Menu,
  Radio,
  ListOrdered,
  X,
  Clock3,
  Settings,
} from "lucide-react";
import { Empty } from "./components/shared";
import "./styles.css";
import "./home-viva.css";
import "./pages-viva.css";
import Dashboard from "./pages/Dashboard";
import MatchPage from "./pages/MatchPage";
import TransfersPage from "./pages/TransfersPage";
import About from "./pages/About";
import AdminGames from "./pages/AdminGames";
import StandingsPage from "./pages/StandingsPage";
import TeamsPage from "./pages/TeamsPage";
import TeamPage from "./pages/TeamPage";
import NewsPage from "./pages/NewsPage";
import "./news.css";
function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      return localStorage.getItem("sportstates:theme") === "light"
        ? "light"
        : "dark";
    } catch {
      return "dark";
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("sportstates:theme", theme);
    } catch {
      /* Storage is optional. */
    }
  }, [theme]);
  const [menu, setMenu] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!menu) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawer.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
      if (event.key === "Tab") {
        const items = drawer.current?.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled])",
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = before;
      document.removeEventListener("keydown", onKey);
      menuButton.current?.focus();
    };
  }, [menu]);
  return (
    <BrowserRouter>
      <div className="app">
        <aside
          ref={drawer}
          id="main-menu"
          className={menu ? "sidebar open" : "sidebar"}
          inert={!menu}
          role="dialog"
          aria-modal={menu || undefined}
          aria-label="Menu principal"
        >
          <Link to="/" className="brand" onClick={() => setMenu(false)}>
            <span className="brandmark">
              <Activity size={24} />
            </span>
            sportstates<span className="brand-dot">.</span>
          </Link>
          <button
            className="close-menu icon-button"
            aria-label="Fechar menu"
            onClick={() => setMenu(false)}
          >
            <X />
          </button>
          <div className="nav-label">ACOMPANHE O JOGO</div>
          <nav
            aria-label="Páginas e esportes"
            onClick={(event) => {
              if ((event.target as Element).closest("a")) {
                setMenu(false);
                window.scrollTo(0, 0);
              }
            }}
          >
            <NavLink to="/" end>
              <LayoutGrid size={18} />
              Visão geral
            </NavLink>
            <NavLink
              to="/?status=live"
              className={({ isActive }) => (isActive ? "" : " ")}
            >
              <Radio size={18} />
              Ao vivo
              <span className="nav-live" />
            </NavLink>
            <NavLink to="/classificacoes">
              <ListOrdered size={18} />
              Classificações
            </NavLink>
            <NavLink to="/noticias">
              <Newspaper size={18} />
              Notícias
            </NavLink>
            <div className="nav-label">ESPORTES</div>
            <SportsNavigation />
            <NavLink to="/admin/jogos">
              <Settings size={18} />
              Administração
            </NavLink>
            <NavLink to="/sobre">
              <Globe2 size={18} />
              Fontes e cobertura
            </NavLink>
          </nav>
          <div className="sidebar-bottom">
            <span className="tiny-dot" /> Feito para acompanhar.
            <p>Seu esporte. Seu momento.</p>
          </div>
        </aside>
        {menu && (
          <button
            className="scrim"
            aria-label="Fechar menu"
            onClick={() => setMenu(false)}
          />
        )}
        <div className="workspace" inert={menu}>
          <header className="topbar">
            <div className="top-left">
              <Link
                to="/"
                className="brand topbar-brand"
                aria-label="Sportstates — início"
              >
                <span className="brandmark">
                  <Activity size={20} />
                </span>
                sportstates<span className="brand-dot">.</span>
              </Link>
              <nav className="topbar-nav" aria-label="Navegação principal">
                <NavLink to="/" end>
                  Jogos
                </NavLink>
                <NavLink to="/classificacoes">Classificações</NavLink>
                <NavLink to="/times">Times</NavLink>
                <NavLink to="/noticias">Notícias</NavLink>
              </nav>
            </div>
            <div className="top-right">
              <button
                className="theme-toggle"
                onClick={() =>
                  setTheme((t) => (t === "light" ? "dark" : "light"))
                }
                aria-label={
                  theme === "light" ? "Ativar tema escuro" : "Ativar tema claro"
                }
              >
                {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
                <span>{theme === "light" ? "Modo escuro" : "Modo claro"}</span>
              </button>
              <span className="topbar-locale">
                <Globe2 size={15} />
                PT-BR
              </span>
              <span className="topbar-time">
                <Clock3 size={15} />
                Horário de Brasília
              </span>
              <button
                ref={menuButton}
                aria-expanded={menu}
                aria-controls="main-menu"
                className="mobile-menu menu-trigger"
                onClick={() => setMenu(true)}
                aria-label="Abrir menu"
              >
                <span>Menu</span>
                <Menu size={20} aria-hidden="true" />
              </button>
            </div>
          </header>
          <main>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/favoritos" element={<Dashboard favoritesOnly />} />
              <Route path="/classificacoes" element={<StandingsPage />} />
              <Route
                path="/partida/:sport/:league/:id"
                element={<MatchPage />}
              />
              <Route path="/noticias" element={<NewsPage />} />
              <Route path="/times" element={<TeamsPage />} />
              <Route path="/times/:id" element={<TeamPage />} />
              <Route path="/transferencias" element={<TransfersPage />} />
              <Route path="/admin/jogos" element={<AdminGames />} />
              <Route path="/sobre" element={<About />} />
              <Route
                path="*"
                element={
                  <Empty title="Página não encontrada">
                    <Link to="/">Voltar para os jogos</Link>
                  </Empty>
                }
              />
            </Routes>
          </main>
          <footer>
            <span>
              sportstates<span className="green">.</span>
            </span>
            <p>
              Dados de terceiros · A cobertura e os atrasos variam por
              competição.
            </p>
            <Link to="/sobre">Sobre os dados ↗</Link>
          </footer>
        </div>
      </div>
    </BrowserRouter>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
