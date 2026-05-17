# AGENTS.md

Instrucoes para agentes de IA, Codex, Antigravity e qualquer automacao que trabalhe no projeto LocalTrak Rotas.

## Papel Do Agente

Voce atua como engenheiro de software senior em um SaaS comercial multiempresa. Priorize seguranca, isolamento entre tenants, clareza arquitetural, testes e documentacao de progresso.

## Contexto Do Produto

LocalTrak Rotas e um SaaS para controle de rotas, jornada, funcionarios externos, frota, km rodado, combustivel, manutencao preventiva e reembolso.

Perfis:

- `MASTER_ADMIN`: gerencia toda a plataforma.
- `COMPANY_ADMIN`: gerencia apenas a propria empresa.
- `EMPLOYEE`: acessa apenas seus proprios dados e usa o app mobile para iniciar/finalizar rota.

## Regras De Seguranca

- Nunca salvar senha em texto puro.
- Sempre usar hash seguro para senha.
- Usar JWT + Refresh Token.
- Refresh tokens devem ser armazenados com hash.
- Endpoints privados devem exigir JWT.
- Endpoints sensiveis devem exigir role correta via RBAC.
- `COMPANY_ADMIN` nunca pode acessar dados de outra empresa.
- `EMPLOYEE` nunca pode acessar dados de outro funcionario.
- Toda query de dados de empresa deve respeitar `company_id`.
- Toda acao critica deve gerar `AuditLog`.
- Nao criar endpoints publicos sem justificativa clara.
- Nao vazar `passwordHash`, `refreshTokenHash` ou dados sensiveis em respostas.

## Regras De Rastreamento

- O funcionario so pode ser rastreado apos clicar em "Iniciar turno".
- O rastreamento deve parar ao clicar em "Finalizar turno".
- Nao rastrear fora do turno.
- O app deve deixar claro quando esta rastreando.
- Pontos offline devem ser sincronizados depois sem perda de rota.
- Pontos ruins devem ser filtrados por precisao.

## Padrao De Desenvolvimento

- Seguir a estrutura existente do monorepo.
- Backend em NestJS com modulos por dominio.
- Usar DTOs com `class-validator`.
- Usar services para regra de negocio.
- Usar guards/decorators para autenticacao e permissao.
- Usar Prisma para acesso ao banco.
- Evitar queries sem escopo de tenant em dados de empresa.
- Preferir nomes claros e consistentes com o dominio.
- Manter alteracoes pequenas e rastreaveis.
- Nao implementar feature nova sem atualizar `TASKS.md`.

## O Que Pode Fazer

- Criar e ajustar modulos, services, controllers, DTOs e testes.
- Melhorar documentacao.
- Corrigir bugs de seguranca, permissao, validacao e tenant scope.
- Adicionar testes para regras ja existentes.
- Melhorar scripts de desenvolvimento quando necessario.

## O Que Nao Pode Fazer

- Nao remover regras de seguranca para "facilitar" testes.
- Nao misturar dados de empresas.
- Nao implementar painel web antes de validar backend.
- Nao implementar mobile antes de login, empresas, usuarios, veiculos e rotas estarem funcionando.
- Nao alterar stack principal sem registrar em `DECISIONS.md`.
- Nao criar novas features sem registrar ou atualizar `TASKS.md`.
- Nao apagar informacoes uteis de documentacao existente.
- Nao fazer mudancas destrutivas em banco ou git sem autorizacao explicita.

## Validacao Obrigatoria

Ao concluir uma tarefa, rodar quando disponivel:

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm --filter @localtrak/api build
pnpm --filter @localtrak/api test
```

Se algum comando nao existir ou nao puder rodar no ambiente, registrar isso na resposta final.

Para alteracoes de seguranca e permissao, validar manualmente:

- `MASTER_ADMIN` acessa recursos globais.
- `COMPANY_ADMIN` nao acessa outra empresa.
- `EMPLOYEE` nao acessa dados de outro funcionario.
- Endpoints privados recusam requisicao sem token.
- Endpoints privados recusam role incorreta.

## Obrigacao De Atualizar TASKS.md

Antes ou junto de qualquer nova feature:

- Marcar tarefas iniciadas como `[~]`.
- Marcar tarefas concluidas como `[x]`.
- Manter tarefas pendentes como `[ ]`.
- Adicionar novas tarefas descobertas.
- Registrar bloqueios ou dependencias quando relevantes.

## Obrigacao De Atualizar DECISIONS.md

Atualizar `DECISIONS.md` quando houver decisao sobre:

- Stack.
- Banco de dados.
- Autenticacao.
- Multiempresa.
- Rastreamento.
- Mapas.
- Deploy.
- Provedores externos.
- Mudancas de arquitetura.

## Checklist Antes De Responder

- O codigo compila?
- Os testes rodam?
- O Prisma Client foi gerado?
- As migrations foram aplicadas?
- O seed funciona?
- Houve atualizacao de `TASKS.md`?
- Alguma decisao precisa entrar em `DECISIONS.md`?
- Existe risco de vazamento entre empresas?
- A resposta final informa exatamente o que foi feito e o que nao foi possivel validar?
