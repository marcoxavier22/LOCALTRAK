# TASKS.md

Roadmap do projeto LocalTrak Rotas / TrakFlow.

## 17. Rebranding LocalTrak/Routify → TrakFlow

- [x] Auditar todos os textos e logos visíveis no frontend web e mobile.
- [x] Atualizar `apps/web/src/app/layout.tsx` — metadata title/description e script de tema.
- [x] Atualizar `apps/web/src/app/login/page.tsx` — textos, tagline, logo SVG e marketing copy.
- [x] Atualizar `apps/web/src/components/AppShell.tsx` — sidebar com logo SVG e marca TrakFlow.
- [x] Atualizar `apps/web/src/components/ThemeToggle.tsx` — chave localStorage `trakflow-theme` com fallbacks.
- [x] Atualizar `apps/mobile/app.json` — nome do app TrakFlow e descrições de permissões.
- [x] Atualizar `apps/mobile/src/App.tsx` — logo Svg TrakFlow, títulos de notificações, loading e login.
- [x] Atualizar `README.md` com posicionamento de marca, descrição e stack TrakFlow.
- [x] Atualizar `DECISIONS.md` documentando a decisão do rebranding definitivo.
- [~] Rodar builds obrigatórios locais para validar compilação (`pnpm install`, `pnpm prisma:generate`, `pnpm build:api`, `pnpm build:web`).
- [ ] Realizar commit e push para o repositório GitHub `marcoxavier22/LOCALTRAK`.
- [ ] Confirmar deploys em produção (Vercel e Render) e realizar testes de fumaça.

## 16. Rebranding LocalTrak → Routify (Legado)

- [x] Auditar todos os textos visíveis de marca no frontend web e mobile.
- [x] Atualizar `apps/web/src/app/layout.tsx` — title e description metadata.
- [x] Atualizar `apps/web/src/app/login/page.tsx` — textos, tagline e aria-label.
- [x] Atualizar `apps/web/src/components/AppShell.tsx` — marca na sidebar e topbar.
- [x] Atualizar `apps/web/src/components/ThemeToggle.tsx` — chave localStorage `routify-theme` com fallback `localtrak-theme`.
- [x] Atualizar `apps/mobile/app.json` — nome do app e permissoes iOS.
- [x] Atualizar `apps/mobile/src/App.tsx` — textos visiveis (loading, login, kicker, brand OS).
- [x] Generalizar `.env.example` — remover URL especifica do banco, adicionar variaveis mobile.
- [x] Otimizar `render.yaml` — remover `pnpm build:web` desnecessario, tornar MASTER_ADMIN secreto.
- [x] Registrar decisao de rebranding em `DECISIONS.md`.
- [x] Atualizar `README.md` com marca Routify e documentacao completa.
- [x] Criar logo TrakFlow (SVG) em `apps/web/public/trakflow-logo.svg`.
- [ ] Atualizar URLs de deploy para novo dominio quando disponivel.
- [ ] Migrar slug Expo de `localtrak-rotas` para `trakflow` apos confirmacao.


Legenda:

- `[ ]` pendente
- `[~]` em andamento/parcial
- `[x]` concluido

## Credenciais de Teste

| Perfil | Email | Senha |
|---|---|---|
| MASTER_ADMIN | `admin@localtrak.test` | `ChangeMe123!` |
| COMPANY_ADMIN | `admin@empresateste.com` | `Senha123!` |
| EMPLOYEE | `funcionario@empresateste.com` | `Senha123!` |
## 1. Base Do Projeto

- [x] Criar monorepo `localtrak-rotas`.
- [x] Criar estrutura `apps/api`, `apps/web`, `apps/mobile`.
- [x] Criar `packages/shared` e `packages/config`.
- [x] Criar `docker-compose.yml` com PostgreSQL/PostGIS.
- [x] Criar `.env.example`.
- [x] Criar documentacao inicial do projeto.
- [x] Validar instalacao completa com `pnpm install`.
- [ ] Validar build do monorepo.
- [ ] Configurar lint/test padrao do monorepo.

## 2. Backend

- [x] Criar base NestJS em `apps/api`.
- [x] Configurar `ConfigModule`.
- [x] Configurar `PrismaModule` e `PrismaService`.
- [x] Criar schema Prisma inicial.
- [x] Criar seed do `MASTER_ADMIN`.
- [x] Garantir seed idempotente de `COMPANY_ADMIN` e `EMPLOYEE` de teste.
- [x] Criar reset opcional de dados operacionais da empresa de teste com `RESET_TEST_DATA=true`.
- [x] Implementar JWT access token.
- [x] Implementar refresh token.
- [x] Hash de senha com bcrypt.
- [x] Criar guards de JWT e role.
- [x] Criar guard global para contexto de empresa.
- [~] Aplicar filtro por `company_id` nos servicos existentes.
- [ ] Criar testes automatizados de auth.
- [ ] Criar testes automatizados de permissao.
- [~] Criar `AuditLog` para acoes criticas.
- [x] Registrar `AuditLog` em login, criacao/inicio/fim de OS, upload de odometro e finalizacao de rota.
- [x] Validar build da API.
- [ ] Validar migrations em banco local.

## 3. Admin Master

- [x] Criar endpoints iniciais de empresas.
- [x] Criar endpoints iniciais de usuarios.
- [~] Criar dashboard master usando dados reais de empresas; endpoint dedicado `/master/dashboard` ainda pendente.
- [ ] Criar gestao de planos.
- [ ] Criar relatorios master.
- [ ] Criar bloqueio/ativacao com `AuditLog`.
- [ ] Criar fluxo para arquivar empresa.
- [x] Fazer criacao de empresa criar opcionalmente primeiro `COMPANY_ADMIN`.
- [ ] Criar teste automatizado para criacao de empresa com primeiro `COMPANY_ADMIN`.

## 4. Empresa E Usuarios

- [x] Criar listagem de funcionarios por empresa.
- [x] Criar funcionario com escopo de empresa.
- [x] Atualizar funcionario com escopo de empresa.
- [x] Criar endpoint de status para ativar/desativar funcionario.
- [x] Garantir resposta de erro amigavel para e-mail duplicado.
- [ ] Criar endpoint de detalhe do funcionario.
- [x] Criar ativar/desativar funcionario.
- [ ] Criar reset de senha.
- [ ] Criar aceite de termos.
- [ ] Criar testes impedindo acesso entre empresas.
- [ ] Criar testes impedindo `EMPLOYEE` acessar outro funcionario.

## 5. Veiculos

- [x] Criar modulo `vehicles`.
- [x] Criar DTOs de veiculo.
- [x] Criar CRUD de veiculos.
- [x] Vincular veiculo a funcionario.
- [~] Validar veiculo proprio vs veiculo da empresa.
- [x] Aplicar escopo obrigatorio por `company_id`.
- [ ] Criar testes de permissao para veiculos.

## 6. Rotas

- [x] Criar endpoint para iniciar rota.
- [x] Criar endpoint para receber pontos.
- [x] Criar endpoint para finalizar rota.
- [x] Validar `POST /routes/:id/finish` com rota real, calculo de km e historico.
- [x] Criar historico do funcionario.
- [x] Criar endpoint `GET /routes/active` para recuperar rota em andamento do funcionario no app mobile.
- [x] Criar listagem de rotas da empresa.
- [x] Criar resumo/detalhe de rota.
- [x] Vincular rota a `vehicleId` opcional no inicio.
- [x] Usar veiculo vinculado ao funcionario quando `vehicleId` nao for enviado.
- [x] Validar veiculo da rota por `company_id`.
- [x] Melhorar resumo de rota com funcionario, veiculo, status, km e duracao.
- [x] Aplicar escopo por `company_id` nas rotas existentes.
- [x] Criar validacao para impedir duas rotas simultaneas por funcionario de forma transacional.
- [x] Criar exemplos HTTP de rotas em `docs/http/04-routes.http`.
- [x] Criar endpoint `GET /routes/:id/live` para acompanhamento operacional.
- [x] Criar alias `GET /routes/:id` para detalhe protegido de rota.
- [x] Adicionar filtros em `GET /company/routes` por status, funcionario, veiculo e periodo.
- [x] Retornar ponto inicial, ponto atual, ultimo ponto, km parcial e duracao parcial no endpoint live.
- [x] Calcular status operacional `Pausado` quando rota ativa fica sem pontos recentes.
- [x] Criar alias `GET /routes/:id/history` para historico completo protegido da rota.
- [ ] Criar status completo de sincronizacao.
- [ ] Criar logs de inicio/fim de rastreamento.
- [ ] Criar testes de permissao de rotas.

## 7. Calculo De Km

- [x] Implementar calculo Haversine inicial.
- [x] Filtrar pontos com baixa precisao.
- [x] Atualizar km do veiculo ao finalizar rota.
- [ ] Remover pontos duplicados de forma mais robusta.
- [ ] Tratar saltos irreais de GPS.
- [ ] Criar testes unitarios para calculo de distancia.
- [ ] Avaliar uso de PostGIS para calculos futuros.

## 8. Manutencao

- [x] Modelar `MaintenanceRule`.
- [x] Modelar `VehicleMaintenance`.
- [x] Criar modulo `maintenance`.
- [x] Criar CRUD inicial de regras de manutencao.
- [x] Criar historico de manutencao por veiculo.
- [x] Criar listagem geral de manutencoes com filtros por veiculo, funcionario, data, tipo e status.
- [x] Gerar alertas por km.
- [x] Gerar alertas por data.
- [x] Registrar custos de manutencao.
- [x] Exigir veiculo, tipo, km atual, data, descricao e custo no registro de manutencao.
- [x] Calcular proxima manutencao ao registrar servico.
- [x] Criar exemplos HTTP de manutencao em `docs/http/06-maintenance.http`.
- [x] Documentar regras por km, por data ou por ambos.
- [ ] Criar relatorio de manutencao.
- [ ] Criar testes de permissao para manutencao.

## 9. Combustivel E Reembolso

- [x] Modelar `FuelSetting`.
- [x] Calcular reembolso basico usando `costPerKm` do veiculo.
- [x] Criar modulo `fuel`.
- [x] Criar CRUD de configuracoes de combustivel.
- [x] Calcular gasto estimado por rota.
- [x] Calcular gasto por veiculo em relatorio por periodo.
- [x] Calcular reembolso por funcionario.
- [x] Criar relatorio de reembolso.
- [x] Criar registro de pagamentos de reembolso com funcionario, veiculo, km, custo, valor, data, status e descricao.
- [x] Corrigir endpoint de pagamentos de reembolso e aplicar migration da tabela no Supabase/PostgreSQL.
- [x] Criar exemplos HTTP de combustivel e reembolso em `docs/http/07-fuel-reimbursements.http`.
- [ ] Criar testes de permissao para combustivel e reembolso.

## 9.1 Ordens De Servico

- [x] Modelar `ServiceOrder` e `ServiceOrderStop`.
- [x] Criar enums `ServiceOrderStatus` e `ServiceOrderStopStatus`.
- [x] Criar migration de OS no PostgreSQL/Supabase.
- [x] Criar bucket privado `order-odometer` no Supabase Storage quando o schema `storage` existir.
- [x] Criar modulo backend `orders`.
- [x] Criar `POST /orders` para `COMPANY_ADMIN`.
- [x] Criar `GET /orders` com filtros por funcionario, veiculo, status e periodo.
- [x] Criar `GET /orders/my-today` para `EMPLOYEE`.
- [x] Criar `GET /orders/:id` e `GET /orders/:id/route`.
- [x] Criar `GET /orders/:id/tracking` para rota GPS vinculada.
- [x] Criar `GET /orders/:id/odometer-photo`.
- [x] Criar `PATCH /orders/:id` para atualizar OS.
- [x] Criar `POST /orders/:id/upload-odometer` para foto inicial/final obrigatoria.
- [x] Criar `PATCH /orders/:id/start` bloqueando inicio sem foto inicial e vinculando `RouteShift`.
- [x] Criar `PATCH /orders/:id/finish` bloqueando finalizacao sem foto final, finalizando `RouteShift` e atualizando KM do veiculo.
- [x] Criar `PATCH /orders/:id/stops/:stopId/complete`.
- [x] Criar `DELETE /orders/:id`.
- [x] Aplicar escopo obrigatorio por `company_id` nas OS.
- [x] Garantir que `EMPLOYEE` so execute OS atribuida a ele.
- [x] Atualizar seed com OS de teste para `Empresa Teste`.
- [x] Criar tela web `/empresa/ordens`.
- [x] Criar tela web `/empresa/ordens/[id]`.
- [x] Exibir roteiro planejado da OS no mapa com marcadores de paradas.
- [x] Exibir trajeto GPS real da OS quando houver `RouteShift` vinculada.
- [x] Adicionar item `Ordens de Servico` na sidebar da empresa.
- [x] Criar aba `OS` no app mobile.
- [x] Implementar upload separado de foto obrigatoria antes de iniciar/finalizar OS no app mobile.
- [x] Implementar envio de pontos GPS da OS usando `routeShiftId`.
- [x] Criar exemplos HTTP em `docs/http/08-orders.http`.
- [x] Criar checklists `docs/ORDERS_WEB_CHECKLIST.md` e `docs/ORDERS_MOBILE_CHECKLIST.md`.
- [x] Criar checklists `docs/OS_WEB_CHECKLIST.md` e `docs/OS_MOBILE_CHECKLIST.md`.
- [ ] Criar testes automatizados de permissao para OS.
- [ ] Criar upload offline/retry para fotos do odometro no app mobile.

## 10. Painel Web

- [x] Criar app Next.js real em `apps/web`.
- [x] Criar tela de login.
- [x] Validar login visual do `MASTER_ADMIN`.
- [x] Validar login visual do `COMPANY_ADMIN`.
- [x] Validar bloqueio visual de `EMPLOYEE` no painel web.
- [x] Criar layout autenticado.
- [x] Validar logout limpando sessao e retornando para `/login`.
- [x] Corrigir protecao de rotas para evitar loading infinito.
- [x] Validar rotas App Router do painel web.
- [x] Criar painel Master.
- [x] Validar redirecionamento do `MASTER_ADMIN` para `/master/dashboard`.
- [x] Criar listagem Master de empresas reais da API.
- [x] Criar formulario Master de nova empresa com primeiro `COMPANY_ADMIN`.
- [x] Criar detalhe Master de empresa em `/master/empresas/[id]`.
- [x] Criar edicao Master de dados basicos da empresa.
- [x] Criar acoes Master para bloquear e ativar empresa.
- [x] Mostrar usuarios vinculados no detalhe da empresa quando retornados pela API.
- [x] Criar dashboard da empresa.
- [x] Validar dashboard da empresa.
- [~] Criar CRUD de empresas.
- [~] Criar CRUD de usuarios.
- [x] Validar listagem de funcionarios.
- [x] Validar criacao de funcionario.
- [x] Validar `/empresa/funcionarios/novo`.
- [x] Validar logout no painel web.
- [x] Confirmar consumo de dados reais da API para funcionarios.
- [x] Criar tela de edicao de funcionario.
- [x] Criar acoes de ativar/desativar funcionario no painel web.
- [x] Adicionar item de veiculos na sidebar da empresa.
- [x] Criar listagem de veiculos da empresa.
- [x] Criar formulario de novo veiculo.
- [x] Criar tela de edicao de veiculo.
- [x] Criar acoes de status de veiculo no painel web.
- [x] Adicionar item de rotas na sidebar da empresa.
- [x] Criar tela de rotas com dados reais da API.
- [x] Criar filtro simples de rotas por status.
- [x] Criar detalhe de rota com cards de resumo.
- [x] Exibir funcionario e veiculo no detalhe de rota.
- [x] Exibir timeline/lista de pontos no detalhe de rota.
- [x] Criar placeholder de mapa no detalhe de rota.
- [x] Substituir placeholder por mapa interativo em Leaflet.
- [x] Adicionar item de manutencao na sidebar da empresa.
- [x] Criar tela de manutencao preventiva.
- [x] Listar alertas de manutencao no painel web.
- [x] Criar regras de manutencao pelo painel web.
- [x] Registrar manutencao realizada pelo painel web.
- [x] Adicionar filtros de manutencao por veiculo, funcionario, tipo, status e periodo.
- [x] Mostrar historico de manutencao por veiculo.
- [x] Adicionar item de combustivel na sidebar da empresa.
- [x] Criar tela de configuracao de combustivel.
- [x] Adicionar filtros de combustivel por funcionario, veiculo e periodo.
- [x] Adicionar grafico simples de consumo por veiculo.
- [x] Criar tela de reembolsos.
- [x] Registrar pagamento de reembolso pelo painel web.
- [x] Filtrar reembolsos por funcionario, veiculo, periodo e status.
- [x] Mostrar totais por periodo.
- [x] Mostrar ranking por funcionario.
- [x] Mostrar custo estimado por veiculo.
- [x] Validar build do frontend web.
- [x] Melhorar visual comercial do login.
- [x] Melhorar sidebar e topbar do painel web.
- [x] Aplicar tema claro/escuro persistente no painel web.
- [x] Adicionar cards com icones nos dashboards.
- [x] Criar mapa operacional no dashboard da empresa com rota selecionavel.
- [x] Adicionar busca e filtros nas tabelas principais.
- [x] Adicionar empty states e loading states nas paginas principais.
- [x] Criar tela de rotas.
- [x] Criar detalhe de rota com mapa.
- [x] Integrar OpenStreetMap/Leaflet nas telas de rotas da empresa.
- [x] Criar mapa ao vivo em `/empresa/rotas` para rotas em andamento.
- [x] Criar polling de rota ao vivo a cada 5 segundos.
- [x] Criar filtros de historico por funcionario, veiculo e periodo.
- [x] Exibir ponto inicial, ponto atual/final e polyline do trajeto.
- [x] Exibir marcadores de clientes/paradas planejadas no mapa de OS.
- [~] Validar responsividade.

## 11. App Mobile

- [x] Criar app Expo real em `apps/mobile`.
- [x] Criar `LoginScreen`.
- [ ] Criar `AcceptTermsScreen`.
- [x] Criar `HomeScreen`.
- [x] Criar `StartShiftScreen`.
- [x] Criar `ActiveRouteScreen`.
- [x] Criar `FinishShiftScreen`.
- [x] Criar `RouteSummaryScreen`.
- [x] Criar `RouteHistoryScreen`.
- [ ] Criar `ProfileScreen`.
- [x] Login mobile usando `POST /auth/login`.
- [x] Bloquear `MASTER_ADMIN` e `COMPANY_ADMIN` no app mobile.
- [x] Persistir sessao localmente.
- [x] Persistir rota ativa localmente.
- [x] Consumir `GET /routes/my-history`.
- [x] Auditar imports mobile e remover risco de import direto de `react-native-web/dist/exports`.
- [x] Instalar dependencias web do Expo: `react-native-web`, `react-dom` e `react-native-svg`.
- [x] Instalar `react-native-maps` compativel com Expo para mapas nativos.
- [x] Alinhar dependencias centrais com Expo SDK 55 usando `expo install`.
- [x] Validar `pnpm --filter @localtrak/mobile typecheck`.
- [x] Validar Expo web em `http://localhost:8081` com cache limpo.
- [x] Validar bundle web com `expo export --platform web`.
- [x] Documentar comandos de cache limpo, navegador e Expo Go.
- [x] Instalar `expo-task-manager` para rastreamento em segundo plano.
- [x] Corrigir botao de finalizar turno com confirmacao web/nativa.
- [x] Tornar finalizacao resiliente a falha ou demora do ultimo GPS.
- [x] Finalizar rota mesmo se o envio do ultimo ponto falhar, usando melhor esforco.
- [x] Recuperar rota ativa do servidor ao abrir o app ou ao receber conflito de rota em andamento.
- [x] Bloquear finalizacao de rota de OS pelo botao de turno livre, exigindo finalizacao pela aba OS com foto do odometro.
- [x] Aplicar identidade visual atualizada e toggle claro/escuro no app mobile.
- [x] Exibir mapa da OS no app mobile com paradas e posicao atual.
- [x] Criar fallback web para OpenStreetMap quando `react-native-maps` nao estiver disponivel.

## 12. Background Tracking

- [x] Solicitar permissao de localizacao foreground.
- [x] Solicitar permissao de localizacao background.
- [x] Iniciar tracking somente apos "Iniciar turno".
- [x] Parar tracking ao "Finalizar turno".
- [x] Exibir status claro de rastreamento.
- [ ] Armazenar pontos offline.
- [~] Sincronizar pontos em lote simples durante app aberto e background.
- [ ] Tratar falha de rede.
- [ ] Evitar perda de rota sem internet.

## 13. Mapas

- [x] Integrar OpenStreetMap/Leaflet no painel web.
- [x] Exibir funcionarios ativos no mapa.
- [x] Exibir percurso do dia.
- [x] Exibir detalhe de rota com polyline.
- [x] Exibir mapa operacional no dashboard da empresa.
- [x] Exibir roteiro planejado e trajeto real no detalhe de OS.
- [x] Exibir mapa nativo de OS no app mobile e fallback web para OpenStreetMap.
- [x] Criar `docs/MAPS_WEB_CHECKLIST.md` e `docs/MAPS_MOBILE_CHECKLIST.md`.
- [ ] Avaliar Mapbox ou Google Maps futuramente.
- [ ] Avaliar PostGIS para consultas geoespaciais.

## 14. Deploy

- [ ] Criar Dockerfile da API.
- [x] Auditar scripts da raiz do monorepo.
- [x] Auditar scripts de `apps/api`.
- [x] Auditar scripts de `apps/web`.
- [x] Criar script `start:api`.
- [x] Criar script `prisma:migrate:deploy`.
- [~] Criar setup de ambiente de staging.
- [~] Configurar banco gerenciado.
- [x] Preparar integracao do backend com Supabase PostgreSQL.
- [x] Confirmar datasource Prisma com `provider = "postgresql"` e `DATABASE_URL`.
- [x] Documentar `sslmode=require` para Supabase.
- [x] Configurar variaveis de producao em `.env.example`.
- [x] Aceitar `SUPABASE_SECRET_KEY` como alternativa a `SUPABASE_SERVICE_ROLE_KEY` para novas chaves `sb_secret_*`.
- [x] Criar `apps/api/.env.example`.
- [x] Criar `apps/api/.env.local` para desenvolvimento local.
- [x] Criar `apps/api/.env.production` com placeholders de producao.
- [x] Alinhar `apps/api/.env` ignorado para Prisma CLI usar Supabase quando a senha real for preenchida.
- [x] Criar `apps/web/.env.example`.
- [x] Criar `apps/web/.env.production` para apontar a web para a API hospedada.
- [x] Padronizar scripts `dev`, `build`, `start:prod`, `prisma:migrate:deploy` e `prisma:seed` da API.
- [x] Configurar `prisma db seed` para criar `MASTER_ADMIN` sem sobrescrever usuario existente.
- [x] Garantir leitura de `PORT` pela API.
- [x] Configurar CORS por `CORS_ORIGINS`.
- [x] Garantir `NEXT_PUBLIC_API_URL` no frontend.
- [x] Garantir fallback `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`/`NEXT_PUBLIC_SUPABASE_KEY` no frontend.
- [x] Adicionar fallback `NEXT_PUBLIC_SUPABASE_ANON_KEY` para compatibilidade com configuracao comum da Vercel.
- [x] Criar `apps/web/vercel.json` para build do Next.js quando Root Directory for `apps/web`.
- [x] Criar script `build:mobile` para export web do Expo.
- [x] Criar `apps/mobile/.env.example` somente com variaveis publicas.
- [x] Criar endpoint publico `GET /health`.
- [x] Aplicar schema inicial no projeto Supabase `LocalTrak`.
- [x] Criar seed remoto do `MASTER_ADMIN` no Supabase.
- [x] Habilitar RLS nas tabelas publicas do Supabase.
- [x] Rodar advisors de seguranca e performance do Supabase.
- [x] Criar `docs/DEPLOYMENT.md`.
- [x] Criar `docs/SECURITY_CHECKLIST.md`.
- [x] Criar `docs/SECURITY_DEPLOY_CHECKLIST.md`.
- [x] Criar `docs/PRODUCTION_DEPLOY_CHECKLIST.md` com roteiro passo a passo para backend, web, mobile, Supabase e testes finais.
- [x] Criar `docs/VERCEL_GITHUB_DEPLOY.md` com roteiro especifico GitHub + Vercel.
- [x] Criar `docs/DEPLOYMENT_STATUS.md` com URLs, validacoes executadas e pendencias finais.
- [x] Atualizar `docs/WEB_TEST_CHECKLIST.md` para testes online com Supabase.
- [x] Criar `docs/MOBILE_TEST_CHECKLIST.md` para testes manuais no app.
- [x] Validar `pnpm prisma:generate` apos ajustes de Supabase.
- [x] Validar `pnpm prisma:migrate:deploy` contra Supabase.
- [x] Validar `pnpm prisma:seed` contra Supabase.
- [x] Validar `pnpm build:api` apos ajustes de Supabase.
- [x] Validar `pnpm build:web` apos ajustes de Supabase.
- [x] Validar `pnpm --filter @localtrak/mobile typecheck`.
- [x] Validar upload de odometro contra Supabase Storage privado com MIME valido e invalido.
- [x] Endurecer nomes de fotos de odometro com empresa, OS, usuario, timestamp e UUID.
- [x] Desativar overwrite de foto de odometro usando `upsert: false`.
- [x] Validar bloqueio de role guard para `COMPANY_ADMIN` em `/master/companies`.
- [x] Validar bloqueio de role guard para `EMPLOYEE` em `/company/employees`.
- [x] Validar `pnpm dev:api` com `GET /health` conectado ao Supabase.
- [x] Validar login API de `MASTER_ADMIN`, `COMPANY_ADMIN` e `EMPLOYEE`.
- [x] Validar `POST /auth/refresh` e `POST /auth/logout` em localhost para os 3 perfis.
- [x] Confirmar usuarios de teste no Supabase via tabela `users`.
- [x] Criar `docs/LOGIN_AUTH_CHECKLIST.md` com diagnostico de login local e producao.
- [~] Validar login no deploy Vercel. Web/mobile carregam, mas a API publica configurada retorna 404 em `/health` e `/auth/login`.
- [x] Adicionar `render.yaml` para publicar `localtrak-api` no Render com build/start corretos do monorepo.
- [x] Endurecer CORS da API para sempre incluir dominios Vercel de web e mobile.
- [x] Validar fluxo HTTP de rota do `EMPLOYEE` contra Supabase.
- [x] Validar `pnpm dev:web` e rotas HTML principais em localhost.
- [x] Preencher `DATABASE_URL` com senha real do banco Supabase para teste da API local.
- [ ] Configurar dominio real do frontend em `CORS_ORIGINS`.
- [ ] Configurar URL real da API em `NEXT_PUBLIC_API_URL`.
- [ ] Fazer deploy efetivo da API em Render/Railway.
- [x] Fazer deploy efetivo da web em Vercel.
- [ ] Configurar logs.
- [ ] Configurar Sentry.
- [x] Avaliar Railway/Render para API.
- [x] Avaliar Supabase/Neon.
- [x] Avaliar Vercel para web.
- [x] Avaliar Expo EAS para mobile.

## 15. SaaS Comercial

- [ ] Criar gestao completa de planos.
- [ ] Criar limites por plano.
- [ ] Criar controle de inadimplencia.
- [ ] Criar bloqueio de empresa.
- [ ] Criar relatorios PDF/Excel.
- [ ] Criar dashboard de uso da plataforma.
- [ ] Criar auditoria completa.
- [ ] Criar termos de uso.
- [ ] Criar politica de privacidade.
- [ ] Criar fluxo LGPD de consentimento.
- [ ] Criar estrategia de backup.
- [ ] Criar estrategia de suporte e observabilidade.

## Bloqueios Conhecidos

- [ ] Nao ha script `test` configurado ainda no backend.
- [ ] Login em Vercel esta bloqueado porque `https://localtrak-api.onrender.com` retorna 404 para `/health` e `/auth/login`.
