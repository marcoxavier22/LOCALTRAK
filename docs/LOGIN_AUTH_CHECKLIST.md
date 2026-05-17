# Login e autenticacao - checkpoint

Data do checkpoint: 2026-05-17.

## Escopo

Validar o fluxo de login do LocalTrak Rotas em backend NestJS, web Next.js,
mobile Expo e deploy Vercel, sem adicionar funcionalidades novas.

## Credenciais de teste

Use somente em ambiente de teste:

| Perfil | E-mail | Senha | Acesso esperado |
| --- | --- | --- | --- |
| MASTER_ADMIN | `admin@localtrak.test` | `ChangeMe123!` | Painel master web |
| COMPANY_ADMIN | `admin@empresateste.com` | `Senha123!` | Painel da empresa web |
| EMPLOYEE | `funcionario@empresateste.com` | `Senha123!` | App mobile |

## Endpoints validados

| Endpoint | Metodo | Status localhost |
| --- | --- | --- |
| `/health` | GET | OK, database connected |
| `/auth/login` | POST | OK para os 3 perfis |
| `/auth/refresh` | POST | OK para os 3 perfis |
| `/auth/logout` | POST | OK para os 3 perfis |

## Resultado localhost

- `pnpm build:api`: OK.
- `pnpm build:web`: OK.
- `pnpm typecheck:mobile`: OK.
- `pnpm build:mobile`: OK.
- Seed Supabase: OK.
- Usuarios de teste existem na tabela `users`: OK.
- `passwordHash`/`password_hash` nao retorna no login: OK.
- Access token retorna no login: OK.
- Refresh token retorna no login: OK.
- Refresh token gera nova sessao: OK.
- CORS local aceitou `http://localhost:3000`: OK.
- CORS local aceitou `http://localhost:8081`: OK.

## Resultado Vercel/producao

- Web Vercel carrega: `https://localtrak-web.vercel.app/login`.
- Mobile Web Vercel carrega: `https://localtrak-mobile.vercel.app`.
- O bundle publicado aponta a API para `https://localtrak-api.onrender.com`.
- A API publica candidata retorna `404` em:
  - `GET /health`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `OPTIONS /auth/login`
- Portanto, o login em localhost esta funcional, mas o login no deploy Vercel
  fica bloqueado ate a API publica ser publicada corretamente.

## Causa raiz do erro CORS no Vercel

O navegador mostra erro de CORS porque o preflight `OPTIONS /auth/login`
na API publica recebe `404` sem `Access-Control-Allow-Origin`. Isso indica que
o servico publicado em `https://localtrak-api.onrender.com` nao esta servindo
o NestJS nesta URL, ou foi publicado com comando/root directory incorreto.

Se o NestJS estivesse rodando, `GET /health` responderia `200` e o CORS seria
aplicado por `apps/api/src/main.ts`.

## Correcao aplicada no repositorio

- `apps/api/src/main.ts` sempre inclui `https://localtrak-web.vercel.app` e
  `https://localtrak-mobile.vercel.app` nas origens permitidas, mesmo quando
  `CORS_ORIGINS` estiver incompleto no host.
- `render.yaml` foi adicionado na raiz para o Render subir `localtrak-api`
  com build/start corretos do monorepo:
  - build: `pnpm install`, `pnpm prisma:generate`, `pnpm build:api`
  - pre-deploy: `pnpm prisma:migrate:deploy`
  - start: `pnpm start:api`
  - health check: `/health`

## Comandos para repetir o teste local

```powershell
pnpm prisma:seed
pnpm build:api
pnpm build:web
pnpm typecheck:mobile
pnpm build:mobile
pnpm start:api
```

Em outro terminal:

```powershell
$api = "http://localhost:3333"
Invoke-RestMethod "$api/health"

$body = @{ email = "admin@localtrak.test"; password = "ChangeMe123!" } | ConvertTo-Json
Invoke-RestMethod "$api/auth/login" -Method Post -ContentType "application/json" -Body $body
```

## Checklist para liberar login em producao

- [ ] Redeployar o servico `localtrak-api` no Render a partir do commit mais recente.
- [ ] Conferir as variaveis secretas no Render:
  - `DATABASE_URL`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `MASTER_ADMIN_PASSWORD`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Confirmar que `https://localtrak-api.onrender.com/health` responde `200`.
- [ ] Confirmar que `POST https://localtrak-api.onrender.com/auth/login` responde.
- [ ] Confirmar que `CORS_ORIGINS` da API contem:
  - `https://localtrak-web.vercel.app`
  - `https://localtrak-mobile.vercel.app`
- [ ] Confirmar no Vercel Web `NEXT_PUBLIC_API_URL=https://localtrak-api.onrender.com`.
- [ ] Confirmar no Vercel Mobile `EXPO_PUBLIC_API_URL=https://localtrak-api.onrender.com`
  e `NEXT_PUBLIC_API_URL=https://localtrak-api.onrender.com`.
- [ ] Redeploy web e mobile apos alterar variaveis publicas.
- [ ] Testar login MASTER_ADMIN no Vercel web.
- [ ] Testar login COMPANY_ADMIN no Vercel web.
- [ ] Testar bloqueio de EMPLOYEE no painel web.
- [ ] Testar login EMPLOYEE no mobile/Expo web.

## Observacoes tecnicas

- O backend nao usa Supabase Auth neste fluxo; Supabase e usado como PostgreSQL.
- JWT e roles sao validados pela API NestJS.
- O frontend web salva a sessao em `localStorage`; para producao comercial,
  avaliar migracao futura para cookie seguro HTTP-only.
- A tela de login web ainda vem com credenciais de teste preenchidas. Remover
  antes de divulgar o prototipo publicamente.
