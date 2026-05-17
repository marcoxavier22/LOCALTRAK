# DECISIONS.md

Registro de decisoes tecnicas do projeto LocalTrak Rotas.

## Decisoes Tomadas

### Produto SaaS Multiempresa

Decisao: o sistema sera multiempresa desde o inicio.

Justificativa: o produto sera vendido para varias empresas usando a mesma plataforma. Por isso, entidades operacionais como usuarios, veiculos, rotas, manutencao, combustivel, consentimentos e auditoria precisam carregar ou respeitar `company_id`.

Impacto:

- `MASTER_ADMIN` pode acessar tudo.
- `COMPANY_ADMIN` deve ser limitado ao proprio `company_id`.
- `EMPLOYEE` deve ser limitado aos proprios dados.
- Queries de dados empresariais devem ter filtro por tenant.

### Monorepo

Decisao: usar monorepo com `apps` e `packages`.

Justificativa: backend, web, mobile e pacotes compartilhados evoluem juntos, com tipos e regras de dominio reutilizaveis.

Estrutura:

- `apps/api`
- `apps/web`
- `apps/mobile`
- `packages/shared`
- `packages/config`

### Backend NestJS

Decisao: usar NestJS no backend.

Justificativa: NestJS favorece arquitetura modular, injecao de dependencias, guards, pipes, DTOs e organizacao por dominio, adequado para SaaS comercial.

### PostgreSQL E Prisma

Decisao: usar PostgreSQL com Prisma.

Justificativa: PostgreSQL e robusto para dados relacionais e Prisma acelera modelagem, migrations e acesso tipado ao banco.

Decisao futura: usar PostGIS para calculos e consultas geoespaciais avancadas.

### Autenticacao

Decisao: usar JWT access token + refresh token.

Justificativa: permite uso por web e mobile, com access token curto e refresh token renovavel.

Decisoes de seguranca:

- Senhas com hash bcrypt.
- Refresh token armazenado com hash.
- Login bloqueia usuarios inativos.
- Login bloqueia empresas `BLOCKED`, `DELINQUENT` e `ARCHIVED`.
- Endpoints privados exigem JWT por padrao.

### RBAC

Decisao: usar RBAC por role.

Roles:

- `MASTER_ADMIN`
- `COMPANY_ADMIN`
- `EMPLOYEE`

Justificativa: os perfis do produto tem responsabilidades claras e diferentes.

### Tenant Scope

Decisao: criar `TenantScopeService` e `CompanyContextGuard`.

Justificativa: o isolamento por empresa deve ser regra central, nao decisao manual espalhada em cada endpoint.

Regras:

- Usuario de empresa precisa ter `companyId`.
- `COMPANY_ADMIN` so acessa dados do proprio `companyId`.
- `EMPLOYEE` so acessa os proprios dados.
- `MASTER_ADMIN` e excecao controlada.

### Rastreamento

Decisao: o rastreamento deve ser controlado por turno/rota.

Justificativa: LGPD, transparencia e confianca do funcionario exigem que o app nao rastreie 24h.

Regras:

- Rastrear somente apos "Iniciar turno".
- Parar ao "Finalizar turno".
- Registrar logs de inicio e fim.
- Mostrar status claro no app.
- Suportar armazenamento offline e sincronizacao posterior.

### Calculo De Distancia

Decisao inicial: usar Haversine no backend.

Justificativa: atende o MVP sem depender imediatamente de funcoes geoespaciais.

Decisao futura: avaliar PostGIS para calculos mais robustos, consultas por raio, trajetos e otimizacoes.

### Mapas

Decisao inicial: usar OpenStreetMap/Leaflet no painel web.

Justificativa: reduz custo inicial e atende visualizacao de rotas no MVP.

Decisao: o acompanhamento "ao vivo" do painel web usara polling curto em endpoint NestJS (`GET /routes/:id/live`) em vez de acesso direto do frontend ao Supabase.

Justificativa: o backend continua sendo a unica camada de autorizacao, mantendo RBAC, filtro por `company_id` e protecao de dados entre empresas. Para o prototipo, polling de 5 segundos entrega atualizacao dinamica com menor complexidade operacional que WebSocket/Supabase Realtime.

Decisao futura: avaliar Mapbox ou Google Maps se houver necessidade de recursos avancados, geocoding pago, melhor UX mobile ou SLA especifico.
Decisao futura: avaliar WebSocket, SSE ou Supabase Realtime para reduzir latencia e carga quando houver multiplos funcionarios simultaneos em producao.

### Web Admin

Decisao: implementar Next.js para painel administrativo.

Justificativa: boa base para dashboards, rotas autenticadas, SSR/CSR conforme necessidade e deploy simples em Vercel futuramente.

Restricao: nao avancar para painel web antes de validar backend.

### Mobile

Decisao: implementar React Native com Expo.

Justificativa: acelera desenvolvimento Android/iOS, oferece APIs para localizacao e permite build futuro com Expo EAS.

Restricao: nao avancar para mobile antes de login, empresas, usuarios, veiculos e rotas estarem funcionando.

## Decisoes Pendentes

- Definir estrategia final de migrations para ambientes dev/staging/producao.
- Definir provedor do banco: Supabase, Neon, Railway, Render ou VPS.
- Definir estrategia de deploy da API.
- Definir estrategia de logs e observabilidade.
- Definir Sentry e alertas.
- Definir politica de retencao de dados de localizacao.
- Definir versao inicial dos termos de uso e politica de privacidade.
- Definir frequencia padrao de tracking no app.
- Definir se pontos offline serao armazenados em SQLite ou outra solucao local.
- Definir estrategia de exports PDF/Excel.
- Definir modelo comercial dos planos.
- Definir se empresa criada pelo Master deve sempre criar um `COMPANY_ADMIN` no mesmo fluxo ou se isso sera opcional.
