# SECURITY_CHECKLIST.md

Checklist minimo de seguranca para o backend do LocalTrak Rotas antes do primeiro deploy online.

## Variaveis E Segredos

- [ ] Rotacionar imediatamente a chave secreta Supabase compartilhada no chat.
- [ ] `JWT_ACCESS_SECRET` forte, aleatorio e exclusivo do ambiente.
- [ ] `JWT_REFRESH_SECRET` forte, aleatorio e diferente do access secret.
- [ ] `MASTER_ADMIN_PASSWORD` trocada antes de exposicao publica.
- [ ] `DATABASE_URL` configurada somente no provedor, nunca hardcoded.
- [x] `.env`, `.env.local` e `.env.production` mantidos fora do Git por `.gitignore`.
- [x] Busca local confirmou ausencia de valores reais `sb_secret_*` em arquivos versionaveis do projeto.
- [x] `sb_publishable` e aceito apenas em variaveis `NEXT_PUBLIC_*`; ele nao concede privilegio administrativo.
- [x] Tokens JWT, secrets e connection strings nao aparecem em logs de aplicacao por implementacao atual.

## Supabase PostgreSQL

- [x] `DATABASE_URL` da API usa Supabase com `sslmode=require`.
- [x] Tabelas do schema `public` com RLS habilitado.
- [x] Sem policies publicas enquanto o acesso aos dados for apenas pela API NestJS.
- [ ] Usuario do banco tem apenas os privilegios necessarios para a API.
- [x] Migrations aplicadas com `pnpm prisma:migrate:deploy`.
- [x] Seed executado com `pnpm prisma:seed` e nao sobrescreve usuarios existentes.
- [ ] Backups automaticos do banco estao habilitados no provedor.

## Supabase Storage

- [x] Bucket `order-odometer` configurado como privado.
- [x] Bucket limita upload a `image/jpeg`, `image/png` e `image/webp`.
- [x] Bucket limita foto do odometro a 5 MB.
- [x] API valida MIME type e tamanho antes/depois do envio.
- [x] API nomeia fotos com empresa, OS, usuario, timestamp e UUID.
- [x] Upload de odometro usa `upsert: false` para evitar overwrite.
- [x] Fotos sao servidas por URL assinada gerada no backend.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SECRET_KEY` configurada somente no backend/deploy, nunca no web ou mobile.

## CORS

- [x] API le `CORS_ORIGINS` com multiplas origens separadas por virgula.
- [ ] `CORS_ORIGINS` contem apenas dominios reais do frontend em producao.
- [ ] Origens sao separadas por virgula quando houver mais de uma.
- [ ] Metodos permitidos: `GET`, `POST`, `PATCH`, `PUT`, `DELETE`, `OPTIONS`.
- [ ] Headers permitidos: `Content-Type` e `Authorization`.

## Autenticacao E Respostas

- [x] Senhas sao salvas apenas com hash seguro.
- [x] `password_hash` nao e selecionado nas respostas HTTP implementadas.
- [x] `MASTER_ADMIN`, `COMPANY_ADMIN` e `EMPLOYEE` usam guards por role.
- [x] `COMPANY_ADMIN` acessa apenas dados da propria empresa nos modulos atuais.
- [x] `EMPLOYEE` acessa apenas fluxos proprios e deve usar o app mobile.
- [x] Refresh tokens usam segredo proprio e expiracao configurada.
- [~] Painel web ainda guarda JWT em `localStorage` no prototipo; antes de producao comercial, migrar para cookie `HttpOnly`, `Secure`, `SameSite=Lax/Strict` ou BFF.

## Operacao

- [x] `GET /health` responde `status: ok` e `database: connected`.
- [x] Login `MASTER_ADMIN` funciona depois do seed.
- [ ] Criacao de empresa com primeiro `COMPANY_ADMIN` funciona.
- [x] Login `COMPANY_ADMIN` funciona.
- [x] Login `EMPLOYEE` funciona.
- [x] Endpoints administrativos bloqueiam roles indevidas.
- [x] Login, upload de odometro, criacao de OS e finalizacao de rota geram `AuditLog`.
- [ ] Erros de API nao vazam stack traces sensiveis em producao.

## Validacao Executada Em 2026-05-16

- [x] `pnpm build:api`
- [x] `pnpm build:web`
- [x] `pnpm typecheck:mobile`
- [x] `GET /health` retornou banco conectado.
- [x] Login `MASTER_ADMIN`, `COMPANY_ADMIN` e `EMPLOYEE` sem retorno de `passwordHash`.
- [x] `COMPANY_ADMIN` recebeu `403` em `/master/companies`.
- [x] `EMPLOYEE` recebeu `403` em `/company/employees`.
- [x] Preflight CORS para `http://localhost:8081` retornou origem permitida.
- [x] Rota mobile: iniciar, enviar pontos e finalizar retornou `FINISHED`.
- [x] Upload de odometro com `text/plain` foi rejeitado com `400`.
- [x] Upload de odometro com `image/png` foi aceito e persistiu caminho privado.
- [x] Advisor de seguranca Supabase rodado; retornou apenas avisos informativos de RLS habilitado sem policies nas tabelas `public`.
