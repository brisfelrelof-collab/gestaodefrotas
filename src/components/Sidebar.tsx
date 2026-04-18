// components/Sidebar.tsx
import type { PageName } from "../types";

interface SidebarProps {
  currentPage: PageName;
  onNavigate: (page: PageName) => void;
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
}

const NAV_LINKS: { id: PageName; icon: string; label: string }[] = [
  { id: "dashboard",     icon: "bi-speedometer2",   label: "Dashboard" },
  { id: "veiculos",      icon: "bi-car-front",       label: "Veículos" },
  { id: "motoristas",    icon: "bi-person-badge",    label: "Motoristas" },
  { id: "rotas",         icon: "bi-map",             label: "Rotas" },
  { id: "alugueres",     icon: "bi-calendar-check",  label: "Alugueres" },
  { id: "monitoramento", icon: "bi-graph-up",         label: "Monitoramento" },
  { id: "utilizadores",  icon: "bi-people",           label: "Utilizadores" },
];

export default function Sidebar({
  currentPage,
  onNavigate,
  isOpen,
  onClose,
  userName = "Carregando...",
  userEmail = "",
}: SidebarProps) {
  const handleNav = (page: PageName) => {
    onNavigate(page);
    onClose();
  };

  return (
    <>
      {/* Overlay mobile */}
      <div
        className={`sidebar-overlay ${isOpen ? "active" : ""}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className={`sidebar ${isOpen ? "active" : ""}`} id="sidebar">
        {/* Logo */}
        <div className="logo">
          <div
            style={{
              width: 60, height: 60, borderRadius: "50%",
              background: "linear-gradient(135deg,#55a0a6,#3d7a7f)",
              margin: "0 auto 10px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <i className="bi bi-truck" style={{ color: "white", fontSize: 26 }} />
          </div>
          <h5>Gestão de Frota</h5>
        </div>

        {/* User info */}
        <div className="user-info">
          <small id="userName">{userName}</small>
          <br />
          <small className="text-muted" id="userEmail" style={{ color: "rgba(255,255,255,.5)", fontSize: 11 }}>
            {userEmail}
          </small>
        </div>

        {/* Navigation */}
        <nav className="nav flex-column">
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              className={`nav-link ${currentPage === link.id ? "active" : ""}`}
              onClick={() => handleNav(link.id)}
            >
              <i className={`bi ${link.icon}`} />
              {link.label}
            </button>
          ))}

          <hr className="nav-hr" />

          <button
            className="nav-link logout-link"
            onClick={() => handleNav("login")}
          >
            <i className="bi bi-box-arrow-right" />
            Sair
          </button>
        </nav>
      </div>
    </>
  );
}
