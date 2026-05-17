# LocalTrak Rotas

LocalTrak Rotas e um SaaS multiempresa para controle de rotas, jornada, funcionarios externos, frota, quilometragem rodada, combustivel, manutencao preventiva e reembolso.

O produto atende empresas com tecnicos de campo, instaladores, entregadores, equipes de manutencao, provedores de internet, frotas proprias e funcionarios que utilizam veiculo particular. Cada funcionario inicia e finaliza o turno pelo app mobile; somente durante esse periodo a localizacao deve ser registrada.

## Perfis De Acesso

- `MASTER_ADMIN`: dono da plataforma. Visualiza e gerencia todas as empresas, usuarios, planos, rotas, relatorios e configuracoes globais.
- `COMPANY_ADMIN`: dono da empresa/frota. Visualiza e gerencia apenas os dados da propria empresa.
- `EMPLOYEE`: funcionario, tecnico ou motorista. Usa o app mobile para iniciar/finalizar turno, enviar pontos de rota e consultar o proprio historico.

## Stack

- Monorepo: pnpm workspaces
- Backend: NestJS
- Banco: PostgreSQL
- ORM: Prisma
- Autenticacao: JWT + Refresh Token
- Permissoes: RBAC por role
- Web Admin: Next.js
- Mobile: React Native com Expo
- Mapas: OpenStreetMap/Leaflet inicialmente
- Futuro: PostGIS, Sentry, Supabase/Neon, Vercel, Railway/Render, Expo EAS

## Estrutura De Pastas

```text
localtrak-rotas/
  apps/
    api/        Backend NestJS
    web/        Painel Web Next.js
    mobile/     App React Native com Expo
  packages/
    shared/     Tipos, enums e contratos compartilhados
    config/     Configuracoes compartilhadas
  docker-compose.yml
  README.md
  AGENTS.md
  TASKS.md
  DECISIONS.md
```

## Instalacao

Requisitos locais:

- Node.js LTS
- pnpm
- Docker Desktop
- PostgreSQL via Docker Compose

Instale o pnpm se necessario:

```bash
npm install -g pnpm
```

Instale as dependencias:

```bash
pnpm install
```

## Configuracao Do .env

Crie o arquivo `.env` na raiz a partir do exemplo:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Variaveis principais:

```env
DATABASE_URL="postgresql://localtrak:localtrak@localhost:5432/localtrak_rotas?schema=public"
JWT_ACCESS_SECRET="change-me-access-secret"
JWT_REFRESH_SECRET="change-me-refresh-secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3333
CORS_ORIGINS="http://localhost:3000,http://localhost:8081"
CORS_ORIGIN="http://localhost:3000"
MASTER_ADMIN_NAME="Admin Master"
MASTER_ADMIN_EMAIL="admin@localtrak.test"
MASTER_ADMIN_PASSWORD="ChangeMe123!"
SUPABASE_URL="https://REPLACE_WITH_PROJECT_REF.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="REPLACE_WITH_SERVER_ONLY_SERVICE_ROLE_KEY"
SUPABASE_SECRET_KEY=""
SUPABASE_STORAGE_BUCKET="order-odometer"
```

Antes de producao, troque todos os secrets e senhas. `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SECRET_KEY` sao variaveis exclusivas do backend; nunca configure essas chaves no painel web ou no app mobile.

Para o frontend web, configure `apps/web/.env.local` ou as variaveis do provedor:

```env
NEXT_PUBLIC_API_URL=http://localhost:3333
```

## PostgreSQL Com Docker

Suba o banco:

```bash
docker compose up -d
```

O servico sobe PostgreSQL com imagem PostGIS:

- Host: `localhost`
- Porta: `5432`
- Database: `localtrak_rotas`
- Usuario: `localtrak`
- Senha: `localtrak`

## Prisma

Gerar Prisma Client:

```bash
pnpm prisma:generate
```

Criar e aplicar migrations em desenvolvimento:

```bash
pnpm prisma:migrate
```

Rodar seed:

```bash
pnpm prisma:seed
```

Resetar dados operacionais apenas da empresa de teste antes do seed:

```powershell
$env:RESET_TEST_DATA="true"
pnpm prisma:seed
Remove-Item Env:\RESET_TEST_DATA
```

Esse reset remove rotas, pontos, veiculos, manutencoes e combustivel apenas da empresa `Empresa Teste` (`document=00000000000100`) e mantem/cria os usuarios de teste.

## Iniciar Aplicacoes

Antes de iniciar os apps, suba o banco e rode Prisma:

```bash
docker compose up -d
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

API em desenvolvimento:

```bash
pnpm dev:api
```

API compilada, como em producao:

```bash
pnpm build:api
pnpm start:api
```

API local:

```text
http://localhost:3333
```

Health check:

```text
GET http://localhost:3333/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "database": "connected"
}
```

Frontend web em desenvolvimento:

```bash
pnpm dev:web
```

Build do frontend:

```bash
pnpm build:web
```

Web local:

```text
http://localhost:3000
```

Mobile em desenvolvimento:

```bash
pnpm dev:mobile
```

Mobile no navegador com Expo web:

```bash
pnpm --filter @localtrak/mobile exec expo start --web --clear --port 8081
```

Abra:

```text
http://localhost:8081
```

O app mobile usa Expo. Para testar em um celular fisico com Expo Go, configure a API com o IP local da maquina antes de iniciar:

```powershell
$env:EXPO_PUBLIC_API_URL="http://192.168.0.10:3333"
pnpm --filter @localtrak/mobile exec expo start --clear
```

Troque `192.168.0.10` pelo IP do computador que esta rodando a API. Em emulador Android, normalmente use `http://10.0.2.2:3333`.

Dependencias mobile/web alinhadas com Expo SDK 55:

- `react-native-web`
- `react-dom`
- `react-native-svg`
- `react-native-maps`
- `react-native`
- `react`
- `expo-status-bar`
- `expo-image-picker`
- `@react-native-async-storage/async-storage`

## Credenciais Iniciais

O seed cria um usuario `MASTER_ADMIN`:

- E-mail: `admin@localtrak.test`
- Senha: `ChangeMe123!`

Credenciais de teste para `COMPANY_ADMIN` e `EMPLOYEE` sao criadas durante o fluxo manual. Use a senha definida no formulario, por exemplo `Senha123!`.

O seed tambem garante estes usuarios de teste quando eles nao existirem ou estiverem inativos:

- `COMPANY_ADMIN`: `admin@empresateste.com` / `Senha123!`
- `EMPLOYEE`: `funcionario@empresateste.com` / `Senha123!`

## Endpoints Principais Ja Criados

Autenticacao:

- `GET /health`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

Admin Master:

- `GET /master/companies`
- `POST /master/companies` cria empresa e, opcionalmente, o primeiro `COMPANY_ADMIN` via `adminUser`
- `GET /master/companies/:id`
- `PATCH /master/companies/:id`
- `PATCH /master/companies/:id/block`
- `PATCH /master/companies/:id/activate`
- `GET /master/users`
- `POST /master/users`
- `PATCH /master/users/:id`

Empresa:

- `GET /company/employees`
- `POST /company/employees`
- `PATCH /company/employees/:id`
- `PATCH /company/employees/:id/status`
- `GET /company/vehicles`
- `POST /company/vehicles`
- `GET /company/vehicles/:id`
- `PATCH /company/vehicles/:id`
- `PATCH /company/vehicles/:id/status`
- `GET /company/routes` aceita filtros `status`, `employeeId`, `vehicleId`, `startDate` e `endDate`
- `GET /company/routes/:id`
- `GET /company/maintenance/rules`
- `POST /company/maintenance/rules`
- `PATCH /company/maintenance/rules/:id`
- `GET /company/maintenance/alerts`
- `GET /company/maintenance/records` aceita filtros `vehicleId`, `employeeId`, `type`, `status`, `startDate` e `endDate`
- `POST /company/maintenance/records`
- `GET /company/vehicles/:vehicleId/maintenance`
- `GET /company/fuel/settings`
- `POST /company/fuel/settings`
- `PATCH /company/fuel/settings/:id`
- `GET /company/reimbursements` aceita filtros `employeeId`, `vehicleId`, `startDate` e `endDate`
- `GET /company/reimbursements/employee/:employeeId`
- `GET /company/reimbursements/payments`
- `POST /company/reimbursements/payments`

Ordens de servico:

- `POST /orders` cria OS da empresa com funcionario, veiculo e enderecos.
- `GET /orders` lista OS da empresa; aceita filtros `employeeId`, `vehicleId`, `status`, `startDate` e `endDate`.
- `GET /orders/my-today` lista OS do dia para o funcionario autenticado.
- `GET /orders/:id` retorna detalhe da OS com paradas e URLs assinadas de fotos do odometro quando existirem.
- `GET /orders/:id/route` retorna o roteiro planejado da OS. Foi usado esse caminho para nao conflitar com `/routes/:id`, que ja representa rota GPS.
- `GET /orders/:id/tracking` retorna rota GPS vinculada, pontos, ponto atual, distancia parcial e duracao parcial.
- `GET /orders/:id/odometer-photo` retorna KM e URLs assinadas das fotos inicial/final do odometro.
- `PATCH /orders/:id` atualiza dados basicos, status e atribuicoes da OS.
- `POST /orders/:id/upload-odometer` envia foto obrigatoria do odometro antes do inicio ou finalizacao.
- `PATCH /orders/:id/start` inicia OS pelo funcionario somente se ja houver foto inicial enviada; tambem cria a `RouteShift` vinculada para tracking.
- `PATCH /orders/:id/finish` finaliza OS somente se ja houver foto final enviada; finaliza a `RouteShift` e atualiza KM do veiculo quando vinculado.
- `PATCH /orders/:id/stops/:stopId/complete` marca uma parada como concluida.
- `DELETE /orders/:id` remove OS da empresa.

Rotas:

- `POST /routes/start` aceita `vehicleId` opcional; se omitido, usa automaticamente veiculo vinculado ao funcionario quando existir
- `POST /routes/:id/points`
- `POST /routes/:id/finish` calcula km, duracao e soma o km ao veiculo vinculado quando houver
- `GET /routes/my-history`
- `GET /routes/active` recupera a rota `IN_PROGRESS` do funcionario para restaurar o estado do app mobile
- `GET /routes/:id`
- `GET /routes/:id/summary` retorna resumo com funcionario, veiculo, status, km, duracao e pontos quando aplicavel
- `GET /routes/:id/live` retorna pontos, ponto inicial, ponto atual, km parcial, duracao parcial e status operacional calculado
- `GET /routes/:id/history` retorna o historico completo da rota usando o mesmo contrato protegido do resumo/detalhe

## Painel Web MVP

O painel web em `apps/web` usa a API real local:

```env
NEXT_PUBLIC_API_URL=http://localhost:3333
```

Checkpoint visual confirmado:

- Login `COMPANY_ADMIN` funcionando.
- `/empresa/dashboard` funcionando.
- `/empresa/funcionarios` funcionando com dados reais da API.
- `/empresa/funcionarios/novo` funcionando.
- Criacao de funcionario funcionando.
- Logout funcionando.
- `EMPLOYEE` bloqueado no painel web e direcionado ao app mobile.

Rotas implementadas:

- `/login`
- `/master/dashboard`
- `/master/empresas`
- `/master/empresas/nova`
- `/master/empresas/[id]`
- `/empresa/dashboard`
- `/empresa/funcionarios`
- `/empresa/funcionarios/novo`
- `/empresa/funcionarios/[id]`
- `/empresa/veiculos`
- `/empresa/veiculos/novo`
- `/empresa/veiculos/[id]`
- `/empresa/rotas`
- `/empresa/rotas/[id]`
- `/empresa/manutencao`
- `/empresa/combustivel`
- `/empresa/reembolsos`
- `/empresa/ordens`
- `/empresa/ordens/[id]`

Modulo de rotas no painel da empresa:

- `/empresa/rotas` mostra cards de operacao, mapa ao vivo, rotas em andamento e tabela historica.
- O mapa usa OpenStreetMap/Leaflet e atualiza a rota selecionada a cada 5 segundos.
- O historico permite filtrar por status, funcionario, veiculo, data inicial e data final.
- `/empresa/rotas/[id]` mostra mapa completo, pontos GPS, funcionario, veiculo, periodo, km, duracao e ultimo ponto.
- Rotas sem novos pontos por alguns minutos aparecem como `Pausado` no acompanhamento operacional.
- `/empresa/dashboard` tambem possui um mapa operacional com a rota selecionada, ponto inicial, ponto atual/final e trajeto.

Modulo de ordens de servico no painel da empresa:

- `/empresa/ordens` cria e lista OS reais da API com filtros por funcionario, veiculo, status e periodo.
- `/empresa/ordens/[id]` mostra edicao de OS, roteiro planejado, trajeto GPS real quando existir, paradas, KM inicial/final e fotos do odometro.
- O mapa da OS exibe marcadores de clientes/paradas planejadas e diferencia paradas pendentes/concluidas.
- O backend usa Supabase Storage privado para fotos no bucket `order-odometer`.
- A migration `20260516171000_create_order_odometer_storage_bucket` cria o bucket automaticamente em ambientes Supabase; em PostgreSQL local sem schema `storage`, ela nao altera nada.
- Para testar inicio/finalizacao de OS com foto, configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_STORAGE_BUCKET` no ambiente da API.
- Projetos Supabase com novas chaves `sb_secret_*` podem usar `SUPABASE_SECRET_KEY` no lugar de `SUPABASE_SERVICE_ROLE_KEY`.

## App Mobile MVP

O app Expo em `apps/mobile` ja possui o fluxo inicial do funcionario:

- Login real em `POST /auth/login`.
- Bloqueio de acesso para `MASTER_ADMIN` e `COMPANY_ADMIN` com a mensagem "Este acesso e exclusivo para funcionarios.".
- Sessao persistida localmente.
- Tela inicial com funcionario, empresa, status atual, iniciar turno e historico.
- Inicio de turno com permissao de localizacao foreground, ponto inicial e `POST /routes/start`.
- Recuperacao automatica de rota ativa via `GET /routes/active`, evitando que o app fique preso quando o servidor ainda tem uma rota `IN_PROGRESS`.
- Captura de pontos com o app aberto usando `expo-location`.
- Rastreamento em segundo plano com `expo-task-manager` e `expo-location` enquanto houver turno ativo.
- Envio de pontos para `POST /routes/:id/points`.
- Finalizacao com ponto final e `POST /routes/:id/finish`.
- Botao `Finalizar turno` com confirmacao nativa no Expo Go e `confirm` no navegador.
- Finalizacao resiliente: se o ultimo GPS demorar ou falhar, o app usa a ultima localizacao conhecida e finaliza a rota.
- Resumo da ultima rota finalizada.
- Historico usando `GET /routes/my-history`.
- Aba `OS` consumindo `GET /orders/my-today`.
- Inicio de jornada da OS com KM inicial, foto obrigatoria via `expo-image-picker`, upload em `POST /orders/:id/upload-odometer` e inicio em `PATCH /orders/:id/start`.
- Conclusao de paradas da OS com `PATCH /orders/:id/stops/:stopId/complete`.
- Finalizacao de jornada da OS com KM final, foto obrigatoria via `POST /orders/:id/upload-odometer` e finalizacao em `PATCH /orders/:id/finish`.
- Ao iniciar OS, o app recebe `routeShiftId` e envia pontos para `POST /routes/:id/points`, permitindo visualizacao em tempo real no web.
- A aba `OS` exibe um mapa nativo com `react-native-maps` no Expo Go, incluindo paradas, trajeto planejado e posicao atual quando disponivel.
- No navegador, o app usa um fallback leve com link para OpenStreetMap, mantendo o bundle web estavel.

Comandos:

```bash
pnpm install
pnpm dev:mobile
pnpm typecheck:mobile
```

Para limpar cache do bundler e testar no navegador:

```bash
pnpm --filter @localtrak/mobile exec expo start --web --clear --port 8081
```

Para validar o bundle web sem manter servidor aberto:

```bash
pnpm --filter @localtrak/mobile exec expo export --platform web
```

No Expo Go, API local nao deve usar `localhost`, porque `localhost` aponta para o proprio celular. Use `EXPO_PUBLIC_API_URL` com o IP da maquina na mesma rede.

Para background tracking em dispositivo real:

- O app solicita permissao de localizacao foreground ao iniciar turno.
- Em aparelhos nativos, tambem solicita permissao background.
- O rastreamento em segundo plano para ao finalizar o turno ou ao fazer logout.
- No iOS, valide com o app em dispositivo real; para builds finais, usar Expo EAS/development build e conferir permissoes de localizacao nas configuracoes do aparelho.

Checklists especificos:

- `docs/ROUTES_WEB_CHECKLIST.md`
- `docs/ROUTES_MOBILE_CHECKLIST.md`
- `docs/MAPS_WEB_CHECKLIST.md`
- `docs/MAPS_MOBILE_CHECKLIST.md`

Teste rapido do botao de finalizar rota:

1. Entrar no app mobile como `funcionario@empresateste.com`.
2. Tocar em `Iniciar turno` e permitir localizacao.
3. Aguardar pelo menos um ponto enviado.
4. Tocar em `Finalizar turno`.
5. Confirmar a acao.
6. Verificar o resumo no app e a rota em `/empresa/rotas` com status `Finalizada`.

URLs principais:

- Login: `http://localhost:3000/login`
- Dashboard Master: `http://localhost:3000/master/dashboard`
- Empresas Master: `http://localhost:3000/master/empresas`
- Nova empresa: `http://localhost:3000/master/empresas/nova`
- Detalhe/edicao de empresa: `http://localhost:3000/master/empresas/<companyId>`
- Dashboard Empresa: `http://localhost:3000/empresa/dashboard`
- Funcionarios: `http://localhost:3000/empresa/funcionarios`
- Novo funcionario: `http://localhost:3000/empresa/funcionarios/novo`
- Editar funcionario: `http://localhost:3000/empresa/funcionarios/<employeeId>`
- Veiculos: `http://localhost:3000/empresa/veiculos`
- Novo veiculo: `http://localhost:3000/empresa/veiculos/novo`
- Editar veiculo: `http://localhost:3000/empresa/veiculos/<vehicleId>`
- Rotas: `http://localhost:3000/empresa/rotas`
- Detalhe de rota: `http://localhost:3000/empresa/rotas/<routeId>`
- Manutencao: `http://localhost:3000/empresa/manutencao`
- Combustivel: `http://localhost:3000/empresa/combustivel`
- Reembolsos: `http://localhost:3000/empresa/reembolsos`
- Ordens de Servico: `http://localhost:3000/empresa/ordens`
- Detalhe de OS: `http://localhost:3000/empresa/ordens/<orderId>`

O painel usa Next.js App Router em `apps/web/src/app`.

Identidade visual atual:

- Login com composicao comercial da marca LocalTrak Rotas.
- Sidebar escura com icones, identidade do produto e status de ambiente seguro.
- Topbar com contexto operacional e menu de usuario.
- Dashboards com cards metricos, icones e variacoes de status.
- Tabelas com busca, filtros, estados de carregamento e estados vazios.
- Badges de status padronizadas.
- Layout responsivo para desktop, tablet e mobile.

Preview do login:

![Login comercial do painel web](docs/screenshots/web-login-commercial.png)

Fluxos implementados:

- Login em `POST /auth/login`.
- Redirecionamento por role.
- Recuperacao de sessao via `localStorage` apos refresh da pagina.
- Protecao de rotas por role com fallback visivel quando a sessao nao pode ser validada.
- Logout limpa a sessao local e volta para `/login`.
- `MASTER_ADMIN` lista e cria empresas.
- Criacao de empresa pode incluir o primeiro `COMPANY_ADMIN`.
- `MASTER_ADMIN` edita dados basicos da empresa em `/master/empresas/[id]`.
- `MASTER_ADMIN` bloqueia e ativa empresas usando acoes da lista ou do detalhe.
- O detalhe da empresa mostra usuarios vinculados quando retornados por `GET /master/companies/:id`.
- `COMPANY_ADMIN` lista e cria funcionarios.
- `COMPANY_ADMIN` edita nome, telefone e status de funcionarios da propria empresa.
- `COMPANY_ADMIN` ativa/desativa funcionarios em `/empresa/funcionarios` e `/empresa/funcionarios/[id]`.
- `COMPANY_ADMIN` lista veiculos reais da propria empresa em `/empresa/veiculos`.
- `COMPANY_ADMIN` cria veiculos em `/empresa/veiculos/novo`, podendo vincular funcionario carregado de `GET /company/employees`.
- `COMPANY_ADMIN` edita veiculos em `/empresa/veiculos/[id]` e altera status para ativo, manutencao ou inativo.
- `COMPANY_ADMIN` lista rotas reais da propria empresa em `/empresa/rotas`, com filtro simples por status.
- `COMPANY_ADMIN` visualiza detalhe de rota em `/empresa/rotas/[id]`, com cards de resumo, funcionario, veiculo, periodo, mapa interativo e timeline de pontos.
- `COMPANY_ADMIN` gerencia manutencao preventiva em `/empresa/manutencao`, criando regras por km/dias, registrando manutencoes e consultando alertas e historico por veiculo.
- `/empresa/manutencao` tambem lista manutencoes registradas com filtros por veiculo, funcionario, periodo, tipo e status.
- Regras de manutencao podem vencer por km, por dias ou pelos dois criterios ao mesmo tempo.
- `COMPANY_ADMIN` configura combustivel em `/empresa/combustivel`, com valor por litro e/ou valor padrao por km, filtros por funcionario/veiculo e grafico simples de consumo.
- `COMPANY_ADMIN` consulta e registra reembolsos em `/empresa/reembolsos`, com funcionario, veiculo, km, custo de combustivel, valor, status, totais por periodo, ranking por funcionario e rotas consideradas.
- `COMPANY_ADMIN` cria, filtra e edita ordens de servico em `/empresa/ordens`, com atribuicao de funcionario/veiculo e enderecos de atendimento.
- `COMPANY_ADMIN` ve o detalhe da OS em `/empresa/ordens/[id]`, incluindo mapa do roteiro planejado, paradas, status, fotos do odometro e KM calculado.
- `EMPLOYEE` recebe aviso para acessar pelo aplicativo mobile.

Comandos:

```bash
pnpm dev:web
pnpm build:web
```

## Credenciais de Teste

Para facilitar os testes locais e remotos, o banco de dados é populado (`pnpm prisma:seed`) com as seguintes credenciais padronizadas:

| Perfil | Email | Senha |
|---|---|---|
| MASTER_ADMIN | `admin@localtrak.test` | `ChangeMe123!` |
| COMPANY_ADMIN | `admin@empresateste.com` | `Senha123!` |
| EMPLOYEE | `funcionario@empresateste.com` | `Senha123!` |

## Fluxo De Teste Manual

1. Subir PostgreSQL com Docker.
2. Rodar `pnpm install`.
3. Rodar `pnpm prisma:generate`.
4. Rodar `pnpm prisma:migrate`.
5. Rodar `pnpm prisma:seed`.
6. Iniciar API com `pnpm dev:api`.
7. Iniciar o painel web com `pnpm dev:web`.
8. Acessar `http://localhost:3000/login`.
9. Fazer login com o `MASTER_ADMIN`.
10. Confirmar redirecionamento para `/master/dashboard`.
11. Criar uma empresa em `/master/empresas/nova` com `adminUser`.
12. Fazer logout.
13. Fazer login com o `COMPANY_ADMIN` criado.
14. Confirmar redirecionamento para `/empresa/dashboard`.
15. Acessar `/empresa/funcionarios`.
16. Confirmar que a lista consome dados reais da API.
17. Criar funcionario em `/empresa/funcionarios/novo`.
18. Confirmar retorno para `/empresa/funcionarios`.
19. Confirmar que o funcionario criado aparece na lista.
20. Fazer logout.
21. Confirmar que um login `EMPLOYEE` exibe a mensagem de acesso pelo aplicativo mobile.

Fluxo complementar:

22. Acessar `/master/empresas`.
23. Confirmar que a empresa aparece na lista.
24. Usar `Ver/Editar` para acessar `/master/empresas/<companyId>`.
25. Editar dados basicos e salvar.
26. Bloquear e ativar a empresa.
27. Acessar `/empresa/veiculos`.
28. Criar veiculo em `/empresa/veiculos/novo`.
29. Confirmar que o veiculo aparece na lista.
30. Abrir `/empresa/veiculos/<vehicleId>`.
31. Editar dados e alterar status para ativo, manutencao ou inativo.
32. Iniciar o app mobile em um terminal separado com `pnpm dev:mobile` (configure a API com o seu IP local via `EXPO_PUBLIC_API_URL` se testar no aparelho físico).
33. Fazer login no app mobile com as credenciais do funcionário criado (`EMPLOYEE`).
34. Iniciar um turno no app mobile, aprovar as permissões de localização, simular envio de pontos e depois finalizar a rota.
33. Acessar `/empresa/rotas`.
34. Filtrar rotas por status.
35. Abrir `/empresa/rotas/<routeId>` e conferir resumo, funcionario, veiculo, periodo e pontos.
36. Acessar `/empresa/manutencao`.
37. Criar uma regra de manutencao preventiva.
38. Registrar uma manutencao realizada para um veiculo.
39. Conferir o historico do veiculo e os alertas quando a manutencao estiver vencida.
40. Acessar `/empresa/combustivel`.
41. Criar configuracao de combustivel por litro, por km ou ambos.
42. Conferir custo estimado por veiculo no periodo.
43. Acessar `/empresa/reembolsos`.
44. Filtrar reembolsos por periodo e funcionario.
45. Acessar `/empresa/ordens`.
46. Criar uma OS com funcionario, veiculo e enderecos.
47. Abrir `/empresa/ordens/<orderId>` e conferir roteiro, paradas e mapa.
48. No app mobile, abrir a aba `OS`, informar KM inicial, tirar foto do odometro e iniciar a jornada.
49. Concluir uma parada e confirmar atualizacao no painel web.
50. Informar KM final, tirar foto do odometro e finalizar a OS.
51. Conferir no web KM inicial/final, distancia e fotos assinadas do Supabase Storage.
52. Para testar a API de rotas diretamente, fazer login como funcionario, iniciar rota em `POST /routes/start`, enviar pontos em `POST /routes/:id/points`, finalizar em `POST /routes/:id/finish` e consultar `GET /routes/:id/summary`.

Exemplo de criacao de empresa com primeiro `COMPANY_ADMIN`:

```http
POST /master/companies
Authorization: Bearer <MASTER_ADMIN_ACCESS_TOKEN>
Content-Type: application/json

{
  "name": "Fibra Norte Telecom",
  "document": "12345678000190",
  "phone": "11999990000",
  "email": "admin@fibranorte.com",
  "status": "TRIAL",
  "maxEmployees": 20,
  "maxVehicles": 15,
  "adminUser": {
    "name": "Dono da Frota",
    "email": "dono@fibranorte.com",
    "phone": "11988887777",
    "password": "Senha123!"
  }
}
```

Quando `adminUser` e enviado, a API cria a empresa e o `COMPANY_ADMIN` na mesma transacao. A resposta nao retorna hash de senha.

Exemplo de criacao de veiculo com token de `COMPANY_ADMIN`:

```http
POST /company/vehicles
Authorization: Bearer <COMPANY_ADMIN_ACCESS_TOKEN>
Content-Type: application/json

{
  "plate": "ABC1D23",
  "brand": "Fiat",
  "model": "Strada",
  "year": 2022,
  "type": "PICKUP",
  "ownershipType": "COMPANY",
  "currentKm": 49500,
  "fuelType": "FLEX",
  "averageConsumption": 10.5,
  "costPerKm": 1.2,
  "status": "ACTIVE"
}
```

As placas sao unicas por empresa. Quando `employeeId` for enviado, o funcionario precisa pertencer a mesma empresa do `COMPANY_ADMIN` autenticado.

Exemplo de inicio de rota usando veiculo vinculado automaticamente:

```http
POST /routes/start
Authorization: Bearer <EMPLOYEE_ACCESS_TOKEN>
Content-Type: application/json

{
  "latitude": -23.55052,
  "longitude": -46.633308
}
```

Exemplo de inicio de rota informando o veiculo:

```http
POST /routes/start
Authorization: Bearer <EMPLOYEE_ACCESS_TOKEN>
Content-Type: application/json

{
  "vehicleId": "<VEHICLE_ID>",
  "latitude": -23.55052,
  "longitude": -46.633308
}
```

O backend impede duas rotas `IN_PROGRESS` para o mesmo funcionario. O `vehicleId`, quando enviado, precisa pertencer a mesma empresa do funcionario autenticado. Ao finalizar a rota, `totalDistanceKm` e `totalDurationMinutes` sao atualizados e o km do veiculo e incrementado quando a rota possui veiculo vinculado.

Exemplo de regra de manutencao preventiva:

```http
POST /company/maintenance/rules
Authorization: Bearer <COMPANY_ADMIN_ACCESS_TOKEN>
Content-Type: application/json

{
  "name": "Troca de oleo",
  "type": "OIL_CHANGE",
  "intervalKm": 5000,
  "intervalDays": 180,
  "isActive": true
}
```

Exemplo de registro de manutencao:

```http
POST /company/maintenance/records
Authorization: Bearer <COMPANY_ADMIN_ACCESS_TOKEN>
Content-Type: application/json

{
  "vehicleId": "<VEHICLE_ID>",
  "maintenanceRuleId": "<RULE_ID>",
  "type": "OIL_CHANGE",
  "description": "Troca de oleo e filtro",
  "performedAt": "2026-05-15T12:00:00.000Z",
  "performedKm": 50000,
  "cost": 280,
  "status": "DONE"
}
```

Ao registrar uma manutencao com regra vinculada, o backend calcula `nextDueKm` e/ou `nextDueDate`. `GET /company/maintenance/alerts` retorna alertas quando o km atual do veiculo atinge `nextDueKm` ou quando `nextDueDate` vence.

Exemplo de configuracao de combustivel:

```http
POST /company/fuel/settings
Authorization: Bearer <COMPANY_ADMIN_ACCESS_TOKEN>
Content-Type: application/json

{
  "fuelType": "FLEX",
  "pricePerLiter": 5.89,
  "defaultCostPerKm": 1.2
}
```

Veiculos da empresa geram `estimatedFuelCost`. Quando ha `averageConsumption` no veiculo e `pricePerLiter` na configuracao, o calculo usa `km / consumo medio x valor por litro`. Se nao houver consumo medio, usa valor por km do veiculo ou `defaultCostPerKm`.

Veiculos particulares geram `reimbursementValue`. O calculo usa `km x costPerKm` do veiculo ou, quando ausente, `defaultCostPerKm` configurado para o combustivel.

Relatorios:

```http
GET /company/reimbursements?startDate=2026-05-01T00:00:00.000Z&endDate=2026-05-31T23:59:59.000Z
Authorization: Bearer <COMPANY_ADMIN_ACCESS_TOKEN>
```

```http
GET /company/reimbursements?employeeId=<EMPLOYEE_ID>&vehicleId=<VEHICLE_ID>&startDate=2026-05-01T00:00:00.000Z&endDate=2026-05-31T23:59:59.000Z
Authorization: Bearer <COMPANY_ADMIN_ACCESS_TOKEN>
```

```http
GET /company/reimbursements/employee/<employeeId>?startDate=2026-05-01T00:00:00.000Z&endDate=2026-05-31T23:59:59.000Z
Authorization: Bearer <COMPANY_ADMIN_ACCESS_TOKEN>
```

Exemplo de registro de pagamento de reembolso:

```http
POST /company/reimbursements/payments
Authorization: Bearer <COMPANY_ADMIN_ACCESS_TOKEN>
Content-Type: application/json

{
  "employeeId": "<EMPLOYEE_ID>",
  "vehicleId": "<VEHICLE_ID>",
  "distanceKm": 38.4,
  "fuelCost": 22.61,
  "amount": 27.65,
  "paidAt": "2026-05-16T12:00:00.000Z",
  "status": "PAID",
  "description": "Reembolso de rota com veiculo particular"
}
```

Checklists dos modulos:

- [docs/MAINTENANCE_CHECKLIST.md](docs/MAINTENANCE_CHECKLIST.md)
- [docs/FUEL_CHECKLIST.md](docs/FUEL_CHECKLIST.md)
- [docs/REIMBURSEMENT_CHECKLIST.md](docs/REIMBURSEMENT_CHECKLIST.md)

## Regras Obrigatorias

- `COMPANY_ADMIN` nunca pode acessar dados de outra empresa.
- `EMPLOYEE` so pode acessar os proprios dados.
- `MASTER_ADMIN` pode acessar tudo.
- Todas as queries de dados de empresa devem respeitar `company_id`.
- O funcionario so pode ser rastreado apos clicar em "Iniciar turno".
- O rastreamento deve parar ao clicar em "Finalizar turno".
- Nao rastrear funcionario fora do turno.
- Toda acao critica deve gerar `AuditLog`.
- Senhas nunca devem ser salvas em texto puro.
- Usar hash seguro para senha.
- Usar DTOs e validacao.
- Criar testes para regras de permissao.

## Deploy Do Primeiro Prototipo

O guia completo esta em [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). A checklist de seguranca e deploy esta em [docs/SECURITY_DEPLOY_CHECKLIST.md](docs/SECURITY_DEPLOY_CHECKLIST.md), o checklist operacional completo para producao esta em [docs/PRODUCTION_DEPLOY_CHECKLIST.md](docs/PRODUCTION_DEPLOY_CHECKLIST.md), e o roteiro especifico de GitHub + Vercel esta em [docs/VERCEL_GITHUB_DEPLOY.md](docs/VERCEL_GITHUB_DEPLOY.md).

Status atual do deploy: [docs/DEPLOYMENT_STATUS.md](docs/DEPLOYMENT_STATUS.md).
Checkpoint de login e autenticacao: [docs/LOGIN_AUTH_CHECKLIST.md](docs/LOGIN_AUTH_CHECKLIST.md).

URLs publicas atuais:

- Web: `https://localtrak-web.vercel.app`
- Mobile Web/Expo Web: `https://localtrak-mobile.vercel.app`
- API: o frontend publicado esta apontando para `https://localtrak-api.onrender.com`,
  mas este host ainda retorna `404` em `/health` e `/auth/login`. O login local
  esta validado; o login em Vercel depende de publicar uma API NestJS saudavel
  e atualizar `NEXT_PUBLIC_API_URL`/`EXPO_PUBLIC_API_URL`.

Para corrigir o erro de CORS/login no Vercel, o servico `localtrak-api` precisa
ser redeployado no Render usando o `render.yaml` da raiz. O arquivo define o
build/start corretos do monorepo e health check em `/health`. Depois do deploy,
valide:

Configuracao esperada no Render:

```bash
Build Command: pnpm install && pnpm build:api && pnpm build:web
Start Command: pnpm start:api
Health Check Path: /health
```

Variaveis obrigatorias no Render:

```bash
DATABASE_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
MASTER_ADMIN_PASSWORD
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

O `render.yaml` gera `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` automaticamente
quando o servico esta sincronizado por Blueprint. Se o deploy foi criado
manualmente no painel, adicione essas duas variaveis manualmente em Environment.

Se o log do deploy mostrar `Running 'yarn start'`, o Render esta usando o
comando padrao do painel em vez do Start Command correto. Atualize o campo
Start Command para `pnpm start:api` ou recrie/sincronize o servico pelo
`render.yaml` da raiz.

```bash
curl https://localtrak-api.onrender.com/health
```

O retorno esperado e:

```json
{"status":"ok","database":"connected"}
```

O backend esta preparado para usar Supabase PostgreSQL via `DATABASE_URL` com `sslmode=require`, Prisma migrations com `pnpm prisma:migrate:deploy` e seed inicial com `pnpm prisma:seed`. No checkpoint Supabase, o projeto `LocalTrak` recebeu as migrations, seed do `MASTER_ADMIN` e RLS habilitado nas tabelas expostas. A checklist minima de seguranca esta em [docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md).

Projeto Supabase usado no prototipo:

- URL: `https://bbcubwmvizcmjtwiiyxv.supabase.co`
- Host PostgreSQL: `db.bbcubwmvizcmjtwiiyxv.supabase.co`
- Database: `postgres`
- SSL: obrigatorio via `sslmode=require`

Para rodar a API contra o Supabase, preencha `apps/api/.env` ou as variaveis do provedor com a senha real do banco:

```env
DATABASE_URL="postgresql://postgres:REPLACE_WITH_SUPABASE_DB_PASSWORD@db.bbcubwmvizcmjtwiiyxv.supabase.co:5432/postgres?sslmode=require"
```

Para o frontend online, configure:

```env
NEXT_PUBLIC_API_URL="https://REPLACE_WITH_BACKEND_URL"
NEXT_PUBLIC_SUPABASE_URL="https://REPLACE_WITH_PROJECT_REF.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_REPLACE_ME"
# Alias tambem aceito:
NEXT_PUBLIC_SUPABASE_KEY="sb_publishable_REPLACE_ME"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_REPLACE_ME"
```

Nunca configure `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `DATABASE_URL` ou secrets JWT no frontend/Vercel com prefixo `NEXT_PUBLIC_`. A chave secreta Supabase compartilhada fora do painel deve ser rotacionada antes de qualquer deploy publico.

Comandos finais principais:

```bash
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm prisma:migrate:deploy
pnpm build:api
pnpm start:api
pnpm build:web
```

Variaveis essenciais da API:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `PORT`
- `CORS_ORIGINS`
- `MASTER_ADMIN_NAME`
- `MASTER_ADMIN_EMAIL`
- `MASTER_ADMIN_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SECRET_KEY` alternativa server-side para novas chaves `sb_secret_*`
- `SUPABASE_STORAGE_BUCKET`

Variavel essencial do frontend:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_KEY` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Validacoes de seguranca realizadas neste checkpoint:

- `pnpm build:api`, `pnpm build:web` e `pnpm typecheck:mobile` passaram.
- `GET /health` retornou banco conectado.
- Login `MASTER_ADMIN`, `COMPANY_ADMIN` e `EMPLOYEE` retornou usuarios sem `passwordHash`.
- Role guard bloqueou `COMPANY_ADMIN` em `/master/companies` e `EMPLOYEE` em `/company/employees`.
- Preflight CORS de `http://localhost:8081` foi aceito para o mobile web local.
- Upload de odometro rejeitou `text/plain` e aceitou `image/png` no bucket privado.
- Fotos de odometro agora usam caminho unico com empresa, OS, usuario, timestamp e UUID, sem `upsert`.
- `AuditLog` registra login, criacao/inicio/fim de OS, upload de odometro e finalizacao de rota.

## Proximos Passos

1. Adicionar testes automatizados de permissao e isolamento por `company_id`.
2. Adicionar testes de criacao de empresa com primeiro `COMPANY_ADMIN`.
3. Adicionar testes automatizados do painel web.
4. Criar endpoint dedicado de reset de senha de funcionario.
5. Criar testes automatizados de permissao para veiculos.
6. Adicionar busca/filtros avancados na tela web de veiculos.
7. Expandir `AuditLog` para todas as acoes administrativas sensiveis.
8. Adicionar testes automatizados para endpoints live e filtros de rotas.
9. Incluir alertas de manutencao no dashboard da empresa.
10. Adicionar testes automatizados para combustivel e reembolso.
