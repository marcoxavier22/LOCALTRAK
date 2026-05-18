# WEB_TEST_CHECKLIST.md

Checklist manual do painel web do LocalTrak Rotas para testes online com Supabase PostgreSQL.

## Pre-condicoes

- Projeto Supabase `LocalTrak` ativo.
- `DATABASE_URL` da API aponta para Supabase com `sslmode=require`.
- Migrations aplicadas com `pnpm prisma:migrate:deploy`.
- Seed executado com `pnpm prisma:seed`.
- API rodando localmente ou hospedada.
- Frontend rodando localmente ou hospedado.
- `NEXT_PUBLIC_API_URL` aponta para a URL real da API.

Ambiente local:

- API: `http://localhost:3333`
- Web: `http://localhost:3000`
- Frontend env: `NEXT_PUBLIC_API_URL=http://localhost:3333`

Se `3000` estiver ocupada, o Next.js pode subir em `3001` ou `3002`. Use a URL exibida no terminal do `pnpm dev:web`.

Ambiente online:

- API: `https://REPLACE_WITH_BACKEND_URL`
- Web: `https://REPLACE_WITH_FRONTEND_URL`
- Frontend env: `NEXT_PUBLIC_API_URL=https://REPLACE_WITH_BACKEND_URL`

## 1. Health Da API

- [ ] Acessar `GET /health`.
- [ ] Confirmar resposta:

```json
{
  "status": "ok",
  "database": "connected"
}
```

No Sprint 0, `/health` foi validado em localhost contra Supabase e retornou `status: ok`.

## 2. Login MASTER_ADMIN

- [ ] Acesse `http://localhost:3000/login`.
- [ ] Insira o email do MASTER_ADMIN: `admin@localtrak.test`
- [ ] Insira a senha do MASTER_ADMIN: `<MASTER_ADMIN_PASSWORD>`
- [ ] Clique em "Entrar".
- [ ] Confirmar redirecionamento para `/master/dashboard`.
- [ ] Confirmar que o painel master carrega cards reais.
- [ ] Confirmar que `Empresas` aparece na sidebar.

No Sprint 0, o login API do `MASTER_ADMIN` foi validado com sucesso.

## 3. Criar Empresa Com COMPANY_ADMIN

- [ ] Acessar `/master/empresas`.
- [ ] Clicar em `Nova empresa`.
- [ ] Confirmar URL `/master/empresas/nova`.
- [ ] Preencher dados da empresa.
- [ ] Preencher dados do primeiro `COMPANY_ADMIN`.
- [ ] Salvar.
- [ ] Confirmar retorno para `/master/empresas`.
- [ ] Confirmar que a empresa aparece na lista.

## 4. Login COMPANY_ADMIN

- [ ] Fazer logout do `MASTER_ADMIN`.
- [ ] Acesse `http://localhost:3000/login`.
- [ ] Insira o email do COMPANY_ADMIN: `<SEED_COMPANY_ADMIN_EMAIL>`
- [ ] Insira a senha do COMPANY_ADMIN: `<SEED_DEMO_PASSWORD>`
- [ ] Clique em "Entrar".
- [ ] Confirmar redirecionamento para `/empresa/dashboard`.
- [ ] Confirmar que o dashboard da empresa carrega.

No Sprint 0, o login API do `COMPANY_ADMIN` foi validado com sucesso.

## 5. Criar Funcionario

- [ ] Acessar `/empresa/funcionarios`.
- [ ] Confirmar que a lista consome dados reais da API.
- [ ] Clicar em `Novo funcionario`.
- [ ] Confirmar URL `/empresa/funcionarios/novo`.
- [ ] Preencher nome, e-mail, telefone e senha.
- [ ] Salvar.
- [ ] Confirmar retorno para `/empresa/funcionarios`.
- [ ] Confirmar que o funcionario criado aparece na lista.

## 6. Testar Logout

- [ ] Clicar em `Sair`.
- [ ] Confirmar retorno para `/login`.
- [ ] Tentar acessar `/empresa/dashboard` diretamente.
- [ ] Confirmar redirecionamento para `/login`.

## 7. Garantir Que EMPLOYEE Nao Acessa O Painel Web

- [ ] Fazer login em `/login` com e-mail e senha de um funcionario.
- [ ] Confirmar mensagem: `Funcionarios acessam pelo aplicativo mobile.`
- [ ] Confirmar que a sessao web nao permanece ativa para `EMPLOYEE`.
- [ ] Tentar acessar `/empresa/dashboard`.
- [ ] Confirmar que nenhuma rota administrativa fica acessivel para `EMPLOYEE`.

No Sprint 0, o login API do `EMPLOYEE` foi validado e o acesso a `/master/companies` foi bloqueado por role guard.

## 8. Testes De Isolamento

- [ ] Criar duas empresas diferentes com dois `COMPANY_ADMIN`.
- [ ] Entrar como o admin da primeira empresa.
- [ ] Criar funcionario.
- [ ] Entrar como o admin da segunda empresa.
- [ ] Confirmar que o funcionario da primeira empresa nao aparece.
- [ ] Tentar abrir URLs administrativas master como `COMPANY_ADMIN`.
- [ ] Confirmar bloqueio de permissao.

## 9. Manutencao, Combustivel E Reembolsos

- [ ] Acessar `/empresa/manutencao`.
- [ ] Criar regra e registrar manutencao realizada com todos os campos obrigatorios.
- [ ] Filtrar manutencoes por veiculo, funcionario, tipo, status e periodo.
- [ ] Acessar `/empresa/combustivel`.
- [ ] Criar/editar configuracao de combustivel.
- [ ] Filtrar custos por funcionario, veiculo e periodo.
- [ ] Confirmar grafico simples de consumo por veiculo.
- [ ] Acessar `/empresa/reembolsos`.
- [ ] Registrar pagamento de reembolso com funcionario, veiculo, km, custo, valor, data, status e descricao.
- [ ] Filtrar pagamentos por funcionario, veiculo, periodo e status.
- [ ] Confirmar que nao ocorre `Internal Server Error`.
- [ ] Alternar dark/light mode e confirmar persistencia apos refresh.

