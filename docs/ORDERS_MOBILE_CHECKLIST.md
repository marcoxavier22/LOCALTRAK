# Checklist Mobile - Ordens de Servico

Checklist complementar e mais atual: `docs/OS_MOBILE_CHECKLIST.md`.

## Preparacao

- [ ] Rodar `pnpm dev:api`.
- [ ] Configurar `EXPO_PUBLIC_API_URL` ou `apps/mobile/src/lib/config.ts` para o IP acessivel pelo celular.
- [ ] Garantir Storage privado no Supabase com bucket `order-odometer`.
- [ ] Garantir variaveis no backend: `SUPABASE_URL`, `SUPABASE_STORAGE_BUCKET` e `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SECRET_KEY`.
- [ ] Rodar `pnpm dev:mobile`.
- [ ] Abrir no Expo Go ou navegador.

## Login

- [ ] Entrar com `funcionario@empresateste.com` / `Senha123!`.
- [ ] Confirmar que `MASTER_ADMIN` e `COMPANY_ADMIN` recebem a mensagem de acesso exclusivo para funcionarios.
- [ ] Confirmar botao de sair.

## Minhas OS

- [ ] Abrir a aba `OS`.
- [ ] Confirmar OS do dia atribuida ao funcionario.
- [ ] Confirmar titulo, veiculo, status e enderecos.
- [ ] Atualizar a lista manualmente se necessario.

## Inicio Da Jornada

- [ ] Informar KM inicial.
- [ ] Tocar em `Iniciar jornada da OS`.
- [ ] Permitir camera.
- [ ] Tirar foto do odometro.
- [ ] Permitir localizacao.
- [ ] Confirmar status `Em andamento`.

## Durante A Rota

- [ ] Confirmar enderecos listados.
- [ ] Tocar em `Concluir` em uma parada.
- [ ] Confirmar que a parada muda para concluida.
- [ ] Validar no painel web que o detalhe da OS mostra a parada concluida.

## Finalizacao Da Jornada

- [ ] Informar KM final maior ou igual ao inicial.
- [ ] Tocar em `Finalizar jornada da OS`.
- [ ] Tirar foto do odometro final.
- [ ] Confirmar status `Finalizada`.
- [ ] Confirmar no painel web KM inicial, KM final, distancia e fotos.

## Cenarios De Erro

- [ ] Testar KM final menor que inicial e confirmar mensagem amigavel.
- [ ] Testar sem permissao de camera e confirmar erro visivel.
- [ ] Testar backend sem Storage configurado e confirmar erro 503 explicativo.
