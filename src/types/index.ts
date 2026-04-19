// src/types/index.ts
// ─── Tipos do sistema — compatíveis com Supabase (snake_case nos campos DB) ────

export type UserRole = "superadmin" | "proprietario" | "motorista" | "usuario";

// ─── AppUser (tabela: users) ──────────────────────────────────────────────────
export interface AppUser {
  id:        string;  // Supabase usa `id` (= auth.uid)
  uid?:      string;  // alias para compatibilidade com código anterior
  email:     string;
  nome?:     string;
  role:      UserRole;
  cargo?:    "admin" | "operador"; // legado
  status?:   "ativo" | "inativo";
  telefone?: string;
  foto_url?: string;
  created_at?: string;
}

// ─── Proprietario (tabela: proprietarios) ────────────────────────────────────
export interface Proprietario {
  id:        string;
  nome:      string;
  nif:       string;
  email:     string;
  contacto:  string;
  morada:    string;
  foto_url?: string;
  status:    "ativo" | "inativo";
  created_at?: string;
}

// ─── Motorista (tabela: motoristas) ──────────────────────────────────────────
export interface Motorista {
  id:                   string;
  nome:                 string;
  bi:                   string;
  carta_conducao:       string;
  categoria_carta:      "A" | "B" | "C" | "D" | "E";
  validade_carta?:      string;
  telefone:             string;
  telefone_alternativo?: string;
  email?:               string;
  data_nascimento:      string;
  provincia:            string;
  municipio?:           string;
  endereco?:            string;
  status:               "ativo" | "inativo" | "ferias" | "licenca";
  viatura_atribuida_id?: string;
  data_admissao?:       string;
  observacoes?:         string;
  created_at?:          string;
  // Aliases para compatibilidade com código anterior (camelCase)
  cartaConducao?:       string;
  categoriaCarta?:      "A" | "B" | "C" | "D" | "E";
  validadeCarta?:       string;
  dataNascimento?:      string;
  viaturaAtribuidaId?:  string;
  telefoneAlternativo?:  string;
}

// ─── Viatura (tabela: viaturas) ───────────────────────────────────────────────
export type TipoServico   = "taxi" | "carga" | "aluguer" | "outros";
export type StatusViatura = "disponivel" | "ocupada" | "manutencao" | "alugado";

export interface Viatura {
  id:               string;
  placa:            string;
  nome:             string;
  marca:            string;
  modelo:           string;
  ano:              number;
  cor:              string;
  status:           StatusViatura;
  tipo_servico:     TipoServico;
  proprietario_id:  string;
  ip_esp?:          string;
  observacoes?:     string;
  created_at?:      string;
  // Aliases camelCase para compatibilidade
  tipoServico?:     TipoServico;
  proprietarioId?:  string;
  ipEsp?:           string;
}

// ─── Servico (tabela: servicos) ───────────────────────────────────────────────
export type TipoServicoPedido = "taxi" | "transporte" | "aluguer";
export type StatusServico     = "em_andamento" | "finalizado" | "cancelado" | "pendente";

export interface Servico {
  id:                  string;
  tipo:                TipoServicoPedido;
  status:              StatusServico;
  usuario_id:          string;
  viatura_id:          string;
  motorista_id?:       string;
  proprietario_id:     string;
  origem_nome?:        string;
  destino_nome?:       string;
  valor_total:         number;
  valor_proprietario:  number;  // 70%
  valor_sistema:       number;  // 30%
  data_inicio?:        string;
  data_fim_prevista?:  string;
  data_fim_real?:      string;
  cliente_nome?:       string;
  cliente_contato?:    string;
  rota_id?:            string;
  valor_diaria?:       number;
  observacoes?:        string;
  created_at?:         string;
  // Aliases camelCase
  usuarioId?:          string;
  viaturaId?:          string;
  proprietarioId?:     string;
  origemNome?:         string;
  destinoNome?:        string;
  valorTotal?:         number;
  valorProprietario?:  number;
  valorSistema?:       number;
  dataInicio?:         string;
  dataFimPrevista?:    string;
  dataFimReal?:        string;
  clienteNome?:        string;
  motoristaId?:        string;
}

// Alias legado
export type Aluguer = Servico;

// ─── Transacao (tabela: transacoes) ──────────────────────────────────────────
export interface Transacao {
  id:                      string;
  servico_id:              string;
  viatura_id:              string;
  proprietario_id:         string;
  valor:                   number;
  percentual_proprietario: number;
  valor_proprietario:      number;
  valor_sistema:           number;
  tipo:                    "credito" | "debito";
  descricao?:              string;
  created_at?:             string;
}

// ─── UsuarioCliente (tabela: usuarios_clientes) ───────────────────────────────
export interface UsuarioCliente {
  id:              string;
  nome:            string;
  email:           string;
  numero_bilhete:  string;
  numero_cartao?:  string;
  idade:           number;
  genero:          "masculino" | "feminino" | "outro";
  telefone?:       string;
  status:          "ativo" | "inativo";
  created_at?:     string;
}

// ─── Rota (tabela: rotas) ─────────────────────────────────────────────────────
export interface Rota {
  id:             string;
  nome_rota:      string;
  origem:         string;
  destino:        string;
  distancia:      number;
  tempo_estimado: string;
  status:         "ativa" | "inativa" | "manutencao";
  descricao?:     string;
  waypoints?:     string;
  created_at?:    string;
  // Aliases camelCase
  nomeRota?:      string;
  tempoEstimado?: string;
}

// ─── GPS ──────────────────────────────────────────────────────────────────────
export interface GpsReading {
  lat: number; lng: number; speed: number; timestamp: string; connected: boolean;
}

// ─── Pages ────────────────────────────────────────────────────────────────────
export type PageName =
  | "login" | "register" | "dashboard" | "veiculos" | "viaturas"
  | "motoristas" | "rotas" | "alugueres" | "servicos" | "monitoramento"
  | "utilizadores" | "proprietarios" | "operacoes" | "financas"
  | "perfil" | "solicitar";
