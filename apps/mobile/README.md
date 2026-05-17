# LocalTrak Rotas Mobile

Aplicativo React Native com Expo para funcionarios externos.

## MVP implementado

- Login usando `POST /auth/login`.
- Acesso exclusivo para usuarios `EMPLOYEE`.
- Sessao persistida no dispositivo.
- Tela inicial com nome, empresa, status, iniciar turno e historico.
- Inicio de turno com permissao de localizacao foreground e `POST /routes/start`.
- Captura de localizacao com o app aberto usando `expo-location`.
- Rastreamento em segundo plano com `expo-task-manager` enquanto houver rota ativa.
- Envio de pontos para `POST /routes/:id/points`.
- Finalizacao de turno com `POST /routes/:id/finish`.
- Finalizacao resiliente com timeout de GPS e uso da ultima localizacao conhecida.
- Resumo da rota finalizada.
- Historico em `GET /routes/my-history`.

Fila offline ainda nao faz parte deste MVP.

## Configurar API local

No emulador Android, use:

```powershell
$env:EXPO_PUBLIC_API_URL="http://10.0.2.2:3333"
pnpm --filter @localtrak/mobile start
```

No Expo Go em celular fisico, use o IP da maquina na rede local:

```powershell
$env:EXPO_PUBLIC_API_URL="http://192.168.0.10:3333"
pnpm --filter @localtrak/mobile start
```

No navegador/web local:

```powershell
$env:EXPO_PUBLIC_API_URL="http://localhost:3333"
pnpm --filter @localtrak/mobile exec expo start --web --clear --port 8081
```

Abra `http://localhost:8081`.

## Rodar

```powershell
pnpm install
pnpm --filter @localtrak/mobile start
```

Leia o QR Code com Expo Go. A API precisa estar rodando e acessivel pelo endereco definido em `EXPO_PUBLIC_API_URL`.

## Validar dependencias e bundle

```powershell
pnpm --filter @localtrak/mobile exec expo install --check
pnpm --filter @localtrak/mobile typecheck
pnpm --filter @localtrak/mobile exec expo export --platform web
```

O projeto usa `react-native-web`, `react-dom` e `react-native-svg` nas versoes instaladas pelo `expo install`, compativeis com o SDK Expo configurado.
