# ProAgro

> 👉 **Para actualizar todo y sacar el APK, sigan [PASOS-APK.md](PASOS-APK.md).** La instalación desde cero está en [GUIA-APK.md](GUIA-APK.md).

App móvil para pequeños agricultores de Ciudad Bolívar: clima y alertas, Mi Cultivo, Riego (FAO-56),
AgroBot con IA (texto y fotos), Estadísticas y Mercado sin intermediarios.

```
proagro/
├── backend/   API Node.js + Express + Prisma + PostgreSQL
└── mobile/    App React Native con Expo (Expo Router)
```

## Tecnologías (todas gratis)

| Capa | Tecnología | Nota |
|---|---|---|
| Móvil | React Native + **Expo SDK 57** + Expo Router | Se prueba en el celular escaneando un QR |
| Backend | Node.js 20+ · Express 5 · Prisma 6 | |
| Base de datos | PostgreSQL 16 | Gratis en [Neon](https://neon.tech) o [Supabase](https://supabase.com) |
| IA | Google Gemini (con modelos de respaldo) | Llave gratis en [AI Studio](https://aistudio.google.com/apikey) |
| Clima | [Open-Meteo](https://open-meteo.com) + respaldo [MET Noruega](https://api.met.no) | Sin API key. Caché en la BD: si los dos fallan, se muestra el último dato |
| Fotos | Tabla `archivo` en PostgreSQL | No se pierden cuando Render se reinicia |
| Push | Expo Push | Gratis |
| Hosting API | [Render](https://render.com) o [Railway](https://railway.app) | Plan gratis |

---

## 1. Backend

Requisitos: **Node.js 20 o superior** y PostgreSQL (local con Docker o en Neon).

```bash
cd backend
npm install
cp .env.example .env          # en Windows: copy .env.example .env
npm run claves                # copia las 5 claves que imprime dentro de .env
```

Edita `.env`:
- `DATABASE_URL`: tu PostgreSQL. Con Docker:
  `docker run -d --name proagro-db -e POSTGRES_PASSWORD=proagro -p 5432:5432 postgres:16`
- `GEMINI_API_KEY`: tu llave de Google AI Studio.

Crea las tablas y arranca:

```bash
npx prisma migrate dev --name inicial
npm run dev
```

Debe decir `ProAgro API escuchando en http://localhost:4000`. Prueba: http://localhost:4000/api/salud

**Volverse administrador:** regístrate en la app y luego corre `npm run admin -- 3001234567` con tu celular.
No existe ninguna ruta de la API para hacerse admin.

### Pruebas

```bash
npm test     # lógica de riego y cifrado
```

Pruebas de seguridad de punta a punta: login, robo de tokens, IDOR, bloqueo, Marketplace. Crea una base de datos vacía SOLO para pruebas:

```bash
# crea la BD proagro_test y sus tablas
DATABASE_URL="postgresql://postgres:proagro@localhost:5432/proagro_test" npx prisma migrate deploy
TEST_DATABASE_URL="postgresql://postgres:proagro@localhost:5432/proagro_test" npm test
```

> ⚠️ Las pruebas de integración **borran todos los usuarios** de esa base. Nunca uses la de desarrollo.

---

## 2. App móvil

```bash
cd mobile
npm install
npx expo install --fix        # ajusta versiones exactas al SDK
cp .env.example .env
```

En `.env` pon la **IP de tu computador** (no `localhost`). Para verla: `ipconfig` en Windows o `ifconfig` en Mac/Linux.

```
EXPO_PUBLIC_API_URL="http://192.168.1.50:4000/api"
```

```bash
npx expo start
```

Escanea el QR con **Expo Go** (Android) o con la cámara (iPhone). El celular y el computador deben estar en el mismo WiFi.

> **Si Expo Go dice que el proyecto es de un SDK viejo:** Expo Go solo abre la última versión del SDK.
> Actualiza con `npx expo install expo@latest && npx expo install --fix` y vuelve a correr `npx expo start`.

### Qué funciona en Expo Go y qué necesita un "development build"

| Función | Expo Go | Development build |
|---|---|---|
| Registro, login, cultivos, riego, AgroBot, estadísticas, mercado | ✅ | ✅ |
| Huella / Face ID | ✅ (Face ID solo en build) | ✅ |
| Notificaciones push | ❌ (Android) | ✅ |
| Continuar con Google / Microsoft | ❌ | ✅ |

Development build (una sola vez, gratis):

```bash
npm install -g eas-cli
eas login
eas init                      # crea el projectId (necesario para push)
eas build -p android --profile development
```

Instala el APK que te da EAS y luego usa `npx expo start --dev-client`.

### Configurar "Continuar con Google" y "Continuar con Microsoft" (opcional)

Mientras no llenes estas variables, los botones no aparecen. El registro con celular funciona igual.

**Google:** en [Google Cloud Console](https://console.cloud.google.com/apis/credentials) crea credenciales
OAuth: una para *Android* (paquete `co.proagro.app` + SHA-1 que te da `eas credentials`), una *iOS*
(bundle `co.proagro.app`) y una *Web*. Pon los IDs en `mobile/.env` y **los mismos IDs** separados por coma
en `GOOGLE_CLIENT_IDS` del backend.

**Microsoft:** en [Azure > Registros de aplicaciones](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps)
crea una app con cuentas "de cualquier organización y personales". Agrega la plataforma *Móvil* con el
redirect `proagro://auth`. Copia el *Application (client) ID* en `EXPO_PUBLIC_MICROSOFT_CLIENT_ID` y en
`MICROSOFT_CLIENT_ID` del backend.

---

## 3. Publicar el backend (producción)

1. Crea la BD en Neon y copia la URL con `?sslmode=require`.
2. En Render: *New Web Service* desde GitHub. Pon `backend` como carpeta raíz.
   - Build: `npm install && npx prisma migrate deploy`
   - Start: `npm start`
3. Variables de entorno: copia el `.env` con claves **nuevas** (`npm run claves`) y además:
   `NODE_ENV=production`, `PUBLIC_URL=https://tu-app.onrender.com`, `TRUST_PROXY=1`.
4. En la app: `EXPO_PUBLIC_API_URL=https://tu-app.onrender.com/api`. En producción la app no acepta `http://`.

> El plan gratis de Render "duerme" el servidor tras 15 min sin uso; la primera petición tarda ~30 s.
> Para que no se duerma, usen cron-job.org (ver Parte 5 de GUIA-APK.md).
> Las fotos se guardan en la base de datos (tabla `archivo`). Si algún día pasan de 1 GB de fotos,
> conviene moverlas a Cloudflare R2 (10 GB gratis).

---

## Mapa de casos de uso → código

| Caso de uso | Pantalla (mobile/app) | API (backend/src/routes) |
|---|---|---|
| CU-01 Registrarse | `(auth)/registro.js` | `auth.js` POST /registro |
| CU-02 Iniciar sesión | `(auth)/ingresar.js`, `bienvenida.js` | `auth.js` POST /login, /oauth |
| CU-03 Clima y recomendaciones | `(app)/inicio.js`, `notificaciones.js` | `clima.js`, `notificaciones.js` |
| CU-04 Ver estadísticas | `(app)/estadisticas/*` | `estadisticas.js` |
| CU-05 Gestionar riego | `(app)/riego/*` | `riego.js` |
| CU-06 Consultar mercado | `(app)/mercado/*` | `mercado.js` |
| CU-07 Pantalla principal | `(app)/inicio.js` | — |
| CU-08 a CU-12 Mis cultivos | `(app)/mi-cultivo/*`, `agregar.js` | `cultivos.js` |
| CU-13 AgroBot | `(app)/agrobot.js` | `agrobot.js` |
| Administrador | (panel por hacer) | `admin.js` |

La seguridad está explicada en [SEGURIDAD.md](SEGURIDAD.md).
