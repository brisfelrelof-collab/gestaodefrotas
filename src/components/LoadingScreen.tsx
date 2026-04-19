// src/components/LoadingScreen.tsx
export default function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8f9fa",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "linear-gradient(135deg,#55a0a6,#3d7a7f)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <i className="bi bi-truck" style={{ color: "white", fontSize: 30 }} />
      </div>
      <div className="loading-spinner" style={{ width: 32, height: 32 }} />
      <p style={{ color: "#888", fontSize: 14 }}>A carregar...</p>
    </div>
  );
}
