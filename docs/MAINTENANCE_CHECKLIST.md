# Checklist - Manutencao Preventiva

## Preparacao

- [ ] Rodar `pnpm prisma:generate`.
- [ ] Rodar `pnpm prisma:migrate:deploy`.
- [ ] Rodar `pnpm prisma:seed`.
- [ ] Iniciar API com `pnpm dev:api`.
- [ ] Iniciar web com `pnpm dev:web`.
- [ ] Entrar como `COMPANY_ADMIN` (`admin@empresateste.com` / `Senha123!`).

## Fluxo Web

- [ ] Acessar `/empresa/manutencao`.
- [ ] Confirmar cards de manutencoes, alertas, custo total e regras ativas.
- [ ] Criar regra de manutencao por km, por dias ou por ambos.
- [ ] Registrar manutencao realizada com veiculo, tipo, km atual, data, descricao e custo.
- [ ] Confirmar que o registro aparece em `Manutencoes registradas`.
- [ ] Filtrar registros por veiculo, funcionario, tipo, status e periodo.
- [ ] Selecionar veiculo no historico e conferir proximos vencimentos calculados.
- [ ] Confirmar badges de status: realizada, agendada, vencida e cancelada.
- [ ] Alternar dark/light mode e confirmar contraste legivel.
- [ ] Testar responsividade em desktop, tablet e mobile.

## Backend

- [ ] `GET /company/maintenance/rules` retorna somente dados da empresa.
- [ ] `POST /company/maintenance/rules` valida intervalo por km ou dias.
- [ ] `GET /company/maintenance/records` aceita filtros.
- [ ] `POST /company/maintenance/records` exige veiculo, tipo, km, data, descricao e custo.
- [ ] `GET /company/maintenance/alerts` retorna manutencoes vencidas por km ou data.
- [ ] `EMPLOYEE` nao acessa endpoints administrativos.
