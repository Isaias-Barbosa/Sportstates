import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, NavLink, Route, Routes } from "react-router-dom";
import {
  Activity,
  Sun,
  Moon,
  ArrowDownUp,
  ChevronDown,
  Globe2,
  LayoutGrid,
  Menu,
  Radio,
  Star,
  X,
  Clock3,
} from "lucide-react";
import { sports } from "./catalog";
import { Empty } from "./components/shared";
import "./styles.css";
import Dashboard from "./pages/Dashboard";
import MatchPage from "./pages/MatchPage";
import TransfersPage from "./pages/TransfersPage";
import About from "./pages/About";
function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try { return localStorage.getItem("sportstates:theme") === "dark" ? "dark" : "light"; }
    catch { return "light"; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("sportstates:theme", theme); } catch { /* Storage is optional. */ }
  }, [theme]);
  const [menu, setMenu] = useState(false);
  return (
    <BrowserRouter>
      <div className="app">
        <aside className={menu ? "sidebar open" : "sidebar"}>
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
          <nav onClick={() => setMenu(false)}>
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
            <NavLink to="/favoritos">
              <Star size={18} />
              Favoritos
            </NavLink>
            <div className="nav-label">ESPORTES</div>
            <Link to="/?sport=soccer">
              <span>⚽</span>Futebol
              <ChevronDown size={14} className="push" />
            </Link>
            <NavLink to="/transferencias" className="subnav">
              <ArrowDownUp size={15} />
              Transferências
            </NavLink>
            {sports.slice(1).map((s) => (
              <Link to={"/?sport=" + s.id} key={s.id}>
                <span>{s.icon}</span>
                {s.name}
              </Link>
            ))}
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
        <div className="workspace">
          <header className="topbar">
            <div className="top-left">
              <button
                className="mobile-menu icon-button"
                onClick={() => setMenu(true)}
                aria-label="Abrir menu"
              >
                <Menu />
              </button>
              <span className="live-dot" />
              <span>O jogo acontece aqui.</span>
            </div>
            <div className="top-right">
              <button className="theme-toggle" onClick={() => setTheme(t => t === "light" ? "dark" : "light")} aria-label={theme === "light" ? "Ativar tema escuro" : "Ativar tema claro"}>
                {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
                <span>{theme === "light" ? "Modo escuro" : "Modo claro"}</span>
              </button>
              <Globe2 size={15} />
              <span>PT-BR</span>
              <span className="divider" />
              <Clock3 size={15} />
              <span>Horário de Brasília</span>
            </div>
          </header>
          <main>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/favoritos" element={<Dashboard favoritesOnly />} />
              <Route
                path="/partida/:sport/:league/:id"
                element={<MatchPage />}
              />
              <Route path="/transferencias" element={<TransfersPage />} />
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
