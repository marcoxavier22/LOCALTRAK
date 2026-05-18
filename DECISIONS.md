# DECISIONS.md

Registro de decisoes tecnicas do projeto LocalTrak Rotas / TrakFlow.

## Decisoes Tomadas

### Rebranding Definitorio: LocalTrak/Routify → TrakFlow

Data: 2026-05-18

Decisao: a plataforma evoluira comercialmente com a marca definitiva **TrakFlow**.

Justificativa: TrakFlow representa de forma premium, fluida e moderna a promessa central de colocar a empresa no controle do fluxo de cada rota, visita e operacao em campo. O termo "Flow" conecta-se ao fluxo de trabalho operacional, produtividade e eficiencia, superando as marcas provisorias ou legadas (LocalTrak e Routify).

Estrategia de transicao:

- Textos e logos **visiveis** ao usuario final foram completamente migrados para **TrakFlow** nas interfaces web e mobile.
- Nomes **tecnicos internos** (`@localtrak/api`, `@localtrak/web`, package names, slugs Expo, URLs de deploy legadas) sao mantidos temporariamente para compatibilidade e estabilidade com a infraestrutura de deploy continuo.
- Chave localStorage migrada de `routify-theme` para `trakflow-theme` com fallback backward-compatible de multiplos niveis.

Arquivos alterados:

- `apps/web/src/app/layout.tsx` — metadata TrakFlow e fallback inline de tema.
- `apps/web/src/app/login/page.tsx` — textos de login, tagline e logo TrakFlow.
- `apps/web/src/components/AppShell.tsx` — logo e marca TrakFlow na sidebar.
- `apps/web/src/components/ThemeToggle.tsx` — chave localStorage `trakflow-theme`.
- `apps/mobile/app.json` — nome do app TrakFlow e permissoes iOS atualizadas.
- `apps/mobile/src/App.tsx` — logo Svg de TrakFlow e textos visiveis no app mobile.
- `README.md` — documentacao e posicionamento da marca TrakFlow atualizada

### Deploy API

Data: 2026-05-17

Decisao: hospedar API no **Render** com servico `localtrak-api`.

Justificativa: Render suporta deploy de Node.js a partir de repositorio Git com suporte a pre-deploy commands (migrations), health check, variaveis de ambiente e plano gratuito para prototipo.

Build Command: `pnpm install && pnpm build:api`  
Pre-deploy: `pnpm prisma:migrate:deploy`  
Start Command: `pnpm start:api`

Nota: `pnpm build:web` foi removido do buildCommand do Render pois o frontend esta no Vercel.

### Deploy Web

Data: 2026-05-17

Decisao: hospedar frontend web no **Vercel**.

Justificativa: Vercel oferece deploy automatico via GitHub, suporte nativo a Next.js, CDN global e plano gratuito.

Root Directory: `apps/web`  
Build Command: `pnpm build`

### Banco de Dados

Data: 2026-05-17

Decisao: usar **Supabase PostgreSQL** como banco gerenciado.

Justificativa: Supabase oferece PostgreSQL gerenciado, Storage para arquivos, autenticacao opcional e painel administrativo de banco. O projeto usa apenas o banco e Storage (Auth e RLS sao opcionais).


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

### Geolocalização e Integração de Mapas Híbridos (Web e Mobile)

Data: 2026-05-18

Decisão: Adotar uma arquitetura de mapas híbrida e controlada na TrakFlow:
- **Geocoding Centralizado e Seguro**: O backend NestJS é o único responsável por realizar geocodificação de endereços textuais em coordenadas usando a chave privada do Google Maps encapsulada de forma segura no `GeocodingService`.
- **Criação de OS baseada em Endereço/CEP**: O formulário de Ordens de Serviço no painel web permite autocompletar endereços dinamicamente via integração client-side com ViaCEP, vinculando clientes e eliminando a necessidade de inserção de coordenadas manuais pelo usuário.
- **Visualização Reutilizável**: Leaflet e OpenStreetMap são usados no frontend Web para listagens e dashboards operacionais (reduzindo custo da API do Google), enquanto o mobile/Expo e páginas de detalhes específicas usam Google Maps nativo para máxima fidelidade e precisão.

### Inicialização de Armazenamento Self-Healing no Supabase Storage

Data: 2026-05-18

Decisão: Implementar inicialização de buckets de armazenamento programática e resiliente (Self-Healing) no backend NestJS.

Justificativa: Evita erros comuns de configuração em que administradores de infraestrutura esquecem de criar fisicamente os buckets (como `order-odometer`) no Supabase, ou configuram incorretamente as políticas e limites. No primeiro upload de foto de odômetro, o `OrdersStorageService` verifica a existência do bucket e o cria de forma autônoma com restrição de visibilidade privada (`public: false`), limites de tamanho (5MB) e formatos permitidos (`image/png`, `image/jpeg`, `image/webp`).

### Verificação de MIME Type por Assinatura de Magic Bytes (Base64)

Data: 2026-05-18

Decisão: Validar o formato das imagens de odômetro enviadas em Base64 utilizando análise de Magic Bytes (assinaturas de cabeçalho base64) ao invés de confiar cegamente no cabeçalho `data:image/...` enviado pelo cliente.

Justificativa: Aumenta a segurança e a resiliência contra ataques de upload de arquivos maliciosos ou formatação incorreta do app mobile. O backend analisa os primeiros caracteres da string base64 limpa buscando assinaturas conhecidas (`iVBORw0KGgo` para PNG, `UklGR` para WebP) antes de decodificar o buffer físico.

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
