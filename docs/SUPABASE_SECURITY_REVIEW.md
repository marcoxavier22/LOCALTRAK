# SUPABASE_SECURITY_REVIEW.md

Revisao do checkpoint Supabase do LocalTrak Rotas.

## Projeto Validado

- Projeto: `LocalTrak`
- Project ref: `bbcubwmvizcmjtwiiyxv`
- URL: `https://bbcubwmvizcmjtwiiyxv.supabase.co`
- Status: `ACTIVE_HEALTHY`

## Acoes Realizadas

- Schema inicial aplicado no Supabase.
- Migrations locais registradas em `_prisma_migrations`.
- Seed remoto criou `MASTER_ADMIN` somente se ainda nao existia.
- Tabelas do schema `public` tiveram RLS habilitado.
- Nenhuma policy publica foi criada, mantendo o acesso direto via Supabase API fechado por padrao.
- Bucket privado `order-odometer` validado para fotos de odometro.
- Upload de odometro validado com MIME permitido, limite de 5 MB, nome unico e `upsert: false`.
- Hash bcrypt do `MASTER_ADMIN` validado localmente.
- Advisor de seguranca Supabase reexecutado depois do RLS.

## Resultado Dos Advisors

Seguranca:

- Erros de `RLS Disabled in Public` foram resolvidos.
- Restam avisos informativos `RLS Enabled No Policy`, esperados para este desenho, porque o acesso aos dados deve passar pela API NestJS e nao pelo PostgREST publico.
- Validacao atual: 12 tabelas com RLS habilitado e 0 policies publicas.
- Seed atual: usuarios `MASTER_ADMIN`, `COMPANY_ADMIN` e `EMPLOYEE` ativos.
- Migrations atuais: 4 registros em `_prisma_migrations`.
- Dados atuais de teste: 2 empresas, 5 usuarios, 2 rotas finalizadas e 3 pontos de rota apos o Sprint 0.

Performance:

- Avisos informativos de indices nao usados sao esperados em banco recem-criado sem carga real.
- O advisor apontou foreign keys sem indice em `companies.plan_id` e `vehicle_maintenances.maintenance_rule_id`; isso pode virar uma migration futura se as consultas passarem a filtrar por esses campos.

## Acoes Obrigatorias Antes De Expor Publicamente

- Rotacionar a chave secreta Supabase compartilhada fora do painel.
- Configurar `DATABASE_URL` real no provedor da API, com senha do banco e `sslmode=require`.
- Configurar `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` fortes no provedor.
- Configurar `CORS_ORIGINS` com o dominio real do frontend.
- Configurar `NEXT_PUBLIC_API_URL` com a URL real da API hospedada.
- Trocar a senha inicial do `MASTER_ADMIN` depois do primeiro login.
- Nunca colocar `sb_secret`, JWT secrets ou `DATABASE_URL` em arquivos versionados.
- Nunca colocar `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SECRET_KEY` em Vercel/Next com prefixo `NEXT_PUBLIC_`.

## Validacao Local Do Checkpoint

- `pnpm prisma:generate`: passou.
- `pnpm prisma:migrate:deploy`: passou, sem migrations pendentes.
- `pnpm prisma:seed`: passou.
- `pnpm build:api`: passou.
- `pnpm build:web`: passou.
- `pnpm --filter @localtrak/mobile typecheck`: passou.
- `pnpm dev:api`: subiu localmente e `GET /health` respondeu `status: ok`.
- `pnpm dev:web`: subiu em porta alternativa (`3002`) porque `3000/3001` estavam ocupadas; `/login`, `/master/dashboard` e `/empresa/dashboard` responderam HTML.
- Logins `MASTER_ADMIN`, `COMPANY_ADMIN` e `EMPLOYEE`: passaram via API local contra Supabase.
- Fluxo HTTP de rota `EMPLOYEE`: `start`, `points`, `finish` e `my-history` passou contra Supabase.
- Upload de odometro rejeitou `text/plain` e aceitou `image/png` no Storage privado.
- Role guards bloquearam `COMPANY_ADMIN` em `/master/companies` e `EMPLOYEE` em `/company/employees`.

## Observacao Importante

As API keys do Supabase nao substituem a `DATABASE_URL` do PostgreSQL. O backend NestJS usa Prisma, entao precisa da connection string do banco para rodar localmente ou em Render/Railway.
