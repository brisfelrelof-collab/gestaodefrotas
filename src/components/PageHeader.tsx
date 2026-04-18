// components/PageHeader.tsx

interface PageHeaderProps {
  icon: string;
  title: string;
  onMenuToggle: () => void;
  onLogout: () => void;
}

export default function PageHeader({
  icon, title, onMenuToggle, onLogout,
}: PageHeaderProps) {
  const today = new Date().toLocaleDateString("pt-AO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="header">
      <h2>
        <button className="mobile-menu-btn" id="mobileMenuBtn" onClick={onMenuToggle}>
          <i className="bi bi-list" />
        </button>
        <i className={`bi ${icon}`} /> {title}
      </h2>

      <div className="profile">
        <i
          className="bi bi-person-circle"
          style={{ fontSize: "2rem", color: "var(--primary-color)" }}
        />
        <span id="currentDate">{today}</span>
        <button className="logout-btn" id="logoutBtn2" title="Sair" onClick={onLogout}>
          <i className="bi bi-box-arrow-right" />
        </button>
      </div>
    </div>
  );
}
