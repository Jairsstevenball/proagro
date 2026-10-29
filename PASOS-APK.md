# ProAgro: todo, paso a paso, hasta el APK

Versión 1.3: clima con respaldo, fotos guardadas en la base de datos y diseño igual al mockup.

Háganlo en orden. **No pasen al siguiente paso hasta ver el ✅ del anterior.**

| Paso | Qué hacen | Tiempo |
|---|---|---|
| 0 | Guardar sus claves | 2 min |
| 1 | Poner el código nuevo | 5 min |
| 2 | Actualizar el servidor y la base de datos | 10 min |
| 3 | Subir a GitHub (Render se actualiza solo) | 10 min |
| 4 | Servidor siempre despierto (cron-job.org) | 5 min |
| 5 | Probar en Expo Go | 10 min |
| 6 | Sacar el APK | 15 a 40 min |
| 7 | Instalar y revisar | 5 min |

---

## Paso 0 · Guardar sus claves (por si acaso)

1. Abran la carpeta `C:\proyectos\proagro\proagro\backend`.
2. Copien el archivo **`.env`** al **Escritorio** y cámbienle el nombre a `backend.env`.
3. Hagan lo mismo con `C:\proyectos\proagro\proagro\mobile\.env` → `mobile.env`.

> Si no ven los archivos `.env`: en el Explorador, **Ver → Mostrar → Elementos ocultos**.

---

## Paso 1 · Poner el código nuevo

⚠️ **NO borren la carpeta del proyecto.** Adentro está la conexión con GitHub (carpeta oculta `.git`).

1. Cierren VS Code.
2. Clic derecho en **`ProAgro-completo.zip`** → **Extraer todo...**
3. Borren la ruta que aparece y escriban exactamente: `C:\proyectos\proagro`
4. Pulsen **Extraer**. Si Windows pregunta, elijan **Reemplazar los archivos en el destino**.
5. Abran VS Code → **File → Open Folder...** → `C:\proyectos\proagro\proagro` → **Seleccionar carpeta**.

✅ A la izquierda deben ver `backend`, `mobile`, `PASOS-APK.md`. Revisen que `backend\.env` siga ahí (si no, peguen `backend.env` del Escritorio y renómbrenlo `.env`).

---

## Paso 2 · Servidor y base de datos

Abran una terminal: **Terminal → New Terminal**. Copien y peguen **una línea a la vez** y esperen a que termine:

```powershell
cd C:\proyectos\proagro\proagro\backend
npm install
npx prisma db push
```
✅ Debe decir **"Your database is now in sync"**. (Crea las tablas nuevas `archivo` y `clima_cache` en Neon. Si pregunta algo, respondan `y`.)

```powershell
npm run fotos:migrar
```
✅ Dice cuántas fotos copió (puede ser 0; no pasa nada).

```powershell
npm run diagnostico
```
✅ Deben salir ✅ en Gemini, en **Open-Meteo**, en **Respaldo MET Noruega** y en sharp.

---

## Paso 3 · Subir a GitHub

En la misma terminal:

```powershell
cd C:\proyectos\proagro\proagro
git add .
git commit -m "ProAgro 1.3: clima con respaldo, fotos en BD y diseno del mockup"
git push
```
✅ En **github.com** → su repositorio, deben ver el mensaje del commit arriba.

Ahora Render se actualiza solo:
1. Entren a **dashboard.render.com** → **proagro-api**.
2. Esperen a que arriba diga **Live** 🟢 (unos 5 minutos).
3. Abran en el navegador: `https://proagro-api.onrender.com/api/salud`

✅ Debe salir `{"ok":true}`.

> Si en Render sale **Failed**: pulsen **Logs**, busquen la línea roja y mándenme la captura.

---

## Paso 4 · Que el servidor no se duerma (gratis)

1. Entren a **cron-job.org** → **Sign up** → creen la cuenta y confirmen el correo.
2. Pulsen **Create cronjob**.
3. Llenen:
   - **Title:** `ProAgro despierto`
   - **URL:** `https://proagro-api.onrender.com/api/salud`
   - **Execution schedule:** **Every 10 minutes**
4. Pulsen **Create**.

✅ En unos minutos, en el historial del cronjob salen visitas con **200 OK**.

> No creen otro servicio gratis en Render: un servidor encendido todo el mes usa 744 de las 750 horas gratis.

---

## Paso 5 · Probar la app en Expo Go

### 5.1 Apuntar la app al servidor de internet
Abran `mobile\.env` y dejen esta línea así (es la misma dirección que usa el APK):
```
EXPO_PUBLIC_API_URL="https://proagro-api.onrender.com/api"
```
Guarden con **Ctrl + S**.

### 5.2 Instalar y arrancar
En la terminal:
```powershell
cd C:\proyectos\proagro\proagro\mobile
npm install --legacy-peer-deps
npx expo install --fix
node scripts/actualizar-app-json.js
npm start
```
✅ `actualizar-app-json` debe decir **"app.json listo. Versión 1.1.0"** (o una versión mayor).

Escaneen el QR con **Expo Go**. Revisen:
- [ ] Sale el **logo con laurel** mientras carga.
- [ ] Fondo de **mármol** con el logo suave detrás y títulos verdes.
- [ ] En Inicio, el **clima** sale sobre la foto de campo (sin "Error interno").
- [ ] Agregan un cultivo **con foto**, cierran Expo Go, lo abren otra vez: **la foto sigue ahí**.

Para detener: en la terminal **Ctrl + C**.

> Si Expo Go muestra el diseño viejo: ciérrenlo por completo (deslizar desde recientes) y escaneen otra vez.

---

## Paso 6 · Sacar el APK

### 6.1 Iniciar sesión en Expo (si ya lo hicieron antes, salta solo)
```powershell
eas login
```
Usuario: `balcolrde` y su contraseña de expo.dev.

> Si dice que `eas` no se reconoce: `npm install -g eas-cli`, cierren y abran VS Code, y repitan.

### 6.2 Vincular el proyecto
```powershell
eas init
```
- Si pregunta **"Existing project found... Link?"** o **"Would you like to create a project?"** → **Y**.
- Si dice que ya está vinculado, perfecto.

### 6.3 Construir
```powershell
npm run apk
```
Respondan:
- *"Generate a new Android Keystore?"* → **Y** (solo la primera vez; las siguientes usa la misma).
- Cualquier otra pregunta de crear o configurar algo → **Y**.

Tarda entre **10 y 40 minutos** (en el plan gratis hay fila). Pueden cerrar la terminal: el avance se ve en **expo.dev → proagro → Builds**.

✅ Al final aparece un **enlace** y un **código QR**.

> Si sale **Build failed**: en expo.dev pulsen el build → **See logs** → busquen la primera línea roja y mándenme la captura.

---

## Paso 7 · Instalar en el celular

1. Abran el enlace en el celular **Android** (o escaneen el QR con la cámara).
2. Pulsen **Install** → se descarga el `.apk` → ábranlo.
3. Si Android avisa *"instalar apps desconocidas"*: **Configuración → Permitir de esta fuente** → atrás.
4. **Instalar** (se instala encima de la versión anterior; no hace falta desinstalarla).
5. **Abrir**.

Revisión final:
- [ ] Ícono nuevo de ProAgro (la P con laurel) en el celular.
- [ ] Inicia sesión y se ve el diseño del mockup.
- [ ] El clima carga (la primera vez del día puede tardar unos segundos).
- [ ] Las fotos de cultivos, Mercado y AgroBot se quedan guardadas.

✅ **Listo.** Ese mismo enlace se lo pueden mandar a cualquier persona con Android.

---

## Problemas comunes

| Problema | Qué hacer |
|---|---|
| `npx prisma db push` da P1001 | Neon estaba dormido: esperen 10 segundos y repitan. |
| Render dice **Failed** | **Logs** → línea roja. Casi siempre es una variable mal pegada en **Environment**. |
| La app dice "Sin conexión" | Abran `https://proagro-api.onrender.com/api/salud` en el navegador; si tarda, el servidor estaba despertando. Revisen el Paso 4. |
| El clima dice "No pudimos consultar el clima" | Los dos servicios de clima fallaron y no había dato guardado. Esperen unos minutos y pulsen **Reintentar**. |
| Fotos viejas no aparecen | Las que se subieron antes de esta versión ya se habían borrado en Render. Vuelvan a subirlas. |
| `eas` no se reconoce | `npm install -g eas-cli` y reinicien VS Code. |
| EAS falla en "Install dependencies" | Revisen que exista `mobile\.npmrc` con `legacy-peer-deps=true` y que esté en GitHub. |

## Cuando cambien algo después
- **Solo servidor (backend):** `git add .` → `git commit -m "cambio"` → `git push`. Render se actualiza solo. No hace falta APK nuevo.
- **La app (mobile):** `git push` y luego `npm run apk` otra vez.

## Cambiar las fotos o la letra del diseño
- Fotos de campo: reemplacen `mobile\assets\img\campo.jpg`, `campo-atardecer.jpg` y `campo-gris.jpg` por las de Figma (mismo nombre).
- Letra de los títulos: reemplacen `mobile\assets\fonts\Titulo.otf` por otra fuente con el mismo nombre (por ejemplo "Lilita One" de Google Fonts).
