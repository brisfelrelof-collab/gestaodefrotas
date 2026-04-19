-- ================================================================
--  SCHEMA NEON POSTGRESQL  —  Sistema de Gestão de Frotas
--  Executa este ficheiro no SQL Editor do Neon Console
--  (https://console.neon.tech → SQL Editor)
-- ================================================================

-- ── GPS: posição actual de cada viatura (upsert) ──────────────
CREATE TABLE IF NOT EXISTS gps_posicoes (
  nome       TEXT PRIMARY KEY,          -- ex: 'viatura1'
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  spd        DOUBLE PRECISION DEFAULT 0,
  fix        BOOLEAN          DEFAULT FALSE,
  sat        INTEGER          DEFAULT 0,
  alt        DOUBLE PRECISION DEFAULT 0,
  timestamp  TIMESTAMPTZ      DEFAULT NOW(),
  is_teste   BOOLEAN          DEFAULT FALSE
);

-- ── GPS: histórico de todas as leituras (rastreio de rota) ────
CREATE TABLE IF NOT EXISTS gps_historico (
  id        BIGSERIAL PRIMARY KEY,
  nome      TEXT             NOT NULL,
  lat       DOUBLE PRECISION NOT NULL,
  lng       DOUBLE PRECISION NOT NULL,
  spd       DOUBLE PRECISION DEFAULT 0,
  sat       INTEGER          DEFAULT 0,
  alt       DOUBLE PRECISION DEFAULT 0,
  timestamp TIMESTAMPTZ      DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gps_hist_nome_ts ON gps_historico (nome, timestamp DESC);

-- ── Utilizadores do sistema ───────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,   -- uid do auth (ex: UUID)
  email      TEXT UNIQUE NOT NULL,
  nome       TEXT,
  role       TEXT DEFAULT 'usuario',   -- superadmin | proprietario | motorista | usuario
  status     TEXT DEFAULT 'ativo',
  telefone   TEXT,
  foto_url   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Proprietários ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proprietarios (
  id         TEXT PRIMARY KEY,
  nome       TEXT NOT NULL,
  nif        TEXT,
  email      TEXT,
  contacto   TEXT,
  morada     TEXT,
  foto_url   TEXT,
  status     TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Motoristas ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS motoristas (
  id                    TEXT PRIMARY KEY,
  nome                  TEXT NOT NULL,
  bi                    TEXT,
  carta_conducao        TEXT,
  categoria_carta       TEXT,
  validade_carta        TEXT,
  telefone              TEXT,
  telefone_alternativo  TEXT,
  email                 TEXT,
  data_nascimento       TEXT,
  provincia             TEXT,
  municipio             TEXT,
  endereco              TEXT,
  status                TEXT DEFAULT 'ativo',
  viatura_atribuida_id  TEXT,
  data_admissao         TEXT,
  observacoes           TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── Viaturas ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS viaturas (
  id               TEXT PRIMARY KEY,
  placa            TEXT UNIQUE NOT NULL,
  nome             TEXT NOT NULL,   -- ex: 'viatura1' (liga ao ESP32)
  marca            TEXT,
  modelo           TEXT,
  ano              INTEGER,
  cor              TEXT,
  status           TEXT DEFAULT 'disponivel',
  tipo_servico     TEXT DEFAULT 'aluguer',
  proprietario_id  TEXT REFERENCES proprietarios(id) ON DELETE SET NULL,
  ip_esp           TEXT,
  observacoes      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Serviços / Alugueres ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS servicos (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tipo                TEXT DEFAULT 'aluguer',
  status              TEXT DEFAULT 'em_andamento',
  usuario_id          TEXT,
  viatura_id          TEXT REFERENCES viaturas(id) ON DELETE SET NULL,
  motorista_id        TEXT REFERENCES motoristas(id) ON DELETE SET NULL,
  proprietario_id     TEXT REFERENCES proprietarios(id) ON DELETE SET NULL,
  origem_nome         TEXT,
  destino_nome        TEXT,
  valor_total         NUMERIC(12,2) DEFAULT 0,
  valor_proprietario  NUMERIC(12,2) DEFAULT 0,
  valor_sistema       NUMERIC(12,2) DEFAULT 0,
  data_inicio         TIMESTAMPTZ,
  data_fim_prevista   TIMESTAMPTZ,
  data_fim_real       TIMESTAMPTZ,
  cliente_nome        TEXT,
  cliente_contato     TEXT,
  rota_id             TEXT,
  valor_diaria        NUMERIC(12,2),
  observacoes         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Transacções financeiras ───────────────────────────────────
CREATE TABLE IF NOT EXISTS transacoes (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  servico_id              TEXT REFERENCES servicos(id) ON DELETE SET NULL,
  viatura_id              TEXT,
  proprietario_id         TEXT,
  valor                   NUMERIC(12,2),
  percentual_proprietario NUMERIC(5,2) DEFAULT 70,
  valor_proprietario      NUMERIC(12,2),
  valor_sistema           NUMERIC(12,2),
  tipo                    TEXT DEFAULT 'credito',
  descricao               TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── Utilizadores clientes ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios_clientes (
  id              TEXT PRIMARY KEY,
  nome            TEXT NOT NULL,
  email           TEXT UNIQUE,
  numero_bilhete  TEXT,
  numero_cartao   TEXT,
  idade           INTEGER,
  genero          TEXT,
  telefone        TEXT,
  status          TEXT DEFAULT 'ativo',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Rotas ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rotas (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  nome_rota      TEXT NOT NULL,
  origem         TEXT,
  destino        TEXT,
  distancia      NUMERIC(10,2),
  tempo_estimado TEXT,
  status         TEXT DEFAULT 'ativa',
  descricao      TEXT,
  waypoints      TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
--  DADOS DE TESTE — Viatura da empresa que recebe GPS do ESP32
-- ================================================================

-- Proprietário da empresa (viatura de teste)
INSERT INTO proprietarios (id, nome, nif, email, contacto, morada, status)
VALUES (
  'empresa-principal',
  'AutoMove Angola Lda.',
  '5417236LA041',
  'geral@automove.ao',
  '+244 923 000 001',
  'Rua Rainha Ginga, Luanda',
  'ativo'
) ON CONFLICT (id) DO NOTHING;

-- Viatura de teste que receberá coordenadas do ESP32 (nome = 'viatura1')
INSERT INTO viaturas (id, placa, nome, marca, modelo, ano, cor, status, tipo_servico, proprietario_id)
VALUES (
  'viatura-teste-001',
  'LD-00-00-AM',
  'viatura1',
  'Toyota',
  'Hilux',
  2023,
  'Branco',
  'disponivel',
  'aluguer',
  'empresa-principal'
) ON CONFLICT (id) DO NOTHING;

-- Posição inicial da viatura de teste (centro de Luanda)
INSERT INTO gps_posicoes (nome, lat, lng, spd, fix, sat, alt, is_teste)
VALUES ('viatura1', -8.8383, 13.2344, 0, true, 0, 10, true)
ON CONFLICT (nome) DO NOTHING;
