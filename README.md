# 🚀 Integração Supabase — Sistema de Gestão de Frota

---

## 📁 Ficheiros incluídos neste ZIP

```
src/
  supabase/
    client.ts      ← Inicializa o cliente Supabase (coloca aqui as tuas credenciais)
    auth.ts        ← Login, registo, logout, reset de senha
    database.ts    ← CRUD para todas as tabelas
    storage.ts     ← Upload de fotos para Supabase Storage
  hooks/
    useAuth.ts     ← Hook reactivo de autenticação (substitui o de Firebase)
  store/
    index.ts       ← Mesma API pública, agora com Supabase por baixo
  types/
    index.ts       ← Tipos TypeScript actualizados (snake_case compatível com Supabase)

supabase_schema.sql   ← SQL completo: tabelas + RLS + triggers
package.json          ← Dependência @supabase/supabase-js adicionada
```

---

## ⚙️ PASSO A PASSO — O que fazer para integrar

### PASSO 1 — Criar o projecto Supabase

1. Vai a **https://supabase.com** e clica em **"Start your project"**
2. Cria uma conta (ou entra com GitHub)
3. Clica **"New project"**
4. Preenche:
   - **Name:** frota-gestao (ou o nome que quiseres)
   - **Database Password:** guarda bem esta password
   - **Region:** escolhe **West EU (Ireland)** — mais próximo de Angola
5. Clica **"Create new project"** e aguarda ~2 minutos

---

### PASSO 2 — Obter as credenciais

1. No painel do teu projecto Supabase, clica em **Settings** (⚙️ no canto esquerdo)
2. Clica em **API**
3. Copia os dois valores:
   - **Project URL** → ex: `https://xyzabc.supabase.co`
   - **anon / public key** → começa com `eyJhbGci...`

---

### PASSO 3 — Colar as credenciais no código

Abre o ficheiro **`src/supabase/client.ts`** e substitui:

```ts
const SUPABASE_URL  = "YOUR_SUPABASE_URL";     // ← cola o Project URL aqui
const SUPABASE_ANON = "YOUR_SUPABASE_ANON_KEY"; // ← cola o anon key aqui
```

Exemplo real:
```ts
const SUPABASE_URL  = "https://xyzabc.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

---

### PASSO 4 — Criar as tabelas na base de dados

1. No painel Supabase, clica em **SQL Editor** (ícone de base de dados no menu esquerdo)
2. Clica em **"New query"**
3. Abre o ficheiro **`supabase_schema.sql`** deste ZIP
4. Copia TODO o conteúdo
5. Cola no editor SQL do Supabase
6. Clica **"Run"** (ou Ctrl+Enter)
7. Deverás ver a mensagem: `Success. No rows returned`

> ⚠️ Se aparecer algum erro, provavelmente é porque já existe alguma tabela.
> Podes executar linha a linha ou apagar o projecto e recomeçar.

---

### PASSO 5 — Configurar o Supabase Auth

1. No painel Supabase → **Authentication** → **Providers**
2. Certifica-te que **Email** está activado (está por defeito)
3. Em **Authentication** → **Settings**:
   - **Site URL:** `http://localhost:5173` (desenvolvimento) ou o teu domínio de produção
   - **Redirect URLs:** adiciona `http://localhost:5173/**`
4. (Opcional) Desactiva "Confirm email" em **Auth Settings** → **Email Auth** para desenvolvimento mais rápido

---

### PASSO 6 — Criar o bucket de Storage para fotos

1. No painel Supabase → **Storage**
2. Clica **"New bucket"**
3. Name: `fotos`
4. Activa **"Public bucket"** ✅ (para que as fotos sejam acessíveis publicamente)
5. Clica **"Save"**

---

### PASSO 7 — Instalar dependências e arrancar

Abre o terminal na pasta do teu projecto e corre:

```bash
# Instalar a dependência do Supabase
npm install

# Arrancar o servidor de desenvolvimento
npm run dev
```

A app abre em **http://localhost:5173**

---

### PASSO 8 — Criar o primeiro SuperAdmin

Como o registo público cria contas `usuario`, tens de promover o admin manualmente.

**8a. Cria a conta:**
1. Supabase Console → **Authentication** → **Users** → **"Add user"**
2. Email: `admin@exemplo.com`
3. Password: escolhe uma senha segura
4. Clica **"Create user"**
5. Copia o **UUID** que aparece na lista (ex: `a1b2c3d4-...`)

**8b. Promove a superadmin:**
1. Supabase Console → **SQL Editor** → New query
2. Cola e executa (substitui o UUID real):

```sql
update public.users
set role = 'superadmin', nome = 'Super Admin'
where id = 'a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
```

3. Clica **Run**

Agora podes fazer login com esse email/password e terás acesso total.

---

### PASSO 9 — Copiar os ficheiros do ZIP para o teu projecto

Substitui os ficheiros existentes pelos novos:

```
src/supabase/          ← pasta nova, copia directamente
src/hooks/useAuth.ts   ← substitui o existente
src/store/index.ts     ← substitui o existente
src/types/index.ts     ← substitui o existente
package.json           ← substitui o existente
```

Depois corre `npm install` novamente para instalar o `@supabase/supabase-js`.

---

## 🗄️ Estrutura das tabelas

| Tabela | Descrição |
|---|---|
| `users` | Perfil de todos os utilizadores (sync com Auth) |
| `proprietarios` | Donos de viaturas |
| `motoristas` | Motoristas da frota |
| `viaturas` | Veículos (com `proprietario_id` e `tipo_servico`) |
| `rotas` | Rotas predefinidas |
| `servicos` | Pedidos de táxi/transporte/aluguer |
| `transacoes` | Registo financeiro dos serviços |
| `usuarios_clientes` | Dados extra dos clientes |

---

## 💰 Split 70% / 30% automático

O Supabase calcula automaticamente via trigger SQL:

```sql
-- Ao inserir/actualizar valor_total num serviço:
valor_proprietario = valor_total * 0.70
valor_sistema      = valor_total * 0.30
```

Não precisas de calcular no frontend — o banco de dados faz isso sozinho.

---

## 🔐 Segurança (RLS — Row Level Security)

| Quem | O que vê |
|---|---|
| `superadmin` | Tudo |
| `proprietario` | Só as suas viaturas e serviços |
| `usuario` | Só os seus próprios pedidos |

As regras estão definidas no `supabase_schema.sql` e são aplicadas automaticamente.

---

## 🗺️ Monitoramento GPS

A página `MonitoramentoPage.tsx` **não foi alterada** — continua a funcionar com o `/api/gps` como antes.

Para Realtime (actualização automática do mapa), o Supabase substitui o `onSnapshot` do Firebase com:

```ts
supabase.channel('viaturas').on('postgres_changes', ...).subscribe()
```

Isto já está implementado em `src/supabase/database.ts` → `viaturasDB.listenAll()`.

---

## ❓ Problemas comuns

**"Erro 401 Unauthorized"**
→ Verifica se as credenciais em `client.ts` estão correctas.

**"relation does not exist"**
→ O SQL não foi executado. Vai ao SQL Editor e corre o `supabase_schema.sql`.

**Login funciona mas o perfil não carrega**
→ A linha de `users` não foi criada. Verifica se o trigger `trg_new_auth_user` foi criado.

**"permission denied for table viaturas"**
→ O RLS está activo mas o role do utilizador não está definido. Corre o PASSO 8b.
