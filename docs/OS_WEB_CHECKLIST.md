# Checklist Web - OS E Rastreabilidade

## Preparacao

- [ ] Rodar `pnpm prisma:migrate:deploy`.
- [ ] Rodar `pnpm prisma:seed`.
- [ ] Rodar `pnpm dev:api`.
- [ ] Rodar `pnpm dev:web`.
- [ ] Confirmar `GET /health` com `database: connected`.

## Fluxo COMPANY_ADMIN

- [ ] Login em `http://localhost:3000/login` com `admin@empresateste.com` / `Senha123!`.
- [ ] Acessar `/empresa/ordens`.
- [ ] Confirmar cards de OS pendentes, em andamento e finalizadas.
- [ ] Criar OS com funcionario, veiculo, data e enderecos.
- [ ] Filtrar por funcionario, veiculo, status e data.
- [ ] Abrir `/empresa/ordens/<orderId>`.
- [ ] Confirmar dados de funcionario, veiculo, status, paradas e KM.

## Fotos E Odometro

- [ ] Confirmar que a OS pendente ainda nao mostra foto inicial.
- [ ] Iniciar a OS pelo app mobile com foto inicial.
- [ ] Reabrir detalhe da OS no web.
- [ ] Confirmar foto inicial, KM inicial e horario de inicio.
- [ ] Finalizar a OS pelo app mobile com foto final.
- [ ] Confirmar foto final, KM final, distancia por odometro e horario final.

## Mapa E Tracking

- [ ] Com OS pendente, confirmar mapa do roteiro planejado por enderecos/coordenadas.
- [ ] Com OS em andamento, confirmar que `/orders/:id/tracking` retorna `routeShift`.
- [ ] Confirmar que o mapa do detalhe troca para o trajeto GPS real quando existem pontos.
- [ ] Validar polling a cada 5 segundos durante OS em andamento.
- [ ] Confirmar que rota finalizada mantem historico de pontos.

## Responsividade E Tema

- [ ] Validar desktop.
- [ ] Validar tablet.
- [ ] Validar mobile web.
- [ ] Alternar dark mode e confirmar contraste dos cards, tabelas e mapa.

## Seguranca

- [ ] Confirmar que `EMPLOYEE` nao acessa painel web.
- [ ] Confirmar que `COMPANY_ADMIN` ve apenas OS da propria empresa.
- [ ] Confirmar que URLs de fotos sao assinadas e expiram.
