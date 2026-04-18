// components/StatusBadge.tsx
interface StatusBadgeProps { status: string; label?: string; }

const LABELS: Record<string, string> = {
  disponivel: "Disponível",
  alugado:    "Alugado",
  manutencao: "Manutenção",
  ativo:      "Ativo",
  inativo:    "Inativo",
  ferias:     "Férias",
  licenca:    "Licença",
  ativa:      "Ativa",
  inativa:    "Inativa",
  concluido:  "Concluído",
  cancelado:  "Cancelado",
  "em-uso":   "Em Uso",
  admin:      "Admin",
  operador:   "Operador",
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const text = label ?? LABELS[status] ?? status;
  return <span className={`status-badge status-${status}`}>{text}</span>;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps {
  title: string;
  icon: string;
  large?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function Modal({ title, icon, large, onClose, children, footer }: ModalProps) {
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`modal-box ${large ? "modal-lg" : ""}`}>
        <div className="modal-header-custom">
          <h5><i className={`bi ${icon}`} /> {title}</h5>
          <button className="btn-close-modal" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">{footer}</div>
      </div>
    </div>
  );
}

// ─── Loading row ──────────────────────────────────────────────────────────────
export function LoadingRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="text-center" style={{ padding: "30px", color: "#999" }}>
        <span className="loading-spinner" style={{ marginRight: 10 }} />
        Carregando...
      </td>
    </tr>
  );
}

// ─── Empty row ────────────────────────────────────────────────────────────────
export function EmptyRow({ cols, message = "Nenhum registo encontrado." }: { cols: number; message?: string }) {
  return (
    <tr>
      <td colSpan={cols} className="text-center" style={{ padding: "30px", color: "#999" }}>
        {message}
      </td>
    </tr>
  );
}
