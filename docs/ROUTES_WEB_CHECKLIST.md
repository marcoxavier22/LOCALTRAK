# ROUTES_WEB_CHECKLIST.md

Checklist manual para validar visualizacao de rotas no painel web do LocalTrak Rotas.

## Pre-condicoes

- API rodando em `http://localhost:3333`.
- Web rodando em `http://localhost:3000`.
- Mobile ou requisicoes HTTP criando rotas reais no backend.
- Usuario `COMPANY_ADMIN` disponivel:
  - Email: `admin@empresateste.com`
  - Senha: `Senha123!`

## 1. Login E Acesso

- [ ] Acessar `http://localhost:3000/login`.
- [ ] Entrar como `COMPANY_ADMIN`.
- [ ] Confirmar redirecionamento para `/empresa/dashboard`.
- [ ] Acessar `/empresa/rotas`.
- [ ] Confirmar que `EMPLOYEE` nao acessa o painel web.

## 2. Rotas Ao Vivo

- [ ] Iniciar turno no app mobile com usuario `EMPLOYEE`.
- [ ] Confirmar que a rota aparece em `Rotas ao vivo`.
- [ ] Selecionar a rota ativa.
- [ ] Confirmar mapa com ponto inicial.
- [ ] Confirmar ponto atual.
- [ ] Confirmar polyline conforme novos pontos chegam.
- [ ] Confirmar atualizacao automatica a cada poucos segundos.
- [ ] Confirmar status `Em andamento`.
- [ ] Parar envio de pontos por alguns minutos e confirmar status operacional `Pausado`.

## 3. Historico E Filtros

- [ ] Finalizar turno no app mobile.
- [ ] Confirmar rota com status `Finalizada`.
- [ ] Confirmar que a rota finalizada aparece no historico sem recarregar manualmente apos o proximo polling.
- [ ] Filtrar por status.
- [ ] Filtrar por funcionario.
- [ ] Filtrar por veiculo, quando existir.
- [ ] Filtrar por data inicial.
- [ ] Filtrar por data final.
- [ ] Confirmar mensagem amigavel quando nenhum resultado for encontrado.

## 4. Detalhe Da Rota

- [ ] Abrir `/empresa/rotas/<routeId>`.
- [ ] Confirmar cards de km, duracao, pontos e status.
- [ ] Confirmar mapa com ponto inicial, ponto atual ou final e trajeto completo.
- [ ] Confirmar funcionario responsavel.
- [ ] Confirmar veiculo utilizado, quando houver.
- [ ] Confirmar inicio, fim e ultimo ponto.
- [ ] Confirmar timeline dos pontos GPS.

## 5. Responsividade

- [ ] Testar desktop.
- [ ] Testar tablet.
- [ ] Testar mobile.
- [ ] Confirmar que filtros, tabela, cards e mapa nao se sobrepoem.
- [ ] Confirmar que o mapa mantem altura util em telas pequenas.

## 6. Seguranca

- [ ] Sem token, `/empresa/rotas` redireciona para login.
- [ ] `EMPLOYEE` nao acessa `/empresa/rotas`.
- [ ] `COMPANY_ADMIN` ve apenas rotas da propria empresa.
- [ ] Testar preflight CORS quando web/mobile web roda em origem local diferente.
