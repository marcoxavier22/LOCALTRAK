# Checklist - Reembolsos

## Preparacao

- [ ] Rodar `pnpm prisma:migrate:deploy`.
- [ ] Rodar `pnpm prisma:seed`.
- [ ] Iniciar API e web.
- [ ] Login como `COMPANY_ADMIN`.

## Fluxo Web

- [ ] Acessar `/empresa/reembolsos`.
- [ ] Confirmar que nao ocorre `Internal Server Error`.
- [ ] Conferir cards de reembolso estimado, total pago, km reembolsavel e rotas.
- [ ] Registrar pagamento com funcionario, veiculo, km, custo de combustivel, valor, data, status e descricao.
- [ ] Confirmar que o pagamento aparece no historico.
- [ ] Filtrar por funcionario.
- [ ] Filtrar por veiculo.
- [ ] Filtrar por periodo.
- [ ] Filtrar por status `Pendente` e `Pago`.
- [ ] Conferir ranking por funcionario.
- [ ] Conferir rotas consideradas no periodo.
- [ ] Validar dark mode e responsividade.

## Backend

- [ ] `GET /company/reimbursements/payments` retorna pagamentos da propria empresa.
- [ ] `POST /company/reimbursements/payments` valida funcionario da empresa.
- [ ] `POST /company/reimbursements/payments` valida veiculo da empresa.
- [ ] Veiculo vinculado a outro funcionario retorna erro amigavel.
- [ ] Resposta inclui funcionario e veiculo, sem dados sensiveis.
- [ ] `EMPLOYEE` nao acessa endpoints administrativos.

