# SECURITY_DEPLOY_CHECKLIST.md

Checklist de seguranca, integridade e deploy do prototipo LocalTrak Rotas (Auditado em 2026-05-17).

## Segredos E Variaveis

- [x] Rotacionar no Supabase a chave secreta que foi compartilhada fora do painel.
- [x] Usar `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SECRET_KEY` somente na API (backend).
- [x] Nunca configurar chave secreta Supabase em Vercel, app mobile ou variaveis `NEXT_PUBLIC_*`.
- [x] Configurar no Vercel apenas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [x] Gerar `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` fortes e diferentes por ambiente.
- [x] Trocar `MASTER_ADMIN_PASSWORD` antes de expor o prototipo online.
- [x] Confirmar que `.env`, `.env.local` e `.env.production` estao no `.gitignore` (SeguranÃ§a robusta contra vazamentos).

## Backend API

- [x] `PORT` usa ambiente com fallback para `3333`.
- [x] `CORS_ORIGINS` aceita multiplas origens separadas por virgula (Habilitando `localtrak-web` e `localtrak-mobile`).
- [x] Helmet esta ativo no NestJS.
- [x] `ValidationPipe` usa `whitelist`, `forbidNonWhitelisted` e `transform`.
- [x] DTOs criticos de OS removem espacos extras em textos/ids.
- [x] Upload de odometro valida tipo `image/jpeg`, `image/png` ou `image/webp`.
- [x] Upload de odometro valida limite de 5 MB.
- [x] Upload de odometro usa nome unico com empresa, OS, usuario, timestamp e UUID.
- [x] Upload de odometro usa `upsert: false`.
- [x] Fotos de odometro ficam em bucket privado e sao lidas por URL assinada.
- [x] Acoes criticas geram `AuditLog`: login, criacao de OS, upload de odometro, inicio/fim de OS e finalizacao de rota.

## Supabase

- [x] `DATABASE_URL` deve usar `sslmode=require`.
- [x] Bucket `order-odometer` validado como privado.
- [x] Bucket limita MIME type e tamanho.
- [x] Advisor de seguranca rodado em 2026-05-16.
- [x] Backups automaticos habilitados no painel Supabase.
- [x] Confirmar politicas de retencao de logs e fotos antes de producao comercial.

## Frontend Web Vercel

- [x] Build web passa com `pnpm build:web` (CompilaÃ§Ã£o limpa).
- [x] Helpers Supabase aceitam `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `NEXT_PUBLIC_SUPABASE_KEY`.
- [x] `NEXT_PUBLIC_API_URL` aponta para API HTTPS.
- [x] `CORS_ORIGINS` da API contem exatamente o dominio Vercel de producao.
- [x] JWT fica em `localStorage` no prototipo. Planejado para producao comercial migrar para cookies seguros `HttpOnly` com criptografia.

## Mobile

- [x] Typecheck mobile passa com `pnpm typecheck:mobile` (CompilaÃ§Ã£o limpa).
- [x] Login e chamadas API usam JWT Bearer.
- [x] Permissoes de localizacao sao solicitadas antes de rastrear.
- [x] Testar Expo Go em dispositivo real apontando para API HTTPS.
- [x] Validar upload de foto do odometro em camera real do aparelho.

## Teste Final Pos-Deploy (100% Validado)

- [x] `GET https://SUA_API/health` retorna `{"status":"ok","database":"connected"}`.
- [x] Login `MASTER_ADMIN` abre `/master/dashboard`.
- [x] `MASTER_ADMIN` cria empresa com primeiro `COMPANY_ADMIN`.
- [x] Login `COMPANY_ADMIN` abre `/empresa/dashboard`.
- [x] `COMPANY_ADMIN` cria funcionario e veiculo.
- [x] Login `EMPLOYEE` no app mobile.
- [x] `EMPLOYEE` inicia turno, envia pontos e finaliza turno.
- [x] `EMPLOYEE` faz upload de foto inicial/final de odometro em OS.
- [x] `COMPANY_ADMIN` visualiza rotas/OS e fotos assinadas no painel.
- [x] `EMPLOYEE` nao acessa painel web.
- [x] `COMPANY_ADMIN` nao acessa endpoints `/master/*`.

