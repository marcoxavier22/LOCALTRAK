# PRODUCTION_DEPLOY_CHECKLIST.md

Checklist passo a passo para preparar, publicar e validar o prototipo LocalTrak Rotas em ambiente online.

Escopo recomendado para a arquitetura atual:

- Web Next.js: Vercel.
- API NestJS: Render, Railway ou VPS/Cloud com Node.js persistente.
- Banco e Storage: Supabase PostgreSQL + Supabase Storage.
- Mobile Expo: Expo Go para teste e EAS Build quando virar build distribuivel.

> Importante: a API NestJS atual roda como servidor Node persistente (`node dist/main.js`). Para hospedar a API na Vercel seria necessario adaptar o backend para serverless functions. Para o primeiro deploy de producao do prototipo, use Vercel para o web e Render/Railway para a API.

## 0. Portao De Seguranca Antes De Qualquer Deploy

- [ ] Rotacionar qualquer chave secreta Supabase que tenha sido compartilhada fora do painel.
- [ ] Gerar novos `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET`, longos, aleatorios e diferentes.
- [ ] Trocar `MASTER_ADMIN_PASSWORD` antes de expor o ambiente publicamente.
- [ ] Confirmar que `.env`, `.env.local`, `.env.production`, `.env.development` e logs estao no `.gitignore`.
- [ ] Rodar busca local por segredos reais:

```powershell
rg "sb_secret|service_role|JWT_ACCESS_SECRET=.*[A-Za-z0-9_-]{20,}|DATABASE_URL=.*postgresql://.*:.*@" `
  --glob "!node_modules/**" `
  --glob "!**/dist/**" `
  --glob "!**/.next/**" `
  --glob "!**/.env" `
  --glob "!**/.env.*"
```

- [ ] Confirmar que a busca retorna apenas placeholders/documentacao, nunca valores reais.
- [ ] Confirmar que `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SECRET_KEY` existe somente no backend.
- [ ] Confirmar que o frontend usa apenas `NEXT_PUBLIC_SUPABASE_URL` e chave publishable (`sb_publishable_*`).

## 1. Backend NestJS

### 1.1 Revisao De Endpoints Criticos

- [ ] Revisar `POST /auth/login`.
- [ ] Revisar `POST /auth/refresh`.
- [ ] Revisar `POST /auth/logout`.
- [ ] Revisar endpoints master: `/master/companies`, `/master/users`.
- [ ] Revisar endpoints empresa: `/company/employees`, `/company/vehicles`, `/company/routes`.
- [ ] Revisar rotas mobile: `POST /routes/start`, `POST /routes/:id/points`, `POST /routes/:id/finish`, `GET /routes/active`, `GET /routes/my-history`.
- [ ] Revisar OS: `/orders`, `/orders/:id/start`, `/orders/:id/finish`, `/orders/:id/upload-odometer`, `/orders/:id/odometer-photo`.
- [ ] Revisar manutencao: `/company/maintenance/*`.
- [ ] Revisar combustivel: `/company/fuel/settings`.
- [ ] Revisar reembolsos: `/company/reimbursements`.
- [ ] Confirmar que nenhuma resposta retorna `passwordHash`, `password_hash`, refresh token hash ou secrets.

### 1.2 Autenticacao JWT

- [ ] Confirmar `JWT_ACCESS_SECRET` configurado no provedor da API.
- [ ] Confirmar `JWT_REFRESH_SECRET` configurado e diferente do access secret.
- [ ] Confirmar `JWT_ACCESS_EXPIRES_IN=15m` ou valor curto equivalente.
- [ ] Confirmar `JWT_REFRESH_EXPIRES_IN=7d` ou politica definida.
- [ ] Validar login:

```powershell
$body = @{ email = "admin@localtrak.test"; password = "SENHA_REAL" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "https://SUA_API/auth/login" -ContentType "application/json" -Body $body
```

- [ ] Validar refresh com token real.
- [ ] Validar logout e confirmar que refresh token antigo nao funciona.
- [ ] Confirmar que tokens nao aparecem em logs.

### 1.3 Role Guards E Multiempresa

- [ ] `MASTER_ADMIN` acessa endpoints `/master/*`.
- [ ] `COMPANY_ADMIN` recebe `403` em `/master/*`.
- [ ] `EMPLOYEE` recebe `403` em `/master/*` e `/company/*`.
- [ ] `COMPANY_ADMIN` so lista funcionarios, veiculos, rotas, OS, manutencoes e reembolsos da propria `companyId`.
- [ ] `EMPLOYEE` so acessa propria rota, proprio historico e OS atribuida.
- [ ] Teste de role guard:

```powershell
$headers = @{ Authorization = "Bearer TOKEN_COMPANY_ADMIN" }
Invoke-WebRequest -Uri "https://SUA_API/master/companies" -Headers $headers -Method Get
# Esperado: 403
```

```powershell
$headers = @{ Authorization = "Bearer TOKEN_EMPLOYEE" }
Invoke-WebRequest -Uri "https://SUA_API/company/employees" -Headers $headers -Method Get
# Esperado: 403
```

### 1.4 Validacao E Sanitizacao

- [ ] Confirmar `ValidationPipe` global com `whitelist: true`.
- [ ] Confirmar `forbidNonWhitelisted: true`.
- [ ] Confirmar `transform: true`.
- [ ] Confirmar `class-validator` nos DTOs de auth, empresas, usuarios, veiculos, rotas, OS, manutencao, combustivel e reembolso.
- [ ] Confirmar trim/sanitizacao de strings sensiveis, como e-mail, ids, titulo de OS, descricao e enderecos.
- [ ] Testar payload com campo extra e esperar `400`.
- [ ] Testar payload com tipos invalidos e esperar `400`.
- [ ] Confirmar que erros de producao nao vazam stack trace.

### 1.5 Upload De Foto Do Odometro

- [ ] Confirmar que foto inicial e obrigatoria para iniciar OS.
- [ ] Confirmar que foto final e obrigatoria para finalizar OS.
- [ ] Confirmar que nome do arquivo inclui usuario, timestamp e identificador unico.
- [ ] Confirmar que o caminho inclui empresa e OS para isolamento operacional.
- [ ] Confirmar `upsert: false` para evitar overwrite.
- [ ] Confirmar limite de 5 MB.
- [ ] Confirmar MIME permitido: `image/jpeg`, `image/png`, `image/webp`.
- [ ] Testar MIME invalido:

```powershell
$headers = @{ Authorization = "Bearer TOKEN_EMPLOYEE" }
$body = @{
  stage = "START"
  odometerKm = 100
  photoBase64 = "dGVzdGU="
  photoContentType = "text/plain"
} | ConvertTo-Json

Invoke-WebRequest `
  -Method Post `
  -Uri "https://SUA_API/orders/ORDER_ID/upload-odometer" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $body
# Esperado: 400
```

- [ ] Testar upload real com camera do app mobile.
- [ ] Confirmar que o frontend exibe URL assinada, nao caminho publico aberto.

### 1.6 Supabase PostgreSQL E SSL

- [ ] `DATABASE_URL` no provedor da API usa `sslmode=require`.
- [ ] Rodar migrations em producao:

```bash
pnpm prisma:migrate:deploy
```

- [ ] Gerar Prisma Client:

```bash
pnpm prisma:generate
```

- [ ] Rodar seed inicial:

```bash
pnpm prisma:seed
```

- [ ] Confirmar que seed nao sobrescreve usuarios existentes.
- [ ] Validar health:

```powershell
Invoke-RestMethod -Uri "https://SUA_API/health" -Method Get
# Esperado: { status: "ok", database: "connected" }
```

### 1.7 Logs E Auditoria

- [ ] Confirmar `AuditLog` em login.
- [ ] Confirmar `AuditLog` em criacao/inicio/fim de OS.
- [ ] Confirmar `AuditLog` em upload de odometro.
- [ ] Confirmar `AuditLog` em finalizacao de rota.
- [ ] Adicionar/validar auditoria para alteracoes sensiveis: usuarios, empresas, veiculos, reembolsos e manutencao.
- [ ] Confirmar que logs nao incluem senha, JWT, refresh token, service role key, secret key ou `DATABASE_URL`.
- [ ] Configurar retencao de logs no provedor.

### 1.8 Build E Start Da API

- [ ] Instalar dependencias:

```bash
pnpm install --frozen-lockfile
```

- [ ] Build:

```bash
pnpm build:api
```

- [ ] Start de producao:

```bash
pnpm start:api
```

- [ ] Confirmar que a API usa `process.env.PORT || 3333`.

## 2. Frontend Web Next.js

### 2.1 Variaveis Para Vercel

- [ ] Configurar `NEXT_PUBLIC_API_URL=https://SUA_API`.
- [ ] Configurar `NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co`.
- [ ] Configurar `NEXT_PUBLIC_SUPABASE_KEY=sb_publishable_...`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...`.
- [ ] Nao configurar `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `JWT_ACCESS_SECRET` ou `JWT_REFRESH_SECRET` na Vercel como `NEXT_PUBLIC_*`.
- [ ] Separar variaveis de Production e Preview no painel da Vercel.

### 2.2 CORS E HTTPS

- [ ] Configurar `CORS_ORIGINS` na API com o dominio final da Vercel.
- [ ] Se houver preview deploy, adicionar dominio de preview apenas quando necessario.
- [ ] Confirmar que `NEXT_PUBLIC_API_URL` usa `https://`.
- [ ] Confirmar preflight:

```powershell
Invoke-WebRequest `
  -Method Options `
  -Uri "https://SUA_API/auth/login" `
  -Headers @{
    Origin = "https://SEU_FRONT.vercel.app"
    "Access-Control-Request-Method" = "POST"
    "Access-Control-Request-Headers" = "content-type,authorization"
  }
```

- [ ] Esperado: header `Access-Control-Allow-Origin` igual ao dominio autorizado.

### 2.3 Tokens No Web

- [ ] Reconhecer risco atual: prototipo usa JWT no `localStorage`.
- [ ] Antes de producao comercial, migrar para cookie `HttpOnly`, `Secure`, `SameSite=Lax/Strict` ou arquitetura BFF.
- [ ] Enquanto for prototipo, reduzir TTL do access token e nao logar tokens.
- [ ] Confirmar logout remove access token, refresh token e user local.
- [ ] Confirmar `EMPLOYEE` nao entra no painel web.

### 2.4 Formularios E XSS

- [ ] Validar e-mail antes de enviar login.
- [ ] Validar datas, numeros, KM, custo, status e ids antes do submit.
- [ ] Exibir mensagens amigaveis para `400`, `401`, `403`, `404` e `500`.
- [ ] Nao usar `dangerouslySetInnerHTML` para dados vindos da API.
- [ ] Confirmar que textos renderizados em React sao escapados normalmente.
- [ ] Testar campos com `<script>alert(1)</script>` e confirmar que aparecem como texto ou sao rejeitados.

### 2.5 UX/UI E Responsividade

- [ ] Validar `/login`.
- [ ] Validar `/master/dashboard`.
- [ ] Validar `/master/empresas`.
- [ ] Validar `/empresa/dashboard`.
- [ ] Validar `/empresa/funcionarios`.
- [ ] Validar `/empresa/veiculos`.
- [ ] Validar `/empresa/rotas`.
- [ ] Validar `/empresa/ordens`.
- [ ] Validar `/empresa/manutencao`.
- [ ] Validar `/empresa/combustivel`.
- [ ] Validar `/empresa/reembolsos`.
- [ ] Testar desktop, tablet e mobile.
- [ ] Testar dark mode persistente.
- [ ] Testar loading states e estados vazios.
- [ ] Testar tabelas com busca/filtros.
- [ ] Testar mapas de rotas e OS.
- [ ] Confirmar fotos do odometro em detalhe de OS.

### 2.6 Build Web

- [ ] Build local:

```bash
pnpm build:web
```

- [ ] Projeto Vercel:
  - [ ] Root directory: `apps/web` se o projeto for importado pela pasta do app.
  - [ ] Framework preset: Next.js.
  - [ ] Install command: `pnpm install --frozen-lockfile`.
  - [ ] Build command: `pnpm build` se root for `apps/web`, ou `pnpm build:web` se root for a raiz do monorepo.
  - [ ] Confirmar que `pnpm-lock.yaml` esta no reposititorio.

## 3. App Mobile React Native / Expo

### 3.1 Ambiente Mobile

- [ ] Confirmar que `pnpm dev:mobile` abre Expo.
- [ ] Para teste em dispositivo real, `API_URL` deve apontar para API HTTPS ou IP local acessivel pelo celular.
- [ ] Nao embutir service role key, secret key, JWT secrets ou `DATABASE_URL` no app.
- [ ] Confirmar logout limpa token e estado local.

### 3.2 Login E JWT

- [ ] Login `EMPLOYEE` funciona.
- [ ] Login `MASTER_ADMIN` exibe mensagem de acesso exclusivo para funcionarios.
- [ ] Login `COMPANY_ADMIN` exibe mensagem de acesso exclusivo para funcionarios.
- [ ] Token Bearer e enviado em rotas mobile.
- [ ] Resposta `401` limpa sessao e volta para login.

### 3.3 Geolocalizacao

- [ ] Permissao de localizacao em primeiro plano e solicitada com texto claro.
- [ ] Permissao de background e solicitada quando a funcionalidade for usada.
- [ ] O app mostra status claro quando esta rastreando.
- [ ] O app nao rastreia fora do turno.
- [ ] Inicio de turno falha de forma amigavel se a permissao for negada.
- [ ] Background tracking testado em dispositivo fisico.
- [ ] Pontos enviados incluem latitude, longitude, accuracy, speed, altitude quando disponivel, bateria quando disponivel e timestamp.

### 3.4 Rotas Mobile

- [ ] `GET /routes/active` sincroniza rota em andamento ao abrir o app.
- [ ] Se nao houver rota ativa, botao "Iniciar turno" cria rota.
- [ ] Se houver rota ativa real, app exibe "Em rota" e permite finalizar.
- [ ] `POST /routes/start` impede duas rotas em andamento.
- [ ] `POST /routes/:id/points` envia pontos em lote.
- [ ] `POST /routes/:id/finish` finaliza rota e limpa `routeId` local.
- [ ] Historico carrega `GET /routes/my-history`.
- [ ] Rota finalizada aparece no painel web.

### 3.5 OS E Odometro

- [ ] Lista "Minhas OS" carrega OS atribuidas ao funcionario.
- [ ] Inicio de OS bloqueia sem foto inicial.
- [ ] Foto inicial envia para `/orders/:id/upload-odometer` ou `/orders/:id/start`.
- [ ] Finalizacao de OS bloqueia sem foto final.
- [ ] Foto final envia e OS muda para finalizada.
- [ ] KM final menor que KM inicial retorna erro amigavel.
- [ ] Fotos aparecem no painel web via URL assinada.

### 3.6 Teste Expo

- [ ] Rodar:

```bash
pnpm dev:mobile
```

- [ ] Abrir no Expo Go.
- [ ] Testar login `EMPLOYEE`.
- [ ] Iniciar rota.
- [ ] Enviar pontos.
- [ ] Finalizar rota.
- [ ] Abrir historico.
- [ ] Criar/iniciar/finalizar OS com foto de odometro.

## 4. Supabase

### 4.1 Database

- [ ] Confirmar projeto correto no Supabase.
- [ ] Confirmar `DATABASE_URL` com `sslmode=require`.
- [ ] Confirmar migrations aplicadas.
- [ ] Confirmar `_prisma_migrations` atualizado.
- [ ] Confirmar seed inicial.
- [ ] Confirmar usuarios de teste:
  - [ ] `MASTER_ADMIN`
  - [ ] `COMPANY_ADMIN`
  - [ ] `EMPLOYEE`
- [ ] Confirmar tabelas principais:
  - [ ] `users`
  - [ ] `companies`
  - [ ] `vehicles`
  - [ ] `route_shifts`
  - [ ] `route_points`
  - [ ] `service_orders`
  - [ ] `service_order_stops`
  - [ ] `vehicle_maintenances`
  - [ ] `fuel_settings`
  - [ ] `reimbursement_payments`
  - [ ] `audit_logs`

### 4.2 RLS E Data API

- [ ] RLS habilitado nas tabelas `public`.
- [ ] Sem policies publicas liberando dados sensiveis.
- [ ] Como o acesso oficial passa pela API NestJS, nao expor tabelas diretamente ao cliente.
- [ ] Rodar advisor de seguranca no Supabase.
- [ ] Registrar pendencias informativas de RLS sem policy, se forem esperadas no desenho API-only.

### 4.3 Storage

- [ ] Bucket `order-odometer` existe.
- [ ] Bucket e privado.
- [ ] Limite do bucket: 5 MB.
- [ ] MIME permitido: `image/jpeg`, `image/png`, `image/webp`.
- [ ] API gera signed URL para leitura.
- [ ] Service role/secret key fica somente no backend.
- [ ] Testar upload valido.
- [ ] Testar upload invalido.

### 4.4 Backup E Operacao

- [ ] Habilitar backup automatico conforme plano Supabase.
- [ ] Definir retencao de fotos de odometro.
- [ ] Definir politica LGPD para exclusao/exportacao de dados.
- [ ] Configurar alertas de uso, erro e quota.

## 5. Deploy

### 5.1 Deploy Da API

- [ ] Criar servico em Render/Railway.
- [ ] Configurar root do repo como raiz do deploy.
- [ ] Configurar variaveis:
  - [ ] `DATABASE_URL`
  - [ ] `JWT_ACCESS_SECRET`
  - [ ] `JWT_REFRESH_SECRET`
  - [ ] `JWT_ACCESS_EXPIRES_IN`
  - [ ] `JWT_REFRESH_EXPIRES_IN`
  - [ ] `PORT`
  - [ ] `CORS_ORIGINS`
  - [ ] `MASTER_ADMIN_NAME`
  - [ ] `MASTER_ADMIN_EMAIL`
  - [ ] `MASTER_ADMIN_PASSWORD`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SECRET_KEY`
  - [ ] `SUPABASE_STORAGE_BUCKET`
- [ ] Build command:

```bash
pnpm install --frozen-lockfile && pnpm prisma:generate && pnpm build:api
```

- [ ] Start command:

```bash
pnpm start:api
```

- [ ] Rodar migration deploy:

```bash
pnpm prisma:migrate:deploy
```

- [ ] Rodar seed:

```bash
pnpm prisma:seed
```

- [ ] Testar `GET /health`.

### 5.2 Deploy Do Web Na Vercel

- [ ] Criar projeto na Vercel.
- [ ] Importar repo do monorepo.
- [ ] Definir root directory como `apps/web` ou manter raiz e usar `pnpm build:web`.
- [ ] Configurar envs `NEXT_PUBLIC_*`.
- [ ] Confirmar build.
- [ ] Confirmar dominio HTTPS.
- [ ] Copiar dominio Vercel final.
- [ ] Atualizar `CORS_ORIGINS` da API com o dominio Vercel.
- [ ] Reimplantar API apos alterar CORS.
- [ ] Testar login pelo dominio Vercel.

### 5.3 Deploy/Distribuicao Mobile

- [ ] Para teste: usar Expo Go apontando para API HTTPS.
- [ ] Para distribuicao: configurar EAS Build.
- [ ] Criar perfis de build `preview` e `production`.
- [ ] Configurar env publica da API para o app.
- [ ] Testar Android fisico.
- [ ] Testar iPhone fisico.
- [ ] Validar background location nas plataformas alvo.

## 6. Testes Finais De Producao

### 6.1 Login E Acesso

- [ ] Login `MASTER_ADMIN`.
- [ ] `MASTER_ADMIN` acessa `/master/dashboard`.
- [ ] `MASTER_ADMIN` cria empresa com primeiro `COMPANY_ADMIN`.
- [ ] Login `COMPANY_ADMIN`.
- [ ] `COMPANY_ADMIN` acessa `/empresa/dashboard`.
- [ ] Login `EMPLOYEE` no web e bloqueio com mensagem de app mobile.
- [ ] Login `EMPLOYEE` no app mobile.

### 6.2 Empresas, Funcionarios E Veiculos

- [ ] Criar empresa.
- [ ] Editar empresa.
- [ ] Bloquear empresa.
- [ ] Ativar empresa.
- [ ] Criar funcionario.
- [ ] Editar funcionario.
- [ ] Ativar/desativar funcionario.
- [ ] Criar veiculo.
- [ ] Editar veiculo.
- [ ] Vincular veiculo a funcionario.

### 6.3 Rotas E Mapas

- [ ] `EMPLOYEE` inicia turno no app.
- [ ] App envia pontos.
- [ ] Dashboard web mostra rota ativa.
- [ ] Mapa mostra ponto inicial, ponto atual e linha do trajeto.
- [ ] `EMPLOYEE` finaliza turno.
- [ ] Dashboard mostra rota finalizada.
- [ ] Historico mostra trajeto completo.
- [ ] KM total e duracao conferem.

### 6.4 OS E Odometro

- [ ] `COMPANY_ADMIN` cria OS.
- [ ] `COMPANY_ADMIN` atribui funcionario e veiculo.
- [ ] `EMPLOYEE` ve OS no app.
- [ ] Inicio da OS exige foto inicial.
- [ ] Foto inicial aparece no web.
- [ ] Rota da OS aparece no mapa.
- [ ] Finalizacao exige foto final.
- [ ] Foto final aparece no web.
- [ ] KM inicial, KM final e distancia aparecem corretamente.

### 6.5 Manutencao, Combustivel E Reembolsos

- [ ] Criar regra de manutencao.
- [ ] Registrar manutencao realizada.
- [ ] Validar alerta de manutencao por KM/dias.
- [ ] Criar configuracao de combustivel.
- [ ] Validar custo estimado por veiculo.
- [ ] Validar reembolso para veiculo particular.
- [ ] Registrar reembolso pago.
- [ ] Filtrar reembolsos por funcionario, veiculo, periodo e status.

### 6.6 UX, Dark Mode E Responsividade

- [ ] Testar desktop.
- [ ] Testar tablet.
- [ ] Testar mobile web.
- [ ] Testar dark mode.
- [ ] Testar sidebar/menu.
- [ ] Testar loading states.
- [ ] Testar estados vazios.
- [ ] Testar mensagens de erro.
- [ ] Testar mapas em telas pequenas.

## 7. Testes De Seguranca

- [ ] Sem `passwordHash` em qualquer resposta.
- [ ] Sem secrets em logs.
- [ ] Sem service key no bundle web.
- [ ] Sem service key no app mobile.
- [ ] `COMPANY_ADMIN` nao acessa outra empresa.
- [ ] `EMPLOYEE` nao acessa outro funcionario.
- [ ] Upload invalido rejeitado.
- [ ] Upload grande rejeitado.
- [ ] CORS bloqueia origem nao autorizada.
- [ ] Tokens expirados retornam `401`.
- [ ] Refresh invalido retorna `401`.
- [ ] Logout invalida refresh token.
- [ ] RLS habilitado no Supabase.
- [ ] Storage privado.

## 8. Rollback E Operacao

- [ ] Registrar versao/tag do deploy.
- [ ] Manter commit anterior pronto para rollback.
- [ ] Validar rollback da Vercel.
- [ ] Validar rollback da API.
- [ ] Manter backup do banco antes de migrations criticas.
- [ ] Documentar incidentes e responsaveis.
- [ ] Configurar monitoramento de uptime.
- [ ] Configurar captura de erros, como Sentry, antes de producao comercial.

## 9. Criterio De Pronto

O deploy so deve ser considerado pronto quando:

- [ ] API responde `/health` online.
- [ ] Web Vercel faz login e consome API HTTPS.
- [ ] Mobile Expo faz login e registra rota.
- [ ] Supabase persiste usuarios, rotas, pontos, OS, fotos, manutencao, combustivel e reembolsos.
- [ ] Role guards passam nos testes negativos.
- [ ] Upload de odometro funciona e fotos sao privadas.
- [ ] Mapas e dashboards exibem dados reais.
- [ ] Dark mode e responsividade foram testados.
- [ ] Checklist de seguranca sem pendencias criticas.
