// src/App.tsx
// ─── Role-aware App shell ──────────────────────────────────────────────────────
// Renders the correct layout depending on the authenticated user's role:
//   superadmin  → full admin sidebar + all pages
//   proprietario → limited sidebar, only own viaturas & finances
//   motorista   → (future) driver app
//   usuario     → client portal (login, register, request service)
//
// Monitoramento page is NOT altered (per requirements).

import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { authLogout } from "./store";
import type { PageName } from "./types";

import "./styles/global.css";

// ── Shared components ─────────────────────────────────────────────────────────
import Sidebar from "./components/Sidebar";
import LoadingScreen from "./components/LoadingScreen";

// ── Pages ─────────────────────────────────────────────────────────────────────
import LoginPage         from "./pages/LoginPage";
import RegisterPage      from "./pages/RegisterPage";
import DashboardPage     from "./pages/DashboardPage";
import VeiculosPage      from "./pages/VeiculosPage";        // unchanged
import MotoristasPage    from "./pages/MotoristasPage";      // unchanged
import RotasPage         from "./pages/RotasPage";           // unchanged
import AlugueresPage     from "./pages/AlugueresPage";       // unchanged
import MonitoramentoPage from "./pages/MonitoramentoPage";   // MUST NOT CHANGE
import UtilizadoresPage  from "./pages/UtilizadoresPage";    // updated
import ProprietariosPage from "./pages/ProprietariosPage";   // NEW
import OperacoesPage     from "./pages/OperacoesPage";       // NEW
import FinancasPage      from "./pages/FinancasPage";        // NEW (proprietario)
import SolicitarPage     from "./pages/SolicitarPage";       // NEW (usuario/cliente)
import PerfilPage        from "./pages/PerfilPage";          // NEW

export default function App() {
  const { user, loading, role } = useAuth();
  const [page, setPage] = useState<PageName>("login");
  const [sideOpen, setSideOpen] = useState(false);

  // Redirect to correct default page after login
  useEffect(() => {
    if (!user) {
      setPage("login");
      return;
    }
    switch (role) {
      case "superadmin":   setPage("dashboard");  break;
      case "proprietario": setPage("monitoramento"); break;
      case "motorista":    setPage("dashboard");  break;
      case "usuario":      setPage("solicitar");  break;
      default:             setPage("login");
    }
  }, [user, role]);

  // Show loading spinner while Firebase resolves auth state
  if (loading) return <LoadingScreen />;

  // ── Unauthenticated ──────────────────────────────────────────────────────────
  if (!user) {
    if (page === "register")
      return <RegisterPage onRegistered={() => setPage("login")} onBack={() => setPage("login")} />;
    return (
      <LoginPage
        onLogin={() => {/* useEffect handles redirect */}}
        onRegister={() => setPage("register")}
      />
    );
  }

  const handleLogout = async () => {
    await authLogout();
    setPage("login");
  };

  const pageProps = {
    onMenuToggle: () => setSideOpen((o) => !o),
    onLogout:     handleLogout,
  };

  // ── Route guard: only render pages the current role is allowed to see ────────
  const renderPage = () => {
    // Proprietário — only their own data
    if (role === "proprietario") {
      switch (page) {
        case "monitoramento": return <MonitoramentoPage {...pageProps} proprietarioId={user.uid} />;
        case "financas":      return <FinancasPage {...pageProps} proprietarioId={user.uid} />;
        case "perfil":        return <PerfilPage {...pageProps} />;
        default:              return <MonitoramentoPage {...pageProps} proprietarioId={user.uid} />;
      }
    }

    // Cliente / Usuário
    if (role === "usuario") {
      switch (page) {
        case "solicitar": return <SolicitarPage {...pageProps} />;
        case "perfil":    return <PerfilPage {...pageProps} />;
        default:          return <SolicitarPage {...pageProps} />;
      }
    }

    // SuperAdmin — all pages
    switch (page) {
      case "dashboard":     return <DashboardPage     {...pageProps} />;
      case "veiculos":
      case "viaturas":      return <VeiculosPage       {...pageProps} />;
      case "motoristas":    return <MotoristasPage     {...pageProps} />;
      case "rotas":         return <RotasPage           {...pageProps} />;
      case "alugueres":     return <AlugueresPage       {...pageProps} />;
      case "monitoramento": return <MonitoramentoPage  {...pageProps} />;
      case "utilizadores":  return <UtilizadoresPage   {...pageProps} />;
      case "proprietarios": return <ProprietariosPage  {...pageProps} />;
      case "operacoes":     return <OperacoesPage       {...pageProps} />;
      case "perfil":        return <PerfilPage          {...pageProps} />;
      default:              return <DashboardPage       {...pageProps} />;
    }
  };

  return (
    <>
      <Sidebar
        currentPage={page}
        onNavigate={(p) => { setPage(p); setSideOpen(false); }}
        isOpen={sideOpen}
        onClose={() => setSideOpen(false)}
        userName={user.nome ?? user.email?.split("@")[0] ?? "Utilizador"}
        userEmail={user.email ?? ""}
        role={role ?? "usuario"}
      />
      <div className="main-content">
        {renderPage()}
      </div>
    </>
  );
}
