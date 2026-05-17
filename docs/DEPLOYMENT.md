# DEPLOYMENT.md

Guia para publicar o primeiro prototipo online do LocalTrak Rotas usando:

- Banco: Supabase PostgreSQL
- API: NestJS em Render ou Railway
- Web: Next.js em Vercel
- ORM: Prisma com migrations via `prisma migrate deploy`

## 1. Banco Supabase

1. Criar um projeto no Supabase.
2. Acessar `Project Settings > Database > Connection string`.
3. Copiar a connection string PostgreSQL.
4. Usar SSL na URL de conexao.
5. Configurar a variavel `DATABASE_URL` na API.

Exemplo do projeto `LocalTrak`:

```env
DATABASE_URL="postgresql://postgres:REPLACE_WITH_SUPABASE_DB_PASSWORD@db.bbcubwmvizcmjtwiiyxv.supabase.co:5432/postgres?sslmode=require"
```

Para migrations Prisma, prefira a conexao direta/session pooler em porta `5432`. Em ambientes serverless, o transaction pooler pode usar porta `6543` e parametros especificos, mas para Render/Railway com API Node persistente a porta `5432` e a escolha mais simples para este prototipo.

O datasource Prisma ja deve permanecer assim:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Projeto Supabase usado neste checkpoint:

- Nome: `LocalTrak`
- Project ref: `bbcubwmvizcmjtwiiyxv`
- URL: `https://bbcubwmvizcmjtwiiyxv.supabase.co`
- Status validado via conector: `ACTIVE_HEALTHY`

As migrations locais foram aplicadas ao banco Supabase e registradas em `_prisma_migrations`.

## 2. Variaveis Da API

Configure estas variaveis no provedor da API:

```env
DATABASE_URL="postgresql://postgres:REPLACE_WITH_SUPABASE_DB_PASSWORD@db.bbcubwmvizcmjtwiiyxv.supabase.co:5432/postgres?sslmode=require"
JWT_ACCESS_SECRET="troque-por-um-secret-longo-e-aleatorio"
JWT_REFRESH_SECRET="troque-por-outro-secret-longo-e-aleatorio"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3333
CORS_ORIGINS="https://REPLACE_WITH_FRONTEND_URL"
MASTER_ADMIN_NAME="Admin Master"
MASTER_ADMIN_EMAIL="admin@localtrak.test"
MASTER_ADMIN_PASSWORD="troque-esta-senha"
SUPABASE_URL="https://REPLACE_WITH_PROJECT_REF.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="REPLACE_WITH_SERVER_ONLY_KEY"
SUPABASE_SECRET_KEY=""
SUPABASE_STORAGE_BUCKET="order-odometer"
```

Observacoes:

- `DATABASE_URL`: string do Supabase com `sslmode=require`.
- `JWT_ACCESS_SECRET`: segredo forte para access tokens.
- `JWT_REFRESH_SECRET`: segredo forte diferente do access token.
- `CORS_ORIGINS`: origens permitidas, separadas por virgula quando houver mais de uma.
- `MASTER_ADMIN_EMAIL` e `MASTER_ADMIN_PASSWORD`: usados pelo seed apenas se o usuario ainda nao existir.
- `SUPABASE_URL`: URL publica do projeto Supabase, usada pela API para Storage.
- `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SECRET_KEY`: chave server-side para Storage privado. Nunca configure no web/mobile.
- `SUPABASE_STORAGE_BUCKET`: bucket privado das fotos de odometro.

`CORS_ORIGIN` ainda pode existir por compatibilidade local, mas em deploy use `CORS_ORIGINS`.

No `render.yaml`, `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` usam
`generateValue: true`. Em Blueprints, o Render gera um valor aleatorio seguro
quando a variavel ainda nao existe. Se o servico nao estiver sincronizado por
Blueprint, configure esses dois secrets manualmente no painel do Render antes do
deploy.

## 3. Variaveis Do Frontend

Configure na Vercel:

```env
NEXT_PUBLIC_API_URL="https://REPLACE_WITH_BACKEND_URL"
NEXT_PUBLIC_SUPABASE_URL="https://REPLACE_WITH_PROJECT_REF.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_REPLACE_ME"
# Alias tambem aceito pelo projeto:
NEXT_PUBLIC_SUPABASE_KEY="sb_publishable_REPLACE_ME"
```

Em desenvolvimento local:

```env
NEXT_PUBLIC_API_URL="http://localhost:3333"
NEXT_PUBLIC_SUPABASE_URL="https://REPLACE_WITH_PROJECT_REF.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_REPLACE_ME"
```

Somente chaves publicaveis devem usar prefixo `NEXT_PUBLIC_`. Chaves `sb_secret_*`, service role, JWT secrets e `DATABASE_URL` ficam exclusivamente no backend.

## 4. Deploy Da API

Servicos indicados: Render Web Service ou Railway Service.

Diretorio raiz do deploy:

```text
localtrak-rotas
```

Build command:

```bash
pnpm install && pnpm build:api && pnpm build:web
```

Start command:

```bash
pnpm start:api
```

> Importante: se o Render mostrar `Running 'yarn start'`, o servico nao esta
> usando o Start Command correto do Blueprint ou do painel. Atualize o campo
> Start Command para `pnpm start:api` e faca um novo deploy. O projeto tambem
> possui um script raiz `start` como fallback, mas o comando recomendado para a
> API em producao continua sendo `pnpm start:api`.

Migration command para rodar antes do primeiro start ou como job separado:

```bash
pnpm prisma:migrate:deploy
```

Seed para criar o primeiro `MASTER_ADMIN`, sem sobrescrever usuario existente:

```bash
pnpm prisma:seed
```

Health check:

```text
GET /health
```

Resposta esperada:

```json
{
  "status": "ok",
  "database": "connected"
}
```

## 5. Deploy Do Frontend

Servico indicado: Vercel.

Root directory:

```text
apps/web
```

Build command dentro de `apps/web`:

```bash
pnpm build
```

Alternativa usando a raiz do monorepo:

```bash
pnpm build:web
```

Framework:

```text
Next.js
```

## 6. Desenvolvimento Local

Instalar dependencias:

```bash
pnpm install
```

Gerar Prisma Client:

```bash
pnpm prisma:generate
```

Subir API em desenvolvimento:

```bash
pnpm dev:api
```

Build da API:

```bash
pnpm build:api
```

API compilada:

```bash
pnpm start:api
```

Build do frontend:

```bash
pnpm build:web
```

## 7. Migrations E Seed

Desenvolvimento local com banco descartavel:

```bash
pnpm prisma:migrate
pnpm prisma:seed
```

Producao ou staging:

```bash
pnpm prisma:migrate:deploy
pnpm prisma:seed
```

O seed usa:

- `MASTER_ADMIN_EMAIL`
- `MASTER_ADMIN_PASSWORD`
- `MASTER_ADMIN_NAME`

Ele nao deve sobrescrever usuarios existentes.

No checkpoint Supabase, as migrations ja foram aplicadas ao projeto `LocalTrak` e o seed do `MASTER_ADMIN` ja existe. Rode estes comandos novamente apenas depois de configurar uma `DATABASE_URL` valida no ambiente.

## 8. Teste De Login

Depois de rodar migrations e seed:

```powershell
$body = @{
  email = "admin@localtrak.test"
  password = "ChangeMe123!"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3333/auth/login" `
  -ContentType "application/json" `
  -Body $body
```

Teste online:

```powershell
$body = @{
  email = "admin@localtrak.test"
  password = "REPLACE_WITH_MASTER_ADMIN_PASSWORD"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "https://REPLACE_WITH_BACKEND_URL/auth/login" `
  -ContentType "application/json" `
  -Body $body
```

Para testar `COMPANY_ADMIN`:

1. Fazer login como `MASTER_ADMIN`.
2. Criar empresa em `POST /master/companies` enviando `adminUser`.
3. Fazer login com o e-mail e senha do `adminUser`.
4. Acessar endpoints `/company/*` com o token retornado.

## 9. Checklist De Seguranca

- [ ] Rotacionar a chave secreta Supabase que foi compartilhada fora do painel.
- [ ] Trocar `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET`.
- [ ] Usar secrets diferentes entre desenvolvimento, staging e producao.
- [ ] Trocar senha inicial do `MASTER_ADMIN`.
- [ ] Configurar `CORS_ORIGINS` apenas com dominios reais do frontend.
- [ ] Usar `sslmode=require` na `DATABASE_URL` do Supabase.
- [x] Habilitar RLS nas tabelas `public` expostas pelo Supabase.
- [x] Manter sem policies publicas enquanto o acesso oficial for apenas pela API NestJS.
- [ ] Confirmar que `.env`, `.env.local` e `.env.production` nao vao para o Git.
- [ ] Confirmar que `password_hash` nao aparece em respostas HTTP.
- [ ] Confirmar que tokens e secrets nao aparecem em logs.
- [x] Upload de odometro usa bucket privado, URL assinada, MIME permitido, limite de 5 MB e nome unico sem overwrite.
- [x] Acoes criticas geram `AuditLog`: login, OS, upload de odometro e fim de rota.
- [~] Painel web ainda usa JWT em `localStorage` no prototipo; antes de producao comercial, migrar para cookie seguro `HttpOnly`/`Secure`/`SameSite` ou BFF.
- [ ] Rodar migrations antes de liberar o frontend.
- [ ] Rodar seed apenas para garantir o primeiro admin.
- [ ] Configurar backup automatico do banco.
- [ ] Configurar logs e monitoramento.

Checklist detalhado: [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md) e [SECURITY_DEPLOY_CHECKLIST.md](SECURITY_DEPLOY_CHECKLIST.md).

## 10. Checklist Pos-Deploy

- [ ] Acessar `GET https://sua-api/health`.
- [ ] Confirmar resposta `status: ok` e `database: connected`.
- [ ] Acessar `https://seu-front/login`.
- [ ] Fazer login com `MASTER_ADMIN`.
- [ ] Criar empresa com primeiro `COMPANY_ADMIN`.
- [ ] Fazer login com `COMPANY_ADMIN`.
- [ ] Acessar `/empresa/dashboard`.
- [ ] Acessar `/empresa/funcionarios`.
- [ ] Criar funcionario.
- [ ] Fazer logout.
- [ ] Confirmar que `EMPLOYEE` nao acessa painel web.

## 11. Pendencias Antes De Producao Comercial

- Criar testes automatizados de permissao.
- Configurar CI/CD.
- Configurar Sentry ou ferramenta similar.
- Configurar dominio proprio.
- Configurar e-mails transacionais.
- Implementar auditoria completa em acoes criticas.
- Revisar LGPD, termos de uso e politica de privacidade.
