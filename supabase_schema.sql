-- ═══════════════════════════════════════════════════════════════════════════
-- SCHEMA COMPLETO — Sistema de Gestão de Frota (CORRIGIDO)
-- Supabase Console → SQL Editor → New query → cola → Run
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ─── 1. users ────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  nome        text,
  role        text not null default 'usuario'
                check (role in ('superadmin','proprietario','motorista','usuario')),
  status      text not null default 'ativo'
                check (status in ('ativo','inativo')),
  telefone    text,
  foto_url    text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─── 2. proprietarios ────────────────────────────────────────────────────────
create table if not exists public.proprietarios (
  id          uuid primary key default uuid_generate_v4(),
  nome        text not null,
  nif         text not null,
  email       text not null unique,
  contacto    text not null,
  morada      text not null,
  foto_url    text,
  status      text not null default 'ativo'
                check (status in ('ativo','inativo')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─── 3. viaturas (antes de motoristas por causa da FK) ───────────────────────
create table if not exists public.viaturas (
  id               uuid primary key default uuid_generate_v4(),
  placa            text not null unique,
  nome             text not null,
  marca            text not null,
  modelo           text not null,
  ano              integer not null check (ano >= 1990 and ano <= 2030),
  cor              text not null,
  status           text not null default 'disponivel'
                     check (status in ('disponivel','ocupada','manutencao','alugado')),
  tipo_servico     text not null default 'aluguer'
                     check (tipo_servico in ('taxi','carga','aluguer','outros')),
  proprietario_id  uuid not null references public.proprietarios(id) on delete restrict,
  ip_esp           text,
  observacoes      text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ─── 4. motoristas (depois de viaturas) ──────────────────────────────────────
create table if not exists public.motoristas (
  id                    uuid primary key default uuid_generate_v4(),
  nome                  text not null,
  bi                    text not null unique,
  carta_conducao        text not null,
  categoria_carta       text not null check (categoria_carta in ('A','B','C','D','E')),
  validade_carta        date,
  telefone              text not null,
  telefone_alternativo  text,
  email                 text,
  data_nascimento       date not null,
  provincia             text not null,
  municipio             text,
  endereco              text,
  status                text not null default 'ativo'
                          check (status in ('ativo','inativo','ferias','licenca')),
  viatura_atribuida_id  uuid references public.viaturas(id) on delete set null,
  data_admissao         date,
  observacoes           text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ─── 5. rotas ────────────────────────────────────────────────────────────────
create table if not exists public.rotas (
  id              uuid primary key default uuid_generate_v4(),
  nome_rota       text not null,
  origem          text not null,
  destino         text not null,
  distancia       numeric(10,2) not null,
  tempo_estimado  text not null,
  status          text not null default 'ativa'
                    check (status in ('ativa','inativa','manutencao')),
  descricao       text,
  waypoints       text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─── 6. servicos ─────────────────────────────────────────────────────────────
create table if not exists public.servicos (
  id                  uuid primary key default uuid_generate_v4(),
  tipo                text not null check (tipo in ('taxi','transporte','aluguer')),
  status              text not null default 'pendente'
                        check (status in ('pendente','em_andamento','finalizado','cancelado')),
  usuario_id          uuid references auth.users(id) on delete set null,
  viatura_id          uuid not null references public.viaturas(id) on delete restrict,
  motorista_id        uuid references public.motoristas(id) on delete set null,
  proprietario_id     uuid not null references public.proprietarios(id) on delete restrict,
  rota_id             uuid references public.rotas(id) on delete set null,
  origem_nome         text,
  destino_nome        text,
  valor_total         numeric(12,2) not null default 0,
  valor_proprietario  numeric(12,2) not null default 0,
  valor_sistema       numeric(12,2) not null default 0,
  valor_diaria        numeric(12,2),
  data_inicio         timestamptz,
  data_fim_prevista   timestamptz,
  data_fim_real       timestamptz,
  cliente_nome        text,
  cliente_contato     text,
  observacoes         text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ─── 7. transacoes ───────────────────────────────────────────────────────────
create table if not exists public.transacoes (
  id                      uuid primary key default uuid_generate_v4(),
  servico_id              uuid references public.servicos(id) on delete cascade,
  viatura_id              uuid references public.viaturas(id) on delete set null,
  proprietario_id         uuid references public.proprietarios(id) on delete set null,
  valor                   numeric(12,2) not null,
  percentual_proprietario numeric(5,2) not null default 70,
  valor_proprietario      numeric(12,2) not null,
  valor_sistema           numeric(12,2) not null,
  tipo                    text not null check (tipo in ('credito','debito')),
  descricao               text,
  created_at              timestamptz default now()
);

-- ─── 8. usuarios_clientes ────────────────────────────────────────────────────
create table if not exists public.usuarios_clientes (
  id              uuid primary key references auth.users(id) on delete cascade,
  nome            text not null,
  email           text not null,
  numero_bilhete  text not null,
  numero_cartao   text,
  idade           integer not null check (idade >= 18),
  genero          text not null check (genero in ('masculino','feminino','outro')),
  telefone        text,
  status          text not null default 'ativo' check (status in ('ativo','inativo')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ÍNDICES
-- ═══════════════════════════════════════════════════════════════════════════
create index if not exists idx_viaturas_proprietario   on public.viaturas(proprietario_id);
create index if not exists idx_viaturas_status         on public.viaturas(status);
create index if not exists idx_servicos_status         on public.servicos(status);
create index if not exists idx_servicos_proprietario   on public.servicos(proprietario_id);
create index if not exists idx_servicos_usuario        on public.servicos(usuario_id);
create index if not exists idx_servicos_viatura        on public.servicos(viatura_id);
create index if not exists idx_transacoes_proprietario on public.transacoes(proprietario_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.users             enable row level security;
alter table public.proprietarios     enable row level security;
alter table public.motoristas        enable row level security;
alter table public.viaturas          enable row level security;
alter table public.rotas             enable row level security;
alter table public.servicos          enable row level security;
alter table public.transacoes        enable row level security;
alter table public.usuarios_clientes enable row level security;

-- Helper: obter role do utilizador actual
create or replace function public.get_my_role()
returns text language sql security definer stable as $$
  select role from public.users where id = auth.uid();
$$;

-- users
create policy "users: self or admin read"  on public.users for select using (id = auth.uid() or get_my_role() = 'superadmin');
create policy "users: self or admin write" on public.users for update  using (id = auth.uid() or get_my_role() = 'superadmin');
create policy "users: insert"              on public.users for insert  with check (id = auth.uid() or get_my_role() = 'superadmin');
create policy "users: admin delete"        on public.users for delete  using (get_my_role() = 'superadmin');

-- proprietarios
create policy "proprietarios: self or admin read"  on public.proprietarios for select using (id = auth.uid() or get_my_role() = 'superadmin');
create policy "proprietarios: admin write"         on public.proprietarios for all    using (get_my_role() = 'superadmin');

-- motoristas
create policy "motoristas: read"  on public.motoristas for select using (get_my_role() in ('superadmin','proprietario'));
create policy "motoristas: write" on public.motoristas for all    using (get_my_role() = 'superadmin');

-- viaturas
create policy "viaturas: superadmin"          on public.viaturas for all    using (get_my_role() = 'superadmin');
create policy "viaturas: proprietario read"   on public.viaturas for select using (get_my_role() = 'proprietario' and proprietario_id = auth.uid());
create policy "viaturas: usuario disponivel"  on public.viaturas for select using (get_my_role() = 'usuario' and status = 'disponivel');

-- rotas
create policy "rotas: authenticated read" on public.rotas for select using (auth.uid() is not null);
create policy "rotas: admin write"        on public.rotas for all    using (get_my_role() = 'superadmin');

-- servicos
create policy "servicos: superadmin"         on public.servicos for all    using (get_my_role() = 'superadmin');
create policy "servicos: proprietario read"  on public.servicos for select using (get_my_role() = 'proprietario' and proprietario_id = auth.uid());
create policy "servicos: usuario own read"   on public.servicos for select using (get_my_role() = 'usuario' and usuario_id = auth.uid());
create policy "servicos: usuario create"     on public.servicos for insert with check (auth.uid() is not null and usuario_id = auth.uid());

-- transacoes
create policy "transacoes: superadmin"        on public.transacoes for all    using (get_my_role() = 'superadmin');
create policy "transacoes: proprietario read" on public.transacoes for select using (get_my_role() = 'proprietario' and proprietario_id = auth.uid());

-- usuarios_clientes
create policy "uc: self or admin" on public.usuarios_clientes for all using (id = auth.uid() or get_my_role() = 'superadmin');

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- updated_at automático
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_users_updated_at         before update on public.users         for each row execute function public.handle_updated_at();
create or replace trigger trg_viaturas_updated_at      before update on public.viaturas      for each row execute function public.handle_updated_at();
create or replace trigger trg_servicos_updated_at      before update on public.servicos      for each row execute function public.handle_updated_at();
create or replace trigger trg_proprietarios_updated_at before update on public.proprietarios for each row execute function public.handle_updated_at();
create or replace trigger trg_motoristas_updated_at    before update on public.motoristas    for each row execute function public.handle_updated_at();

-- Cria perfil automaticamente quando um user se regista
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, 'usuario')
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger trg_new_auth_user
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Calcula split 70/30 automaticamente
create or replace function public.calcular_split_servico()
returns trigger language plpgsql as $$
begin
  new.valor_proprietario := round(new.valor_total * 0.70, 2);
  new.valor_sistema      := round(new.valor_total * 0.30, 2);
  return new;
end;
$$;

create or replace trigger trg_split_servico
  before insert or update of valor_total on public.servicos
  for each row execute function public.calcular_split_servico();

-- ═══════════════════════════════════════════════════════════════════════════
-- PROMOVER SUPERADMIN
-- Executa este bloco SEPARADO depois de criar o teu utilizador em
-- Authentication → Users. Substitui o UUID pelo teu.
-- ═══════════════════════════════════════════════════════════════════════════
/*
update public.users
set role = 'superadmin', nome = 'Super Admin'
where id = 'SEU-UUID-AQUI';
*/