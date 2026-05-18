# TrakFlow Web

Painel administrativo em Next.js para o MVP do TrakFlow.

## Variaveis De Ambiente

```env
NEXT_PUBLIC_API_URL=http://localhost:3333
```

## Rotas Implementadas

- `/login`
- `/master/dashboard`
- `/master/empresas`
- `/master/empresas/nova`
- `/empresa/dashboard`
- `/empresa/funcionarios`
- `/empresa/funcionarios/novo`

## Comandos

Na raiz do monorepo:

```bash
pnpm dev:web
pnpm build:web
```

Dentro de `apps/web`:

```bash
pnpm dev
pnpm build
```
