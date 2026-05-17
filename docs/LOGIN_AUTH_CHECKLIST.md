# Login e autenticacao - checkpoint

Data do checkpoint: 2026-05-17.

## Escopo

Validar o fluxo de login do LocalTrak Rotas em backend NestJS, web Next.js,
mobile Expo e deploy Vercel, sem adicionar funcionalidades novas.

## Credenciais de teste

Use somente em ambiente de teste:

| Perfil | E-mail | Senha | Acesso esperado |
| --- | --- | --- | --- |
| MASTER_ADMIN | `admin@localtrak.test` | `ChangeMe123!` | Painel master web |
| COMPANY_ADMIN | `admin@empresateste.com` | `Senha123!` | Painel da empresa web |
| EMPLOYEE | `funcionario@empresateste.com` | `Senha123!` | App mobile |

## Endpoints validados

| Endpoint | Metodo | Status localhost |
| --- | --- | --- |
| `/health` | GET | OK, database connected |
| `/auth/login` | POST | OK para os 3 perfis |
| `/auth/refresh` | POST | OK para os 3 perfis |
| `/auth/logout` | POST | OK para os 3 perfis |

## Resultado localhost

- `pnpm build:api`: OK.
- `pnpm build:web`: OK.
- `pnpm typecheck:mobile`: OK.
- `pnpm build:mobile`: OK.
- Seed Supabase: OK.
- Usuarios de teste existem na tabela `users`: OK.
- `passwordHash`/`password_hash` nao retorna no login: OK.
- Access token retorna no login: OK.
- Refresh token retorna no login: OK.
- Refresh token gera nova sessao: OK.
- CORS local aceitou `http://localhost:3000`: OK.
- CORS local aceitou `http://localhost:8081`: OK.

## Resultado Vercel/producao

- Web Vercel carrega: `https://localtrak-web.vercel.app/login`.
- Mobile Web Vercel carrega: `https://localtrak-mobile.vercel.app`.
- O bundle publicado aponta a API para `https://localtrak-api.onrender.com`.
- A API publica candidata retorna `404` em:
  - `GET /health`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `OPTIONS /auth/login`
- Portanto, o login em localhost esta funcional, mas o login no deploy Vercel
  fica bloqueado ate a API publica ser publicada corretamente.

## Comandos para repetir o teste local

```powershell
pnpm prisma:seed
pnpm build:api
pnpm build:web
pnpm typecheck:mobile
pnpm build:mobile
pnpm start:api
```

Em outro terminal:

```powershell
$api = "http://localhost:3333"
Invoke-RestMethod "$api/health"

$body = @{ email = "admin@localtrak.test"; password = "ChangeMe123!" } | ConvertTo-Json
Invoke-RestMethod "$api/auth/login" -Method Post -ContentType "application/json" -Body $body
```

## Checklist para liberar login em producao

- [ ] Publicar a API NestJS em Render/Railway/VPS ou outro host Node persistente.
- [ ] Confirmar que a URL publica da API responde `GET /health`.
- [ ] Confirmar que `POST /auth/login` responde no host publico.
- [ ] Configurar `CORS_ORIGINS` da API com:
  - `https://localtrak-web.vercel.app`
  - `https://localtrak-mobile.vercel.app`
- [ ] Configurar no Vercel Web `NEXT_PUBLIC_API_URL` apontando para a API saudavel.
- [ ] Configurar no Vercel Mobile `EXPO_PUBLIC_API_URL` e `NEXT_PUBLIC_API_URL`
  apontando para a API saudavel.
- [ ] Redeploy web e mobile apos alterar variaveis publicas.
- [ ] Testar login MASTER_ADMIN no Vercel web.
- [ ] Testar login COMPANY_ADMIN no Vercel web.
- [ ] Testar bloqueio de EMPLOYEE no painel web.
- [ ] Testar login EMPLOYEE no mobile/Expo web.

## Observacoes tecnicas

- O backend nao usa Supabase Auth neste fluxo; Supabase e usado como PostgreSQL.
- JWT e roles sao validados pela API NestJS.
- O frontend web salva a sessao em `localStorage`; para producao comercial,
  avaliar migracao futura para cookie seguro HTTP-only.
- A tela de login web ainda vem com credenciais de teste preenchidas. Remover
  antes de divulgar o prototipo publicamente.
