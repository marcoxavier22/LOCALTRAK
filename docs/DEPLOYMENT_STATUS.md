# DEPLOYMENT_STATUS.md

Status do deploy e validacao do LocalTrak Rotas em 2026-05-17.

## GitHub

- Repositorio: `marcoxavier22/LOCALTRAK`
- Branch principal: `main`
- Deploy automatico Vercel via GitHub: ativo para web e mobile.

## Vercel

### Frontend Web

- Projeto: `localtrak-web`
- URL de producao: `https://localtrak-web.vercel.app`
- Ultimo deploy validado: `READY`
- Fonte do deploy: GitHub `marcoxavier22/LOCALTRAK`, branch `main`
- Root Directory esperado: `apps/web`
- Build Command esperado: `pnpm build`

### Mobile Web / Expo Web

- Projeto: `localtrak-mobile`
- URL de producao: `https://localtrak-mobile.vercel.app`
- Ultimo deploy validado: `READY`
- Fonte do deploy: GitHub `marcoxavier22/LOCALTRAK`, branch `main`
- Root Directory esperado: `apps/mobile`
- Build Command esperado: `pnpm build:web`
- Output Directory esperado: `dist`

## Backend API

- API local validada em `http://localhost:3333`.
- API publica candidata: `https://localtrak-api.onrender.com`.
- Estado atual da API publica: retorna `404` em `/health` e `/auth/login`.
- Recomendacao atual: redeployar a API NestJS no Render usando o `render.yaml`
  da raiz e as variaveis secretas corretas do ambiente.

## Supabase

- Prisma migrations: sem pendencias em `pnpm prisma:migrate:deploy`.
- Seed: executado com sucesso.
- Usuarios de teste existem em `public.users`.
- Storage de odometro: validado via API local com upload valido e rejeicao de
  MIME invalido.

## Validacoes Locais Executadas

- [x] `pnpm install`
- [x] `pnpm prisma:generate`
- [x] `pnpm prisma:migrate:deploy`
- [x] `pnpm prisma:seed`
- [x] `pnpm build:api`
- [x] `pnpm build:web`
- [x] `pnpm typecheck:mobile`
- [x] `pnpm build:mobile`

## Smoke Test API Local

- [x] `GET /health` retornou `ok/connected`.
- [x] Login `MASTER_ADMIN`.
- [x] Login `COMPANY_ADMIN`.
- [x] Login `EMPLOYEE`.
- [x] `POST /auth/refresh` para os perfis de teste.
- [x] `POST /auth/logout` para os perfis de teste.
- [x] Resposta de login sem `passwordHash`/`password_hash`.
- [x] CORS local aceitou `https://localtrak-web.vercel.app`.
- [x] CORS local aceitou `https://localtrak-mobile.vercel.app`.
- [x] CORS local aceitou `http://localhost:3000`.
- [x] CORS local aceitou `http://localhost:8081`.

## Validacoes Vercel Executadas

- [x] `https://localtrak-web.vercel.app/login` respondeu `200`.
- [x] `https://localtrak-mobile.vercel.app` respondeu `200`.
- [x] Logs do deploy web indicam `Compiled successfully` e `Deployment completed`.
- [x] Logs do deploy mobile indicam `Exported: dist` e `Deployment completed`.

## Diagnostico Do Erro De Login Online

O navegador mostra erro de CORS porque o preflight:

```text
OPTIONS https://localtrak-api.onrender.com/auth/login
Origin: https://localtrak-web.vercel.app
```

recebe `404` sem `Access-Control-Allow-Origin`.

Isso nao e erro de credencial. A API publica configurada no frontend ainda nao
esta servindo o NestJS nesta URL. Quando o NestJS estiver rodando, `/health`
deve responder `200` e o CORS sera aplicado por `apps/api/src/main.ts`.

## Correcao Preparada

- [x] `apps/api/src/main.ts` sempre inclui os dominios Vercel no CORS:
  - `https://localtrak-web.vercel.app`
  - `https://localtrak-mobile.vercel.app`
- [x] `render.yaml` adicionado para publicar `localtrak-api` com:
  - build: `pnpm install`, `pnpm prisma:generate`, `pnpm build:api`
  - pre-deploy: `pnpm prisma:migrate:deploy`
  - start: `pnpm start:api`
  - health check: `/health`

## Pendencias Para Login Em Producao

- [ ] Redeployar/configurar o servico `localtrak-api` no Render a partir do
  commit mais recente.
- [ ] Confirmar variaveis no Render:
  - `DATABASE_URL`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `MASTER_ADMIN_PASSWORD`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CORS_ORIGINS`
- [ ] Confirmar `GET https://localtrak-api.onrender.com/health` retornando `200`.
- [ ] Confirmar `OPTIONS https://localtrak-api.onrender.com/auth/login`
  retornando `204` com `Access-Control-Allow-Origin`.
- [ ] Confirmar `POST https://localtrak-api.onrender.com/auth/login` retornando
  `accessToken`, `refreshToken` e `user`.
- [ ] Testar login real no Vercel web.
- [ ] Testar login real no mobile/Expo web.
