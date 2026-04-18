// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AppUser {
  uid: string;
  email: string;
  nome?: string;
  cargo?: "admin" | "operador";
  status?: "ativo" | "inativo";
  telefone?: string;
  createdAt?: string;
}

// ─── Veículo ──────────────────────────────────────────────────────────────────
export interface Veiculo {
  id: string;
  placa: string;
  nome: string;
  marca: string;
  modelo: string;
  ano: number;
  cor: string;
  status: "disponivel" | "alugado" | "manutencao";
  ipEsp?: string;
  observacoes?: string;
  createdAt?: string;
}

// ─── Motorista ────────────────────────────────────────────────────────────────
export interface Motorista {
  id: string;
  nome: string;
  bi: string;
  cartaConducao: string;
  categoriaCarta: "A" | "B" | "C" | "D" | "E";
  validadeCarta?: string;
  telefone: string;
  telefoneAlternativo?: string;
  email?: string;
  dataNascimento: string;
  provincia: string;
  municipio?: string;
  endereco?: string;
  status: "ativo" | "inativo" | "ferias" | "licenca";
  dataAdmissao?: string;
  observacoes?: string;
  createdAt?: string;
}

// ─── Rota ─────────────────────────────────────────────────────────────────────
export interface Rota {
  id: string;
  nomeRota: string;
  origem: string;
  destino: string;
  distancia: number;
  tempoEstimado: string;
  status: "ativa" | "inativa" | "manutencao";
  descricao?: string;
  waypoints?: string;
  createdAt?: string;
}

// ─── Aluguer ──────────────────────────────────────────────────────────────────
export interface Aluguer {
  id: string;
  clienteNome: string;
  clienteContato?: string;
  veiculoId: string;
  motoristaId?: string;
  rotaId?: string;
  dataInicio: string;
  dataFimPrevista: string;
  dataFimReal?: string;
  valorTotal: number;
  valorDiaria?: number;
  status: "ativo" | "concluido" | "cancelado";
  observacoes?: string;
  createdAt?: string;
}

// ─── GPS / Monitoramento ─────────────────────────────────────────────────────
export interface GpsReading {
  lat: number;
  lng: number;
  speed: number;
  timestamp: string;
  connected: boolean;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export interface DashboardStats {
  totalVeiculos: number;
  totalMotoristas: number;
  totalRotas: number;
  alugueresAtivos: number;
}

// ─── Shared ───────────────────────────────────────────────────────────────────
export type PageName =
  | "login"
  | "dashboard"
  | "veiculos"
  | "motoristas"
  | "rotas"
  | "alugueres"
  | "monitoramento"
  | "utilizadores";
