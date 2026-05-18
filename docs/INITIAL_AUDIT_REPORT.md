# RelatÃ³rio de Auditoria Inicial - TrakFlow
ConsolidaÃ§Ã£o tÃ©cnica e mapeamento da arquitetura de mapas, storage e banco de dados para a nova fase operacional.

---

## 1. Como o mapa funciona hoje

### Web (Frontend Next.js)
O mapa na Web Ã© carregado de forma assÃ­ncrona (CSR) atravÃ©s do componente dinÃ¢mico `RouteMap.tsx`. 
- Ele utiliza a biblioteca **React-Leaflet** (`react-leaflet` e `leaflet`), que renderiza elementos de mapa baseados em tiles do **OpenStreetMap** (tiles pÃºblicos e gratuitos).
- Desenha a rota real do funcionÃ¡rio usando o componente `<Polyline>` do Leaflet a partir do histÃ³rico de coordenadas em `RoutePoint[]`.
- Posiciona marcadores (`CircleMarker`) para:
  - Ponto de inÃ­cio (`startPoint`) e fim (`endPoint`) da rota.
  - Ponto atual (`currentPosition`) em tempo real.
  - Paradas planejadas da Ordem de ServiÃ§o (`waypointPoints`) com estados visuais diferenciados para `PENDING` (laranja) e `COMPLETED` (verde).

### Mobile (React Native / Expo)
O aplicativo Mobile possui o componente `OrderMapPreview` definido diretamente no `App.tsx`:
- Detecta a plataforma: se for executado em ambiente Web (`Platform.OS === 'web'`) ou se os mÃ³dulos nativos do `react-native-maps` nÃ£o estiverem carregados, exibe uma tela de fallback em HTML com as informaÃ§Ãµes da prÃ³xima parada e um botÃ£o que abre o link de mapa externo no **OpenStreetMap** (`https://www.openstreetmap.org/?mlat=...`).
- Se executado de forma nativa no dispositivo (Android/iOS), ele carrega a biblioteca `react-native-maps`, desenhando a polilinha planejada/real e posicionando os pins de marcador nativos. Ele delega o renderizador para os mapas nativos do sistema operacional (Apple Maps no iOS e Google Maps no Android) sem forÃ§ar um provider especÃ­fico.

---

## 2. Onde OpenStreetMap estÃ¡ sendo usado

- **Web**: No arquivo [RouteMap.tsx](file:///c:/Users/Xavier/Documents/New%20project/localtrak-rotas/apps/web/src/components/RouteMap.tsx), onde a camada base (`<TileLayer>`) consome a URL de tiles pÃºblica e gratuita: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`.
- **Mobile**: No arquivo [App.tsx](file:///c:/Users/Xavier/Documents/New%20project/localtrak-rotas/apps/mobile/src/App.tsx), na funÃ§Ã£o `OrderMapPreview`, como link externo de fallback para visualizaÃ§Ã£o de coordenadas no navegador: `https://www.openstreetmap.org/?mlat=${firstCoordinate.latitude}&mlon=${firstCoordinate.longitude}`.

---

## 3. O que serÃ¡ substituÃ­do por Google Maps

- **Mobile (Expo / React Native)**:
  - O componente `MapView` nativo no aplicativo serÃ¡ configurado com o atributo `provider={PROVIDER_GOOGLE}` (importado de `react-native-maps`), garantindo que tanto no iOS quanto no Android a renderizaÃ§Ã£o utilize a engine do Google Maps de forma uniforme.
  - O redirecionamento de botÃµes externos passarÃ¡ a abrir no aplicativo oficial do Google Maps atravÃ©s do esquema de URL `https://www.google.com/maps/search/?api=1&query=LAT,LNG`.
- **Web (Next.js)**:
  - Nas telas de detalhes (`[id]` de OS, detalhe da rota finalizada e painel de histÃ³rico), utilizaremos o **Google Maps** (via API oficial ou embed/iframe leve).
  - O backend API NestJS centralizarÃ¡ todas as consultas de geocodificaÃ§Ã£o (Geocoding API privada) para evitar vazamento de chaves pÃºblicas.

---

## 4. Onde serÃ¡ mantido fallback

- **Web (Next.js)**:
  - Se a chave pÃºblica de ambiente `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` estiver ausente, exibiremos o endereÃ§o estruturado completo do cliente de forma elegante.
  - Disponibilizaremos o botÃ£o premium "Abrir no Google Maps" que redireciona externamente para o endereÃ§o de forma segura em nova aba (`https://www.google.com/maps/search/?api=1&query=ADDRESS_ENCODED`).
  - O mapa do OpenStreetMap/Leaflet continuarÃ¡ existindo como uma alternativa visual de alta fidelidade sem quebrar a tela do usuÃ¡rio.
- **Mobile (App)**:
  - Se a inicializaÃ§Ã£o do mapa nativo do Google Maps falhar ou a chave do app nÃ£o for reconhecida, o aplicativo lidarÃ¡ de forma elegante (com blocos `try-catch`) exibindo um cartÃ£o contendo as coordenadas, dados do endereÃ§o e botÃµes de atalho externo para o Google Maps via `Linking.openURL`.

---

## 5. As tabelas necessÃ¡rias no Prisma

Para implantar o novo fluxo robusto de clientes, odÃ´metro e configuraÃ§Ãµes, realizaremos a migraÃ§Ã£o com as seguintes tabelas e enums no [schema.prisma](file:///c:/Users/Xavier/Documents/New%20project/localtrak-rotas/apps/api/prisma/schema.prisma):

```prisma
enum GeocodingStatus {
  PENDING
  RESOLVED
  FAILED
  MANUAL
}

model Customer {
  id              String          @id @default(uuid())
  companyId       String
  company         Company         @relation(fields: [companyId], references: [id], onDelete: Cascade)
  name            String
  document        String?         // CPF ou CNPJ
  email           String?
  phone           String?
  address         String          // EndereÃ§o completo digitado/importado
  latitude        Decimal?        @db.Decimal(10, 8)
  longitude       Decimal?        @db.Decimal(11, 8)
  geocodingStatus GeocodingStatus @default(PENDING)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  stops           ServiceOrderStop[]

  @@index([companyId])
  @@map("customers")
}
```

### ConfiguraÃ§Ãµes de OdÃ´metro e OperaÃ§Ã£o (no modelo `Company`)
Para evitar joins desnecessÃ¡rios e manter as queries de tenant performÃ¡ticas, os seguintes campos booleanos serÃ£o adicionados diretamente no modelo **`Company`** (com defaults seguros):
- `requireOdometerStartPhoto`: Boolean @default(true)
- `requireOdometerFinishPhoto`: Boolean @default(true)
- `requireOdometerStartKm`: Boolean @default(true)
- `requireOdometerFinishKm`: Boolean @default(true)

### RelaÃ§Ã£o com `Customer` nas Paradas
Adicionaremos o campo opcional `customerId` na tabela `ServiceOrderStop` (`service_order_stops`) para conectar paradas ao cadastro de clientes, alÃ©m do enum `geocodingStatus` para controlar se o endereÃ§o de parada passou por resoluÃ§Ã£o de coordenadas com sucesso.

---

## 6. Por que o upload de odÃ´metro falha

A auditoria identificou os trÃªs principais gargalos que causam a quebra do upload de fotos do odÃ´metro em produÃ§Ã£o e ambiente local:
1. **AusÃªncia fÃ­sica do bucket `order-odometer` no Supabase Storage**: O cÃ³digo da API NestJS busca o bucket de nome `order-odometer` (ou definido na variÃ¡vel `SUPABASE_STORAGE_BUCKET`). Se esse bucket nÃ£o for fisicamente criado no painel do Supabase com as regras RLS corretas de leitura e gravaÃ§Ã£o para a `service_role`, o upload falharÃ¡ com erro `404 Not Found`.
2. **DefiniÃ§Ã£o de VariÃ¡veis de Ambiente no Backend**: O backend NestJS instancia o cliente do Supabase utilizando `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Em produÃ§Ã£o, caso estas variÃ¡veis estejam desconfiguradas, o backend lanÃ§a imediatamente uma exceÃ§Ã£o `ServiceUnavailableException`.
3. **LimitaÃ§Ã£o de Payload e ValidaÃ§Ã£o Base64**: A imagem capturada pela cÃ¢mera do celular Ã© enviada em JSON no campo `photoBase64`. Se o payload for maior que 5 MB ou nÃ£o puder ser devidamente processado devido a incompatibilidades de compressÃ£o no dispositivo mobile (especialmente Expo camera de alta resoluÃ§Ã£o sem redimensionamento), o NestJS recusa o JSON por exceder limites HTTP padrÃ£o de payload (`limit: '10mb'`), ou falha na validaÃ§Ã£o do DTO.

---

## 7. Onde estÃ£o os arquivos de storage

Os arquivos sÃ£o armazenados no **Supabase Storage**, sob o bucket privado configurado (padrÃ£o: `order-odometer`).
O caminho fÃ­sico (`path`) Ã© gerado dinamicamente para garantir isolamento absoluto por tenant e seguranÃ§a por funcionÃ¡rio:
```typescript
`${companyId}/${orderId}/${userId}/${stage}-${timestamp}-${randomUUID()}.${extension}`
```
- **`companyId`**: Chave principal que isola os dados da empresa (seguranÃ§a multi-tenant).
- **`orderId`**: Identificador da Ordem de ServiÃ§o vinculada.
- **`userId`**: Identificador do funcionÃ¡rio que efetuou o registro.
- **`stage`**: EstÃ¡gio do upload (`start` ou `finish`).
- **`timestamp`**: Marca de tempo formatada segura.
- **`randomUUID()`**: Garante que o nome do arquivo seja Ãºnico e impossÃ­vel de ser adivinhado ou sobrescrito.

---

## 8. As permissÃµes necessÃ¡rias

- **No Smartphone do FuncionÃ¡rio (Mobile)**:
  - **CameraPermission (`expo-image-picker` / `expo-camera`)**: ObrigatÃ³ria para ativar a cÃ¢mera nativa do dispositivo, tirar a foto legÃ­vel do odÃ´metro fÃ­sico e ler o arquivo de imagem.
  - **ForegroundLocationPermission (`expo-location`)**: Coleta a coordenada GPS precisa no exato momento da aÃ§Ã£o manual (iniciar turno, finalizar turno, iniciar OS, marcar parada, finalizar OS).
  - **BackgroundLocationPermission (`expo-location` em segundo plano)**: NecessÃ¡ria para coletar coordenadas em background Ã  medida que o motorista se desloca com o app fechado ou tela bloqueada. *Nota de LGPD: O rastreamento inicia no "Iniciar turno" e encerra no "Finalizar turno", com notificaÃ§Ãµes visÃ­veis constantes de que o tracking estÃ¡ em execuÃ§Ã£o.*
- **No Banco/Storage (Supabase)**:
  - Acesso irrestrito de gravaÃ§Ã£o para a API NestJS por meio da `service_role` no bucket `order-odometer`.
  - PermissÃµes de leitura pÃºblica ou URLs assinadas de curta duraÃ§Ã£o (`createSignedUrl` de 1 hora) para exibiÃ§Ã£o segura das fotos no frontend sem expor o bucket de forma pÃºblica.

---

## 9. VariÃ¡veis de ambiente configuradas local e prod

### Backend API NestJS (`apps/api/.env`)
- `DATABASE_URL` â€” String de conexÃ£o PostgreSQL do Supabase.
- `JWT_SECRET` e `JWT_REFRESH_SECRET` â€” Segredos para criptografia de tokens.
- `SUPABASE_URL` â€” Endpoint pÃºblico do projeto Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` â€” Chave privada administrativa para burlar RLS no storage e realizar uploads com seguranÃ§a.
- `SUPABASE_STORAGE_BUCKET` â€” Nome do bucket (padrÃ£o: `order-odometer`).
- `GOOGLE_MAPS_API_KEY` â€” Chave privada restrita para o backend consumir a API de Geocoding com seguranÃ§a.

### Frontend Web Next.js (`apps/web/.env.local`)
- `NEXT_PUBLIC_API_URL` â€” Endpoint da API NestJS de produÃ§Ã£o (`https://localtrak-api.onrender.com`) ou local.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` â€” Chave pÃºblica do Google Maps restrita por domÃ­nio (`localhost` em desenvolvimento e `localtrak-web.vercel.app` em produÃ§Ã£o).

### Mobile App Expo (`apps/mobile/src/lib/config.ts` e `app.json`)
- `API_URL` â€” URL da API NestJS.
- Chave nativa de API para Android e iOS configurada no `app.json`:
  - `expo.android.config.googleMaps.apiKey`
  - `expo.ios.config.googleMapsApiKey`

