# ROUTES_MOBILE_CHECKLIST.md

Checklist manual para validar envio de rotas pelo app mobile LocalTrak Rotas.

## Pre-condicoes

- API rodando em `http://localhost:3333`.
- Para Expo Go em celular fisico, definir API com IP da maquina:

```powershell
$env:EXPO_PUBLIC_API_URL="http://SEU_IP_LOCAL:3333"
pnpm --filter @localtrak/mobile exec expo start --clear
```

- Usuario `EMPLOYEE` disponivel:
  - Email: `<SEED_EMPLOYEE_EMAIL>`
  - Senha: `<SEED_DEMO_PASSWORD>`

## 1. Login

- [ ] Abrir app no Expo Go, emulador ou navegador.
- [ ] Confirmar API exibida na tela de login.
- [ ] Entrar como `EMPLOYEE`.
- [ ] Tentar `MASTER_ADMIN` ou `COMPANY_ADMIN` e confirmar bloqueio.

## 2. Inicio De Turno

- [ ] Tocar em `Iniciar turno`.
- [ ] Autorizar localizacao durante uso.
- [ ] Em dispositivo nativo, autorizar localizacao em segundo plano quando solicitado.
- [ ] Confirmar criacao da rota em `POST /routes/start`.
- [ ] Confirmar primeiro ponto enviado para `POST /routes/:id/points`.
- [ ] Confirmar status `Em rota`.

## 3. Envio ContÃ­nuo De Pontos

- [ ] Manter app aberto e confirmar aumento de `Pontos enviados`.
- [ ] Colocar app em segundo plano e movimentar o aparelho.
- [ ] Reabrir app e confirmar que a rota segue ativa.
- [ ] Validar no painel web que novos pontos aparecem no mapa.
- [ ] Confirmar que a API persiste latitude, longitude, precisao, velocidade, altitude e horario quando disponiveis.

## 4. Finalizacao

- [ ] Tocar em `Finalizar turno`.
- [ ] Confirmar alerta nativo no Expo Go ou confirmacao do navegador no Expo web.
- [ ] Confirmar envio de ponto final.
- [ ] Confirmar chamada `POST /routes/:id/finish`.
- [ ] Confirmar resumo com km e duracao.
- [ ] Confirmar que o background tracking para.
- [ ] Confirmar que o `routeId` local foi limpo.
- [ ] Repetir o teste com GPS lento/instavel e confirmar que a rota finaliza usando ultima localizacao conhecida.

## 5. Historico

- [ ] Abrir `Historico`.
- [ ] Confirmar chamada `GET /routes/my-history`.
- [ ] Confirmar rota finalizada na lista.
- [ ] Confirmar status, km, duracao e veiculo quando houver.

## 6. Casos De Permissao E Ambiente

- [ ] Negar localizacao foreground e confirmar mensagem amigavel.
- [ ] Negar localizacao background e confirmar que o app avisa sobre limitacao.
- [ ] No iPhone, confirmar permissao `Sempre` nas configuracoes para teste de segundo plano.
- [ ] Confirmar que o app nao envia pontos depois de finalizar turno.

