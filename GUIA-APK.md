# Guía completa: instalar ProAgro, ponerlo en internet y sacar el APK

Son 4 partes. Háganlas en orden y no pasen a la siguiente hasta que la anterior funcione.

| Parte | Qué logran | Tiempo |
|---|---|---|
| 1 | La app funcionando en su computador y su celular | 30 min |
| 2 | El código guardado en GitHub (privado) | 10 min |
| 3 | El servidor en internet con Render (gratis, con https) | 15 min |
| 4 | El APK con EAS Build y un enlace para descargarlo | 30 min |
| 5 | Servidor siempre despierto (gratis, con cron-job.org) | 5 min |

Necesitan a mano:
- 🔑 la **cadena de conexión de Neon** (neon.tech → su proyecto → **Connect**);
- 🔑 la **llave de Gemini** (aistudio.google.com/apikey);
- la **IP de su computador** (en una terminal: `ipconfig` → "Dirección IPv4").

---

## PARTE 1 · Instalar y probar en su computador

### 1.1 Si ya tenían el proyecto: guarden sus `.env`
Copien estos dos archivos al **Escritorio** (son sus claves y no vienen en el zip):
- `C:\proyectos\proagro\backend\.env`
- `C:\proyectos\proagro\mobile\.env`

Luego **borren** la carpeta `C:\proyectos\proagro`.

### 1.2 Descomprimir
1. Clic derecho sobre **`proagro.zip`** → **Extraer todo...**
2. Borren la ruta que aparece y escriban `C:\proyectos` → **Extraer**.
3. Comprueben que existan `C:\proyectos\proagro\backend` y `C:\proyectos\proagro\mobile`.
4. Si guardaron sus `.env` en el paso 1.1, péguenlos otra vez en `backend` y en `mobile`.

### 1.3 Abrir en VS Code
**File → Open Folder...** → escriban `C:\proyectos\proagro` → **Seleccionar carpeta**.

### 1.4 Servidor (terminal 1)
Abran una terminal (**Terminal → New Terminal**):
```powershell
cd C:\proyectos\proagro\backend
npm install
```
**Solo si NO tenían `.env`:**
```powershell
copy .env.example .env
npm run claves
```
Abran `backend\.env` y:
- reemplacen las 5 líneas de claves por las que imprimió `npm run claves`;
- `DATABASE_URL="..."` = su cadena de Neon;
- `GEMINI_API_KEY="..."` = su llave de Gemini;
- `PUBLIC_URL="http://SU_IP:4000"` (su IP, **no** localhost).

Guarden (**Ctrl + S**) y luego:
```powershell
npx prisma db push
npm run diagnostico
npm run dev
```
✅ Debe decir **"ProAgro API escuchando en http://localhost:4000"**. Dejen esta terminal abierta.

### 1.5 App (terminal 2)
Abran otra terminal con el botón **+**:
```powershell
cd C:\proyectos\proagro\mobile
npm install --legacy-peer-deps
npx expo install --fix
```
**Solo si NO tenían `.env`:** `copy .env.example .env` y en `mobile\.env`:
```
EXPO_PUBLIC_API_URL="http://SU_IP:4000/api"
```
Arranquen:
```powershell
npm start
```
Escaneen el QR con **Expo Go**. ✅ Regístrense, agreguen un cultivo con foto y pregúntenle algo a AgroBot.

> Si el celular no conecta: apaguen la VPN del navegador o del celular, y revisen que estén en el mismo WiFi.

---

## PARTE 2 · Subir el código a GitHub

### 2.1 Instalar Git (una vez)
```powershell
winget install --id Git.Git
```
Cierren y vuelvan a abrir VS Code.

### 2.2 Crear el repositorio
1. En **github.com** (creen una cuenta si no tienen): **+ → New repository**.
2. Nombre: `proagro` · marquen **Private** 🔒 · **Create repository**.
3. Copien la dirección que termina en **`.git`**.

### 2.3 Subir
En una terminal:
```powershell
cd C:\proyectos\proagro
git init
git add .
git commit -m "ProAgro"
git branch -M main
git remote add origin PEGUEN_LA_DIRECCION.git
git push -u origin main
```
Si se abre el navegador para iniciar sesión en GitHub, acepten.

✅ En github.com deben ver las carpetas `backend` y `mobile`. Los `.env` y `node_modules` **no** se suben (el `.gitignore` los excluye).

> Si `git commit` pide nombre y correo, corran primero:
> `git config --global user.name "Su Nombre"` y `git config --global user.email "su@correo.com"`

---

## PARTE 3 · Servidor en internet (Render)

### 3.1 Crear el servicio
1. Entren a **render.com** → **Get Started** → regístrense **con GitHub**.
2. **New + → Web Service** → elijan el repositorio **proagro** → **Connect**.
3. Llenen así:

| Campo | Valor |
|---|---|
| Name | `proagro-api` |
| Region | Oregon (US West) o Virginia (US East) |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime / Language | `Node` |
| Build Command | `npm install && npx prisma db push` |
| Start Command | `npm start` |
| Instance Type | **Free** |

### 3.2 Variables de entorno
En **Environment Variables** pulsen **Add from .env** y peguen **todo** el contenido de su `backend\.env`. Después **cambien** estas tres (o agréguenlas si no están):
```
NODE_ENV=production
TRUST_PROXY=1
PUBLIC_URL=https://proagro-api.onrender.com
```

### 3.3 Publicar
Pulsen **Deploy Web Service** y esperen unos 5 minutos, hasta que arriba diga **Live** 🟢.

Arriba a la izquierda aparece su dirección real, por ejemplo `https://proagro-api.onrender.com`. **Si es distinta** (por ejemplo `proagro-api-x1y2.onrender.com`), vayan a **Environment**, corrijan `PUBLIC_URL` con esa dirección y guarden; Render se reinicia solo.

### 3.4 Probar
En el navegador:
```
https://SU-DIRECCION.onrender.com/api/salud
```
✅ Debe salir `{"ok":true}`.

> El plan gratis "duerme" el servidor tras 15 minutos sin uso: la primera vez tarda entre 30 y 50 segundos en responder.

---

## PARTE 4 · Sacar el APK (EAS Build)

### 4.1 Cuenta de Expo
Creen una cuenta gratis en **expo.dev** (**Sign up**).

### 4.2 Instalar la herramienta e iniciar sesión
```powershell
cd C:\proyectos\proagro\mobile
npm install -g eas-cli
eas login
```
Escriban el correo (o usuario) y la contraseña de expo.dev.

### 4.3 Vincular el proyecto
```powershell
eas init
```
Si pregunta *"Would you like to create a project for @usuario/proagro?"*, respondan **Y**. Esto agrega el `projectId` al archivo `app.json` automáticamente.

### 4.4 Poner la dirección del servidor en el APK
Abran **`mobile\eas.json`**. Debe verse así; si su dirección de Render es otra, cámbienla (con `/api` al final):
```json
"env": { "EXPO_PUBLIC_API_URL": "https://proagro-api.onrender.com/api" }
```
Guarden. (EAS **no** lee su `.env`; usa esta línea.)

### 4.5 Construir
```powershell
npm run apk
```
Respondan así a las preguntas:
- *"Generate a new Android Keystore?"* → **Y**
- Cualquier otra pregunta sobre crear o configurar algo → **Y**

La app se construye en los servidores de Expo. En el plan gratis hay fila: tarda entre **10 y 40 minutos**. Pueden cerrar la terminal; el avance también se ve en **expo.dev → su proyecto → Builds**.

### 4.6 Descargar e instalar
Al terminar aparece un **enlace** y un **código QR** 📱 (también en expo.dev → Builds → **Install**).
1. Abran el enlace en un celular **Android**.
2. Descarguen el `.apk` y ábranlo.
3. Si Android avisa *"instalar apps desconocidas"*, pulsen **Configuración → Permitir de esta fuente**.
4. **Instalar** → **Abrir**. ✅

Ese mismo enlace se lo pueden mandar a cualquier persona con Android.

---

## PARTE 5 · Mantener el servidor despierto (gratis)

Render gratis "duerme" el servidor tras 15 minutos sin uso. Para evitarlo, un servicio gratuito lo visita cada 10 minutos.

1. Entren a **cron-job.org** → **Sign up** y creen una cuenta gratis (confirmen el correo).
2. Pulsen **Create cronjob**.
3. Llenen así:
   - **Title:** `ProAgro despierto`
   - **URL:** `https://proagro-api.onrender.com/api/salud`
   - **Execution schedule:** **Every 10 minutes**
4. **Create**. ✅ En unos minutos, en el historial del cronjob deben salir visitas con **200 OK**.

> Esta ruta no toca la base de datos, así que no gasta horas de Neon. Un solo servidor encendido todo el mes usa unas 744 horas, y Render regala 750: **no creen otro servicio gratis en la misma cuenta de Render**.

---

## Cuando cambien el código
- **Servidor:** `git add .` → `git commit -m "cambio"` → `git push`. Render se actualiza solo.
- **App:** sube el número de `"version"` en `mobile\app.json` (por ejemplo `1.0.1`) y vuelvan a correr `npm run apk`.

## Problemas comunes

| Problema | Solución |
|---|---|
| Render falla en el *Build* | Abran **Logs** y busquen la línea roja. Casi siempre es una variable mal pegada (`DATABASE_URL` o claves). |
| `Configuración inválida en .env` en Render | Falta una variable en **Environment**: comparen con su `.env`. |
| La app instalada dice "Sin conexión" | El servidor estaba dormido: esperen un minuto y reintenten. Si sigue, revisen la dirección en `eas.json` y `/api/salud` en el navegador. |
| Las fotos no se ven en el APK | `PUBLIC_URL` en Render debe ser exactamente la dirección `https://...onrender.com`. |
| `eas` no se reconoce | Cierren y abran VS Code después de `npm install -g eas-cli`. |

## Límites del plan gratis
- **Fotos:** se guardan en la base de datos de Neon (no en el disco de Render), así que no se pierden. Neon gratis da 1 GB: alcanza para unas 5.000 fotos.
- **Clima:** si Open-Meteo falla, el servidor usa MET Noruega; si los dos fallan, muestra el último dato guardado.
- **Notificaciones push en el APK:** requieren configurar Firebase (opcional). Las alertas siguen apareciendo en la campana 🔔 dentro de la app.
- **iPhone:** no usa APK. Haría falta una cuenta de Apple Developer (99 USD al año).
