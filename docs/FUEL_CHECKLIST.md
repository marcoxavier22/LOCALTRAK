# Checklist - Combustivel

## Preparacao

- [ ] Rodar migrations e seed.
- [ ] Login web como `COMPANY_ADMIN`.
- [ ] Garantir que existam veiculos e rotas finalizadas.

## Fluxo Web

- [ ] Acessar `/empresa/combustivel`.
- [ ] Confirmar cards de custo estimado, km da frota, rotas e reembolsos.
- [ ] Criar configuracao de combustivel por litro.
- [ ] Criar configuracao de combustivel por km.
- [ ] Atualizar uma configuracao existente.
- [ ] Filtrar relatorio por funcionario, veiculo e periodo.
- [ ] Conferir grafico simples de km/custo por veiculo.
- [ ] Conferir tabela de custo por veiculo.
- [ ] Conferir tabela de custo por funcionario.
- [ ] Validar dark mode e responsividade.

## Calculos

- [ ] Veiculo da empresa calcula custo estimado.
- [ ] Veiculo particular calcula reembolso estimado.
- [ ] Quando houver consumo medio e valor por litro, custo usa `km / consumo x valor_litro`.
- [ ] Quando nao houver consumo medio, custo usa `costPerKm` do veiculo ou `defaultCostPerKm`.

## Backend

- [ ] `GET /company/fuel/settings` respeita `company_id`.
- [ ] `POST /company/fuel/settings` exige valor por litro, valor por km ou ambos.
- [ ] `GET /company/reimbursements` aceita filtros `employeeId`, `vehicleId`, `startDate` e `endDate`.
- [ ] `COMPANY_ADMIN` nao acessa dados de outra empresa.
