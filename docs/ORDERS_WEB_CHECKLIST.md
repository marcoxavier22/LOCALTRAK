# Checklist Web - Ordens de Servico

Checklist complementar e mais atual: `docs/OS_WEB_CHECKLIST.md`.

## Preparacao

- [ ] Rodar `pnpm prisma:migrate:deploy`.
- [ ] Rodar `pnpm prisma:seed`.
- [ ] Garantir que a API responde `GET /health`.
- [ ] Garantir que o backend possui `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_STORAGE_BUCKET=order-odometer` quando for testar fotos.
- [ ] Rodar `pnpm dev:api`.
- [ ] Rodar `pnpm dev:web`.

## Login E Navegacao

- [ ] Acessar `http://localhost:3000/login`.
- [ ] Entrar como `COMPANY_ADMIN` com `admin@empresateste.com` / `Senha123!`.
- [ ] Confirmar redirecionamento para `/empresa/dashboard`.
- [ ] Abrir o menu `Ordens de Servico`.

## Criacao De OS

- [ ] Acessar `/empresa/ordens`.
- [ ] Ver cards de total, pendentes, em andamento e finalizadas.
- [ ] Criar OS com titulo, data, funcionario, veiculo e pelo menos um endereco.
- [ ] Confirmar mensagem de sucesso.
- [ ] Confirmar que a OS aparece na tabela.
- [ ] Validar filtros por funcionario, veiculo, status e data.

## Detalhe E Edicao

- [ ] Clicar em `Ver detalhes`.
- [ ] Confirmar cards de status, paradas, KM do odometro e data.
- [ ] Confirmar mapa do roteiro planejado quando houver latitude/longitude.
- [ ] Editar titulo, status, atribuicao ou observacoes.
- [ ] Salvar e conferir mensagem de sucesso.
- [ ] Confirmar lista de enderecos e status de cada parada.

## Fotos Do Odometro

- [ ] Iniciar e finalizar a OS pelo app mobile.
- [ ] Reabrir `/empresa/ordens/[id]`.
- [ ] Confirmar foto inicial e foto final do odometro.
- [ ] Confirmar KM inicial, KM final e distancia calculada.

## Permissoes

- [ ] Tentar acessar `/empresa/ordens` como `EMPLOYEE` no painel web e confirmar bloqueio.
- [ ] Tentar listar OS sem token e confirmar erro 401.
- [ ] Confirmar que uma empresa nao visualiza OS de outra empresa.
