# VERCEL_GITHUB_DEPLOY.md

Guia executavel para publicar o frontend Next.js do LocalTrak Rotas na Vercel usando GitHub.

## Estado Validado Localmente

- [x] Frontend esta em `apps/web`.
- [x] Build local validado com `pnpm build:web`.
- [x] Projeto usa Next.js.
- [x] `.gitignore` ignora `node_modules`, `.next`, `dist`, `.env*`, logs e caches.
- [x] `apps/web/vercel.json` define `pnpm install --frozen-lockfile` e `pnpm build` quando o Root Directory da Vercel for `apps/web`.

Bloqueios atuais para deploy automatico via GitHub:

- [x] A pasta local ainda precisa estar em um repositorio Git com remote GitHub.
- [x] O remote GitHub precisa existir e receber push na branch `main`.
- [ ] A API de producao precisa estar online para preencher `NEXT_PUBLIC_API_URL`.
- [ ] O dominio final da Vercel precisa ser adicionado em `CORS_ORIGINS` na API.

## 1. Preparar GitHub

Na raiz do projeto:

```powershell
git init -b main
git add .
git commit -m "Prepare LocalTrak Rotas web for Vercel deploy"
git remote add origin https://github.com/SEU_USUARIO/localtrak-rotas.git
git push -u origin main
```

Antes do push, confira:

```powershell
git status --short
git remote -v
```

Nao commitar:

- `.env`
- `.env.local`
- `.env.production`
- `node_modules`
- `.next`
- `dist`
- `.expo`
- logs

## 2. Criar Projeto Na Vercel

1. Acesse a Vercel.
2. Clique em `Add New Project`.
3. Importe o repositorio GitHub `localtrak-rotas`.
4. Configure:
   - Framework Preset: `Next.js`
   - Root Directory: `apps/web`
   - Install Command: `pnpm install --frozen-lockfile`
   - Build Command: `pnpm build`
   - Output Directory: deixar padrao do Next.js
5. Confirme deploy.

Se optar por usar a raiz do monorepo como Root Directory, use:

- Build Command: `pnpm build:web`
- Framework Preset: `Next.js`

Mas o caminho recomendado para este projeto e Root Directory `apps/web`.

## 3. Variaveis De Ambiente Na Vercel

Configure em `Production` e `Preview`:

```env
NEXT_PUBLIC_API_URL=https://SUA_API_ONLINE
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=sb_publishable_REPLACE_ME
```

Aliases tambem aceitos pelo codigo:

```env
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_REPLACE_ME
```

Use pelo menos um dos tres nomes de chave publica:

- `NEXT_PUBLIC_SUPABASE_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Nunca configure na Vercel web:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SECRET_KEY`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

Essas variaveis pertencem somente ao backend.

## 4. Configurar CORS Na API

Depois que a Vercel gerar o dominio, configure no provedor da API:

```env
CORS_ORIGINS=https://localtrak-rotas.vercel.app,https://SEU_DOMINIO_CUSTOMIZADO
```

Se precisar liberar previews temporarios, adicione explicitamente os dominios de preview necessarios.

Reimplante a API apos mudar `CORS_ORIGINS`.

## 5. Deploy Automatico

Depois que o GitHub estiver conectado:

- Push para `main`: gera deploy de Production se a branch principal estiver configurada como production branch.
- Pull Requests/branches: geram Preview Deployments.
- Cada commit novo dispara um novo deploy automaticamente.

Comandos locais:

```powershell
git add .
git commit -m "Update web deployment configuration"
git push
```

## 6. Validacao Pos-Deploy

Web:

- [ ] Abrir `https://SEU_FRONT.vercel.app/login`.
- [ ] Login `MASTER_ADMIN`.
- [ ] Redirecionamento para `/master/dashboard`.
- [ ] Listar empresas reais.
- [ ] Criar empresa com primeiro `COMPANY_ADMIN`.
- [ ] Login `COMPANY_ADMIN`.
- [ ] Abrir `/empresa/dashboard`.
- [ ] Abrir funcionarios, veiculos, rotas, OS, manutencao, combustivel e reembolsos.
- [ ] Conferir dark mode.
- [ ] Conferir responsividade desktop/tablet/mobile.

Integracoes:

- [ ] Mapas carregam sem erro.
- [ ] Rotas finalizadas mostram trajeto.
- [ ] Rotas em andamento atualizam pelo backend.
- [ ] OS mostra fotos de odometro por URL assinada.
- [ ] Reembolsos, manutencao e combustivel consomem dados reais da API.

Seguranca:

- [ ] `EMPLOYEE` nao acessa painel web.
- [ ] `COMPANY_ADMIN` nao acessa `/master/*`.
- [ ] Nenhum `passwordHash` aparece em respostas.
- [ ] Console do navegador nao mostra secrets.
- [ ] Aba Network chama apenas API HTTPS.

## 7. Comandos De Verificacao Local Antes Do Push

```powershell
pnpm build:web
pnpm build:mobile
pnpm build:api
pnpm typecheck:mobile
```

Para o projeto `localtrak-mobile` na Vercel, use:

- Root Directory: `apps/mobile`
- Build Command: `pnpm build:web`
- Output Directory: `dist`
- Variaveis publicas: `EXPO_PUBLIC_API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Nao configure `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SECRET_KEY` no projeto mobile/web da Vercel.

## 8. Criterio De Sucesso

- [x] GitHub conectado a Vercel.
- [x] Deploy automatico em cada push.
- [x] Production Deployment verde.
- [x] Preview Deployments funcionando.
- [ ] `NEXT_PUBLIC_API_URL` aponta para API online.
- [ ] `CORS_ORIGINS` contem o dominio Vercel.
- [ ] Login e dashboards funcionando online.
- [ ] Mapas, OS, fotos, reembolsos, manutencao e combustivel funcionando online.

## 9. Deploy do Módulo Mobile (React Native Web / Expo Web)

O módulo mobile (`apps/mobile`) foi publicado na Vercel como uma aplicação estática React Native Web / Expo Web.

### Configurações do Projeto na Vercel:
- **Project Name:** `localtrak-mobile`
- **Framework Preset:** `Other` (Customizado)
- **Root Directory:** `apps/mobile`
- **Build Command:** `npx expo export --platform web`
- **Output Directory:** `dist`

### Variáveis de Ambiente Configuradas:
- `NEXT_PUBLIC_SUPABASE_URL`: `https://bbcubwmvizcmjtwiiyxv.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `sb_publishable_aBF5qe5_jmdqSqC-qCcFHQ_J1Tx2Hxv`
- `NEXT_PUBLIC_API_URL`: `https://localtrak-api.onrender.com` (ou URL real da API NestJS)
- `EXPO_PUBLIC_API_URL`: `https://localtrak-api.onrender.com` (ou URL real da API NestJS)

### Como Testar:
1. Acesse: [https://localtrak-mobile.vercel.app](https://localtrak-mobile.vercel.app)
2. Use o modo de emulação móvel do navegador (F12 > Responsive / iPhone).
3. Teste o login com credenciais de funcionário (`EMPLOYEE`).
4. Usuários com roles `MASTER_ADMIN` ou `COMPANY_ADMIN` serão rejeitados com aviso de exclusividade para funcionários.
