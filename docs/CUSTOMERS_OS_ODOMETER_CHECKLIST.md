# Customers, OS, Maps And Odometer Checklist

Use este checklist para validar o fluxo incremental de clientes, enderecos, mapas e odometro da TrakFlow.

## Ambiente

- [ ] API com `DATABASE_URL` Supabase e `sslmode=require`.
- [ ] API com `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SECRET_KEY` e `SUPABASE_STORAGE_BUCKET`.
- [ ] API com `GOOGLE_MAPS_API_KEY` privada quando geocoding real for testado.
- [ ] Web com `NEXT_PUBLIC_API_URL` apontando para a API correta.
- [ ] Web com `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` restrita por dominio, ou fallback validado.
- [ ] Mobile com `EXPO_PUBLIC_API_URL` e, opcionalmente, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.

## Clientes

- [ ] Login como `COMPANY_ADMIN`.
- [ ] Criar cliente com endereco estruturado.
- [ ] Editar cliente sem alterar `companyId`.
- [ ] Buscar por nome, telefone, email, cidade ou CEP.
- [ ] Importar CSV com o template `name,email,phone,document,cep,street,number,complement,neighborhood,city,state,country,notes`.
- [ ] Confirmar que linhas invalidas aparecem no relatorio de importacao.
- [ ] Confirmar que `EMPLOYEE` nao gerencia clientes.

## OS Com Endereco

- [ ] Criar OS selecionando cliente cadastrado.
- [ ] Criar OS preenchendo CEP/endereco manualmente.
- [ ] Confirmar que latitude/longitude nao sao campos manuais na UI.
- [ ] Confirmar que a OS salva endereco completo e `geocodingStatus`.
- [ ] Confirmar que falha de geocoding nao impede a criacao da OS.

## Odometro

- [ ] Em `/empresa/configuracoes`, ativar foto e KM obrigatorios no inicio e fim.
- [ ] No mobile, tentar iniciar OS sem KM/foto e confirmar bloqueio.
- [ ] Enviar foto inicial valida e KM inicial.
- [ ] Confirmar registro em `odometer_photos` e arquivo no Supabase Storage privado.
- [ ] Finalizar OS com foto e KM final.
- [ ] Abrir detalhe da OS no web e confirmar fotos por URL assinada.
- [ ] Desativar obrigatoriedade e confirmar que o backend permite iniciar/finalizar sem foto/KM.

## Mapas

- [ ] Web exibe `GoogleMapPreview` no detalhe da OS quando ha lat/lng.
- [ ] Web exibe fallback com endereco e botao "Abrir no Google Maps" sem chave publica.
- [ ] Mobile abre Google Maps externo por coordenada quando existir lat/lng.
- [ ] Mobile abre Google Maps externo por endereco quando lat/lng estiver ausente.

## Seguranca

- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `DATABASE_URL` e JWT secrets nao aparecem no frontend/mobile.
- [ ] `COMPANY_ADMIN` nao acessa clientes, OS ou fotos de outra empresa.
- [ ] Upload rejeita imagem com MIME invalido ou tamanho acima do limite.
- [ ] Nomes de fotos incluem empresa, usuario, OS, etapa, timestamp e UUID.
