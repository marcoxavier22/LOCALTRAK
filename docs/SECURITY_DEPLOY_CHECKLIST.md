# SECURITY_DEPLOY_CHECKLIST.md

Checklist de seguranca, integridade e deploy do prototipo LocalTrak Rotas.

## Segredos E Variaveis

- [ ] Rotacionar no Supabase a chave secreta que foi compartilhada fora do painel.
- [ ] Usar `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SECRET_KEY` somente na API.
- [ ] Nunca configurar chave secreta Supabase em Vercel, app mobile ou variaveis `NEXT_PUBLIC_*`.
- [ ] Configurar no Vercel apenas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ou `NEXT_PUBLIC_SUPABASE_KEY`.
- [ ] Gerar `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` fortes e diferentes por ambiente.
- [ ] Trocar `MASTER_ADMIN_PASSWORD` antes de expor o prototipo online.
- [ ] Confirmar que `.env`, `.env.local` e `.env.production` estao no `.gitignore`.

## Backend API

- [x] `PORT` usa ambiente com fallback para `3333`.
- [x] `CORS_ORIGINS` aceita multiplas origens separadas por virgula.
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
- [ ] Backups automaticos habilitados no painel Supabase.
- [ ] Confirmar politicas de retencao de logs e fotos antes de producao comercial.

## Frontend Web Vercel

- [x] Build web passa com `pnpm build:web`.
- [x] Helpers Supabase aceitam `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `NEXT_PUBLIC_SUPABASE_KEY`.
- [ ] `NEXT_PUBLIC_API_URL` deve apontar para API HTTPS.
- [ ] `CORS_ORIGINS` da API deve conter exatamente o dominio Vercel de producao.
- [~] JWT ainda fica em `localStorage` no prototipo. Para producao comercial, migrar para cookie `HttpOnly`, `Secure`, `SameSite` ou BFF.

## Mobile

- [x] Typecheck mobile passa com `pnpm typecheck:mobile`.
- [x] Login e chamadas API usam JWT Bearer.
- [x] Permissoes de localizacao sao solicitadas antes de rastrear.
- [ ] Testar Expo Go em dispositivo real apontando para API HTTPS.
- [ ] Validar upload de foto do odometro em camera real do aparelho.

## Teste Final Pos-Deploy

- [ ] `GET https://SUA_API/health` retorna `{"status":"ok","database":"connected"}`.
- [ ] Login `MASTER_ADMIN` abre `/master/dashboard`.
- [ ] `MASTER_ADMIN` cria empresa com primeiro `COMPANY_ADMIN`.
- [ ] Login `COMPANY_ADMIN` abre `/empresa/dashboard`.
- [ ] `COMPANY_ADMIN` cria funcionario e veiculo.
- [ ] Login `EMPLOYEE` no app mobile.
- [ ] `EMPLOYEE` inicia turno, envia pontos e finaliza turno.
- [ ] `EMPLOYEE` faz upload de foto inicial/final de odometro em OS.
- [ ] `COMPANY_ADMIN` visualiza rotas/OS e fotos assinadas no painel.
- [ ] `EMPLOYEE` nao acessa painel web.
- [ ] `COMPANY_ADMIN` nao acessa endpoints `/master/*`.
