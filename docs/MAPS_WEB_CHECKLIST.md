# MAPS_WEB_CHECKLIST.md

Checklist para validar mapas, trajetos e UX responsiva no painel web do LocalTrak Rotas.

## Ambiente

- [ ] Rodar API com `pnpm dev:api`.
- [ ] Confirmar `GET http://localhost:3333/health` retornando `{"status":"ok","database":"connected"}`.
- [ ] Rodar web com `pnpm dev:web`.
- [ ] Confirmar `apps/web/.env.local` com `NEXT_PUBLIC_API_URL=http://localhost:3333`.
- [ ] Fazer login como `COMPANY_ADMIN` usando `admin@empresateste.com` / `Senha123!`.

## Dashboard Da Empresa

- [ ] Acessar `http://localhost:3000/empresa/dashboard`.
- [ ] Confirmar que o card `Mapa operacional` aparece sem erro de carregamento.
- [ ] Confirmar que a lista lateral mostra rotas reais vindas de `GET /company/routes`.
- [ ] Selecionar uma rota em andamento e confirmar polling em `GET /routes/:id/live`.
- [ ] Selecionar uma rota finalizada e confirmar busca em `GET /routes/:id/history`.
- [ ] Confirmar que o mapa mostra ponto inicial, ponto atual/final e linha do trajeto.
- [ ] Confirmar que os cards do mapa mostram funcionario, km, status e quantidade de pontos.
- [ ] Simular envio de novo ponto pelo app mobile e aguardar ate 5 segundos para aparecer no dashboard.

## Historico De Rotas

- [ ] Acessar `http://localhost:3000/empresa/rotas`.
- [ ] Confirmar mapa OpenStreetMap/Leaflet carregado.
- [ ] Filtrar por status, funcionario, veiculo e periodo.
- [ ] Abrir uma rota em `http://localhost:3000/empresa/rotas/<routeId>`.
- [ ] Confirmar que o detalhe mostra cards de resumo, mapa, polyline e timeline de pontos.
- [ ] Validar que uma rota sem pontos exibe estado vazio amigavel em vez de mapa quebrado.

## Ordens De Servico

- [ ] Acessar `http://localhost:3000/empresa/ordens`.
- [ ] Criar ou abrir uma OS com paradas/endereco.
- [ ] Acessar `http://localhost:3000/empresa/ordens/<orderId>`.
- [ ] Confirmar que o mapa mostra roteiro planejado com marcadores de paradas.
- [ ] Confirmar que paradas pendentes e concluidas usam cores diferentes.
- [ ] Iniciar a OS pelo app mobile e confirmar que o trajeto real aparece no detalhe da OS.
- [ ] Validar polling de tracking em `GET /orders/:id/tracking` enquanto a OS esta em andamento.

## Responsividade E Tema

- [ ] Testar desktop largo.
- [ ] Testar tablet.
- [ ] Testar largura mobile no navegador.
- [ ] Confirmar que mapa, cards e listas nao estouram a tela.
- [ ] Alternar tema claro/escuro e confirmar contraste adequado no mapa e paineis.
- [ ] Confirmar que loading, erro e estados vazios aparecem com mensagens visiveis.

## Segurança

- [ ] Confirmar que `EMPLOYEE` nao acessa o painel web.
- [ ] Confirmar que `COMPANY_ADMIN` so enxerga rotas e OS da propria empresa.
- [ ] Confirmar que todas as chamadas usam `Authorization: Bearer <token>`.
- [ ] Confirmar que respostas nao exibem `passwordHash` ou `password_hash`.
