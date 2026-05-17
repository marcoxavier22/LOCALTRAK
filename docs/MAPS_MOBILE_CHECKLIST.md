# MAPS_MOBILE_CHECKLIST.md

Checklist para validar mapas, trajetos e geolocalizacao no app mobile Expo do LocalTrak Rotas.

## Ambiente

- [ ] Rodar API com `pnpm dev:api`.
- [ ] Confirmar `GET http://localhost:3333/health`.
- [ ] Configurar a API local para dispositivo fisico:

```powershell
$env:EXPO_PUBLIC_API_URL="http://SEU_IP_LOCAL:3333"
pnpm --filter @localtrak/mobile exec expo start --clear
```

- [ ] Para navegador, rodar:

```powershell
pnpm --filter @localtrak/mobile exec expo start --web --clear --port 8081
```

- [ ] Fazer login como `EMPLOYEE` usando `funcionario@empresateste.com` / `Senha123!`.

## Mapas No App

- [ ] Confirmar que o app abre no Expo Go sem erro de bundler.
- [ ] Confirmar que `react-native-maps` carrega no dispositivo nativo.
- [ ] Confirmar que a aba `OS` mostra mapa quando houver paradas com latitude/longitude.
- [ ] Confirmar que o mapa da OS mostra marcadores das paradas.
- [ ] Confirmar que a posicao atual aparece quando houver localizacao disponivel.
- [ ] Confirmar que no navegador o app exibe fallback com link para OpenStreetMap.
- [ ] Abrir o link do fallback web e validar que o destino usa coordenadas reais.

## Turno Livre

- [ ] Tocar em `Iniciar turno`.
- [ ] Permitir localizacao foreground.
- [ ] Permitir localizacao background quando o sistema solicitar.
- [ ] Confirmar que `POST /routes/start` retorna `routeId`.
- [ ] Aguardar envio de pontos para `POST /routes/:id/points`.
- [ ] Verificar no painel web `/empresa/dashboard` se a rota aparece no mapa operacional.
- [ ] Tocar em `Finalizar turno`.
- [ ] Confirmar que `POST /routes/:id/finish` finaliza a rota e limpa o estado local.
- [ ] Abrir historico no app e conferir a rota finalizada.

## Ordem De Servico

- [ ] Abrir aba `OS`.
- [ ] Escolher uma OS pendente atribuida ao funcionario.
- [ ] Informar KM inicial.
- [ ] Tirar foto inicial do odometro.
- [ ] Confirmar que o botao de iniciar permanece bloqueado ate o upload terminar.
- [ ] Iniciar OS e validar que o app recebeu `routeShiftId`.
- [ ] Confirmar envio de pontos da OS para `POST /routes/:id/points`.
- [ ] Marcar uma parada como concluida.
- [ ] Conferir no web que a parada mudou de status.
- [ ] Informar KM final.
- [ ] Tirar foto final do odometro.
- [ ] Finalizar OS e confirmar status `Finalizada`.

## Background Tracking

- [ ] Com a rota ativa, bloquear a tela por alguns minutos.
- [ ] Reabrir o app e verificar se novos pontos foram enviados.
- [ ] Alternar para outro app e retornar.
- [ ] Confirmar que o tracking para ao finalizar turno/OS.
- [ ] Confirmar que logout tambem para o tracking.

## Tema E UX

- [ ] Alternar tema claro/escuro.
- [ ] Confirmar persistencia do tema apos fechar e abrir o app.
- [ ] Validar que botoes, cards e status ficam legiveis no iPhone e no navegador.
- [ ] Validar feedback de loading, sucesso e erro nos fluxos de GPS e upload.

## Observacoes

- [ ] Em dispositivo fisico, `localhost` nao aponta para a API do computador. Use o IP local da maquina.
- [ ] Para Storage de odometro, a API precisa de `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_STORAGE_BUCKET`.
- [ ] Em builds finais iOS/Android, validar permissoes de localizacao background em build EAS/development build.
