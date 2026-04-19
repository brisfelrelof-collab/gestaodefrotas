# 📋 Guia de Migração — Supabase → Neon PostgreSQL

## 1. Criar conta e base de dados no Neon

1. Acede a **https://console.neon.tech** e faz login (ou regista-te).
2. Clica em **"New Project"** → dá um nome (ex: `gestaodefrotas`).
3. Escolhe a região **AWS us-east-1** (ou a mais próxima).
4. Após criação, vai a **Connection Details** → copia a **Connection String**:
   ```
   postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
   > Guarda este valor — é o teu `DATABASE_URL`.

---

## 2. Criar as tabelas no Neon

1. No Neon Console, clica em **SQL Editor** (menu lateral).
2. Abre o ficheiro `scripts/schema_neon.sql` deste projecto.
3. Cola todo o conteúdo no editor e clica **"Run"**.
4. Verifica que as tabelas foram criadas na aba **Tables**.

---

## 3. Configurar variáveis de ambiente no Vercel

1. Vai ao teu projecto em **https://vercel.com**.
2. Clica em **Settings → Environment Variables**.
3. Adiciona as seguintes variáveis:

   | Nome           | Valor                                      | Ambientes          |
   |----------------|--------------------------------------------|--------------------|
   | `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` | Production, Preview, Development |
   | `AUTH_SALT`    | Uma string secreta qualquer (ex: `frota_2025_secreta`) | Production, Preview, Development |

4. Clica **Save** e faz **Redeploy** do projecto.

---

## 4. Instalar o pacote Neon no projecto local

No terminal, dentro da pasta do projecto:

```bash
npm install @neondatabase/serverless
```

O `@supabase/supabase-js` pode ser removido:

```bash
npm uninstall @supabase/supabase-js
```

---

## 5. Substituir os ficheiros do projecto

Copia os ficheiros desta pasta para o projecto:

```
output/
├── api/
│   ├── gps.js          → substitui api/gps.js
│   ├── db.js           → NOVO (CRUD genérico via Neon)
│   └── auth.js         → NOVO (autenticação via Neon)
├── src/
│   ├── db/
│   │   ├── client.ts   → NOVO (helpers fetch)
│   │   ├── database.ts → substitui src/supabase/database.ts
│   │   └── auth.ts     → substitui src/supabase/auth.ts
│   └── pages/
│       ├── MonitoramentoPage.tsx  → substitui src/pages/MonitoramentoPage.tsx
│       └── ProprietariosPage.tsx → substitui src/pages/ProprietariosPage.tsx
├── scripts/
│   └── schema_neon.sql → executa no SQL Editor do Neon
├── package.json        → substitui package.json
└── vercel.json         → substitui vercel.json
```

---

## 6. Actualizar imports nas páginas existentes

Em cada ficheiro `.tsx` que importe do `supabase/`, muda o caminho:

```typescript
// ANTES
import { supabaseRegister, resetPassword } from "../supabase/auth";
import { usersDB } from "../supabase/database";

// DEPOIS
import { supabaseRegister, resetPassword } from "../db/auth";
import { usersDB } from "../db/database";
```

Também no `src/store/index.ts`:

```typescript
// ANTES
import { supabase } from "../supabase/client";
import { supabaseLogin, supabaseLogout, getUserProfile } from "../supabase/auth";
import { viaturasDB, ... } from "../supabase/database";

// DEPOIS
import { supabaseLogin, supabaseLogout, getUserProfile } from "../db/auth";
import { viaturasDB, ... } from "../db/database";
```

---

## 7. Código ESP32 — sem alterações necessárias

O ESP32 continua a enviar para o mesmo endpoint:

```cpp
const char* VERCEL_URL = "https://gestaodefrotas-hazel.vercel.app/api/gps";
```

O `api/gps.js` foi actualizado para persistir no Neon automaticamente.

---

## 8. Como funciona a viatura de teste

O ficheiro `schema_neon.sql` já insere:
- **Proprietário**: `AutoMove Angola Lda.`
- **Viatura de teste**: `viatura1` (Toyota Hilux, placa `LD-00-00-AM`)
- **Posição inicial**: centro de Luanda (-8.8383, 13.2344)

Quando o ESP32 enviar coordenadas com `nome = "viatura1"`, a posição é actualizada em tempo real.

---

## 9. Lógica de "Viatura Indisponível"

- A API (`api/gps.js`) marca `online: true` se o último GPS foi recebido **< 10 segundos** atrás.
- Se `online: false`, o mapa mostra o marcador **cinzento** com o texto **"INDISPONÍVEL"** e mantém a última posição conhecida.
- O intervalo pode ser ajustado em `api/gps.js` na constante `ONLINE_SEC`.

---

## 10. Testar localmente

```bash
npm install
npm run dev
```

Para testar as API routes localmente precisas do Vercel CLI:

```bash
npm install -g vercel
vercel dev
```

Adiciona um ficheiro `.env.local` na raiz:

```
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
AUTH_SALT=qualquer_string_secreta
```
