# MOBILE_TEST_CHECKLIST.md

Checklist manual do app mobile LocalTrak Rotas em React Native/Expo.

## Pre-condicoes

- API NestJS rodando e conectada ao Supabase.
- `GET /health` retornando:

```json
{
  "status": "ok",
  "database": "connected"
}
```

- Usuario `EMPLOYEE` de teste disponivel:
  - Email: `funcionario@empresateste.com`
  - Senha: `Senha123!`
- Rodar o app com:

```bash
pnpm dev:mobile
```

Para testar no navegador com cache limpo:

```bash
pnpm --filter @localtrak/mobile exec expo start --web --clear --port 8081
```

- [ ] Abrir `http://localhost:8081`.
- [ ] Confirmar que a tela de login carrega sem erro de import do `react-native-web`.

Se testar em celular fisico com Expo Go, configurar a API com o IP da maquina:

```powershell
$env:EXPO_PUBLIC_API_URL="http://192.168.0.10:3333"
pnpm --filter @localtrak/mobile exec expo start --clear
```

No emulador Android, normalmente use:

```powershell
$env:EXPO_PUBLIC_API_URL="http://10.0.2.2:3333"
pnpm --filter @localtrak/mobile exec expo start --clear
```

Validacoes tecnicas antes do teste manual:

```bash
pnpm --filter @localtrak/mobile typecheck
pnpm --filter @localtrak/mobile exec expo install --check
pnpm --filter @localtrak/mobile exec expo export --platform web
```

## 1. Login

- [ ] Abrir o app no Expo Go ou emulador.
- [ ] Confirmar que a tela de login exibe a API configurada.
- [ ] Confirmar que a logo atualizada aparece sem distorcao.
- [ ] Alternar tema claro/escuro e confirmar persistencia ao reabrir o app.
- [ ] Tentar login com `MASTER_ADMIN`.
- [ ] Confirmar mensagem: `Este acesso e exclusivo para funcionarios.`
- [ ] Tentar login com `COMPANY_ADMIN`.
- [ ] Confirmar mensagem: `Este acesso e exclusivo para funcionarios.`
- [ ] Entrar com `funcionario@empresateste.com` e `Senha123!`.
- [ ] Confirmar entrada na tela inicial do funcionario.

## 2. Tela Inicial

- [ ] Confirmar nome do funcionario.
- [ ] Confirmar empresa vinculada ou `companyId`.
- [ ] Confirmar status inicial `Fora de rota`.
- [ ] Confirmar botao `Iniciar turno`.
- [ ] Confirmar aba ou botao de historico.

## 3. Iniciar Turno

- [ ] Tocar em `Iniciar turno`.
- [ ] Permitir localizacao foreground.
- [ ] Confirmar chamada ao backend `POST /routes/start`.
- [ ] Confirmar que o app salva o `routeId` localmente.
- [ ] Fechar/reabrir o app com rota ativa e confirmar recuperacao via `GET /routes/active`.
- [ ] Se `POST /routes/start` retornar conflito, confirmar que o app recupera a rota ativa em vez de ficar travado.
- [ ] Confirmar status `Em rota`.
- [ ] Confirmar cronometro ativo.

## 4. Enviar Pontos

- [ ] Manter o app aberto.
- [ ] Simular movimento no emulador ou caminhar com o aparelho.
- [ ] Confirmar aumento de `Pontos enviados`.
- [ ] Confirmar persistencia no Supabase em `route_points`.
- [ ] Confirmar que erros de rede aparecem como mensagem amigavel.

## 5. Finalizar Turno

- [ ] Tocar em `Finalizar turno`.
- [ ] Confirmar alerta de confirmacao.
- [ ] Confirmar chamada `POST /routes/:id/finish`.
- [ ] Confirmar status final `FINISHED`.
- [ ] Confirmar resumo com inicio, fim, tempo e km.
- [ ] Confirmar que o `routeId` local foi limpo.
- [ ] Confirmar que rota vinculada a OS so pode ser finalizada pela aba `OS`.

## 6. Historico

- [ ] Abrir `Historico`.
- [ ] Confirmar chamada `GET /routes/my-history`.
- [ ] Confirmar que a rota finalizada aparece na lista.
- [ ] Confirmar status, horario, distancia e duracao.

## 7. Logout

- [ ] Tocar em `Sair`.
- [ ] Confirmar retorno para login.
- [ ] Fechar e abrir o app.
- [ ] Confirmar que a sessao nao foi restaurada apos logout.

## 8. Validacao Backend Complementar

Com token de `EMPLOYEE`, os endpoints devem funcionar:

- [ ] `POST /routes/start`
- [ ] `POST /routes/:id/points`
- [ ] `POST /routes/:id/finish`
- [ ] `GET /routes/my-history`
- [ ] `GET /routes/active`

No Sprint 0, o fluxo HTTP desses endpoints foi validado com Supabase e criou rota finalizada com pontos persistidos.
