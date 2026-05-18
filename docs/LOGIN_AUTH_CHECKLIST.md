# Login e autenticacao - checkpoint

Data do checkpoint: 2026-05-17.

## Escopo

Validar o fluxo de login do LocalTrak Rotas em backend NestJS, web Next.js,
mobile Expo e deploy Vercel, sem adicionar funcionalidades novas.

## Credenciais de teste

Use somente em ambiente de teste:

| Perfil | E-mail | Senha | Acesso esperado |
| --- | --- | --- | --- |
| MASTER_ADMIN | `admin@localtrak.test` | `<MASTER_ADMIN_PASSWORD>` | Painel master web |
| COMPANY_ADMIN | `<SEED_COMPANY_ADMIN_EMAIL>` | `<SEED_DEMO_PASSWORD>` | Painel da empresa web |
| EMPLOYEE | `<SEED_EMPLOYEE_EMAIL>` | `<SEED_DEMO_PASSWORD>` | App mobile |

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
- O bundle publicado deve apontar a API para `https://localtrak.onrender.com`.
- A API publica responde `GET /health` com status `200`.
  - `POST /auth/refresh`
  - `OPTIONS /auth/login`
- Portanto, o login em localhost esta funcional, mas o login no deploy Vercel
  fica bloqueado ate a API publica ser publicada corretamente.

## Causa raiz do erro CORS no Vercel

Se o navegador voltar a mostrar erro de CORS, confirme primeiro se o bundle web
foi reconstruido com `NEXT_PUBLIC_API_URL=https://localtrak.onrender.com`.
O preflight `OPTIONS /auth/login` nessa API ja deve responder `204` com
`Access-Control-Allow-Origin`.

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

$body = @{ email = "admin@localtrak.test"; password = "<MASTER_ADMIN_PASSWORD>" } | ConvertTo-Json
Invoke-RestMethod "$api/auth/login" -Method Post -ContentType "application/json" -Body $body
```

## Checklist para liberar login em producao

- [x] Redeployar o servico `LOCALTRAK` no Render a partir do commit mais recente.
- [ ] Conferir as variaveis secretas no Render:
  - `DATABASE_URL`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `MASTER_ADMIN_PASSWORD`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [x] Confirmar que `https://localtrak.onrender.com/health` responde `200`.
- [x] Confirmar que `POST https://localtrak.onrender.com/auth/login` responde.
- [ ] Confirmar que `CORS_ORIGINS` da API contem:
  - `https://localtrak-web.vercel.app`
  - `https://localtrak-mobile.vercel.app`
- [ ] Confirmar no Vercel Web `NEXT_PUBLIC_API_URL=https://localtrak.onrender.com`.
- [ ] Confirmar no Vercel Mobile `EXPO_PUBLIC_API_URL=https://localtrak.onrender.com`
  e `NEXT_PUBLIC_API_URL=https://localtrak.onrender.com`.
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

