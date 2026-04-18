// App.tsx
import { useState } from "react";
import { authCurrentUser, authLogout } from "./store";
import type { PageName } from "./types";

import "./styles/global.css";

import Sidebar           from "./components/Sidebar";
import LoginPage         from "./pages/LoginPage";
import DashboardPage     from "./pages/DashboardPage";
import VeiculosPage      from "./pages/VeiculosPage";
import MotoristasPage    from "./pages/MotoristasPage";
import RotasPage         from "./pages/RotasPage";
import AlugueresPage     from "./pages/AlugueresPage";
import MonitoramentoPage from "./pages/MonitoramentoPage";
import UtilizadoresPage  from "./pages/UtilizadoresPage";

export default function App() {
  const [page,     setPage]     = useState<PageName>(() =>
    authCurrentUser() ? "dashboard" : "login"
  );
  const [sideOpen, setSideOpen] = useState(false);

  const currentUser = authCurrentUser();

  const handleLogin    = () => setPage("dashboard");
  const handleLogout   = () => { authLogout(); setPage("login"); };
  const handleNavigate = (p: PageName) => {
    if (p === "login") { handleLogout(); return; }
    setPage(p);
  };

  if (page === "login") return <LoginPage onLogin={handleLogin} />;

  const pageProps = {
    onMenuToggle: () => setSideOpen((o) => !o),
    onLogout:     handleLogout,
  };

  const renderPage = () => {
    switch (page) {
      case "dashboard":     return <DashboardPage     {...pageProps} />;
      case "veiculos":      return <VeiculosPage       {...pageProps} />;
      case "motoristas":    return <MotoristasPage     {...pageProps} />;
      case "rotas":         return <RotasPage           {...pageProps} />;
      case "alugueres":     return <AlugueresPage       {...pageProps} />;
      case "monitoramento": return <MonitoramentoPage  {...pageProps} />;
      case "utilizadores":  return <UtilizadoresPage   {...pageProps} />;
      default:              return <DashboardPage      {...pageProps} />;
    }
  };

  return (
    <>
      <Sidebar
        currentPage={page}
        onNavigate={handleNavigate}
        isOpen={sideOpen}
        onClose={() => setSideOpen(false)}
        userName={currentUser?.nome ?? currentUser?.email?.split("@")[0] ?? "Utilizador"}
        userEmail={currentUser?.email ?? ""}
      />
      <div className="main-content">
        {renderPage()}
      </div>
    </>
  );
}
