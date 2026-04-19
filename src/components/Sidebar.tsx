// src/components/Sidebar.tsx
// ─── Role-aware Sidebar ────────────────────────────────────────────────────────
// Shows only the navigation links relevant to the current user's role.

import type { PageName, UserRole } from "../types";

interface SidebarProps {
  currentPage: PageName;
  onNavigate:  (page: PageName) => void;
  isOpen:      boolean;
  onClose:     () => void;
  userName?:   string;
  userEmail?:  string;
  role?:       UserRole;
}

// ── Navigation definitions per role ─────────────────────────────────────────
const SUPERADMIN_LINKS: { id: PageName; icon: string; label: string }[] = [
  { id: "dashboard",     icon: "bi-speedometer2",  label: "Dashboard" },
  { id: "viaturas",      icon: "bi-car-front",      label: "Viaturas" },
  { id: "proprietarios", icon: "bi-person-vcard",   label: "Proprietários" },
  { id: "motoristas",    icon: "bi-person-badge",   label: "Motoristas" },
  { id: "rotas",         icon: "bi-map",            label: "Rotas" },
  { id: "alugueres",     icon: "bi-calendar-check", label: "Alugueres" },
  { id: "operacoes",     icon: "bi-clipboard2-data",label: "Operações" },
  { id: "monitoramento", icon: "bi-graph-up",       label: "Monitoramento" },
  { id: "utilizadores",  icon: "bi-people",         label: "Utilizadores" },
];

const PROPRIETARIO_LINKS: { id: PageName; icon: string; label: string }[] = [
  { id: "monitoramento", icon: "bi-pin-map",    label: "Mapa das Viaturas" },
  { id: "financas",      icon: "bi-cash-coin",  label: "Finanças" },
  { id: "perfil",        icon: "bi-person",     label: "Meu Perfil" },
];

const USUARIO_LINKS: { id: PageName; icon: string; label: string }[] = [
  { id: "solicitar", icon: "bi-car-front",  label: "Solicitar Serviço" },
  { id: "perfil",    icon: "bi-person",     label: "Meu Perfil" },
];

function getRoleLabel(role?: UserRole): string {
  switch (role) {
    case "superadmin":   return "Super Admin";
    case "proprietario": return "Proprietário";
    case "motorista":    return "Motorista";
    case "usuario":      return "Cliente";
    default:             return "Utilizador";
  }
}

export default function Sidebar({
  currentPage,
  onNavigate,
  isOpen,
  onClose,
  userName  = "Carregando...",
  userEmail = "",
  role,
}: SidebarProps) {
  const links =
    role === "proprietario" ? PROPRIETARIO_LINKS :
    role === "usuario"      ? USUARIO_LINKS :
    SUPERADMIN_LINKS;

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
          <small style={{ color: "rgba(255,255,255,.5)", fontSize: 11 }}>
            {getRoleLabel(role)}
          </small>
          <br />
          <small className="text-muted" style={{ color: "rgba(255,255,255,.4)", fontSize: 10 }}>
            {userEmail}
          </small>
        </div>

        {/* Navigation */}
        <nav className="nav flex-column">
          {links.map((link) => (
            <button
              key={link.id}
              className={`nav-link ${currentPage === link.id ? "active" : ""}`}
              onClick={() => { onNavigate(link.id); onClose(); }}
            >
              <i className={`bi ${link.icon}`} />
              {link.label}
            </button>
          ))}

          <hr className="nav-hr" />

          <button
            className="nav-link logout-link"
            onClick={() => onNavigate("login")}
          >
            <i className="bi bi-box-arrow-right" />
            Sair
          </button>
        </nav>
      </div>
    </>
  );
}
