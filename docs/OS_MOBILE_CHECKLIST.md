# Checklist Mobile - OS, Foto E Rota

## Preparacao

- [ ] Configurar API acessivel pelo celular: `EXPO_PUBLIC_API_URL=http://SEU_IP:3333`.
- [ ] Configurar no backend `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_STORAGE_BUCKET=order-odometer`.
- [ ] Rodar `pnpm dev:api`.
- [ ] Rodar `pnpm dev:mobile`.
- [ ] Abrir no Expo Go.

## Login

- [ ] Login com `funcionario@empresateste.com` / `Senha123!`.
- [ ] Confirmar que `MASTER_ADMIN` e `COMPANY_ADMIN` sao bloqueados no app.
- [ ] Abrir aba `OS`.

## Inicio Obrigatorio Com Foto

- [ ] Selecionar uma OS pendente.
- [ ] Informar KM inicial.
- [ ] Confirmar que `Iniciar rota da OS` fica bloqueado antes do upload da foto.
- [ ] Tocar em `Enviar foto inicial`.
- [ ] Tirar foto do odometro.
- [ ] Confirmar upload sem erro.
- [ ] Tocar em `Iniciar rota da OS`.
- [ ] Permitir localizacao.
- [ ] Confirmar status `Em andamento`.
- [ ] Confirmar que pontos GPS comecam a ser enviados.

## Durante A OS

- [ ] Ver enderecos/paradas.
- [ ] Marcar uma parada como concluida.
- [ ] Confirmar que a parada aparece concluida.
- [ ] Conferir no web se o mapa da OS recebe o tracking.

## Finalizacao Obrigatoria Com Foto

- [ ] Informar KM final maior ou igual ao inicial.
- [ ] Confirmar que `Finalizar jornada da OS` fica bloqueado antes do upload da foto final.
- [ ] Tocar em `Enviar foto final`.
- [ ] Tirar foto do odometro.
- [ ] Tocar em `Finalizar jornada da OS`.
- [ ] Confirmar status `Finalizada`.
- [ ] Confirmar que tracking em segundo plano foi encerrado.

## Cenarios De Erro

- [ ] Tentar iniciar sem foto inicial e confirmar erro amigavel.
- [ ] Tentar finalizar sem foto final e confirmar erro amigavel.
- [ ] Tentar finalizar com KM menor que inicial e confirmar erro amigavel.
- [ ] Remover permissao de camera e confirmar feedback visual.
- [ ] Remover permissao de localizacao e confirmar feedback visual.
