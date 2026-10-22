# ProAgro: paso a paso para que todo funcione y sacar el APK

## Parte 0: guardar sus claves
1. Copien `C:\proyectos\proagro\backend\.env` al Escritorio y renómbrenlo `backend.env`.
2. Copien `C:\proyectos\proagro\mobile\.env` al Escritorio y renómbrenlo `mobile.env`.

## Parte 1: poner el código nuevo
1. Cierren VS Code. Borren la carpeta `C:\proyectos\proagro`.
2. Clic derecho en `proagro.zip` → Extraer todo... → ruta `C:\proyectos` → Extraer.
3. Devuelvan las claves: `backend.env` → `C:\proyectos\proagro\backend\.env` y `mobile.env` → `C:\proyectos\proagro\mobile\.env`.
4. VS Code → File → Open Folder → `C:\proyectos\proagro`.
5. Terminal:
   ```
   cd C:\proyectos\proagro\backend
   npm install
   npx prisma db push
   npm run dev
   ```
6. Otra terminal:
   ```
   cd C:\proyectos\proagro\mobile
   npm install --legacy-peer-deps
   npx expo install --fix
   npx expo start --go -c
   ```

## Parte 2: subir el código a GitHub (privado)
1. Instalen Git: `winget install --id Git.Git` y reinicien VS Code.
2. github.com → + → New repository → nombre `proagro` → Private → Create. Copien la dirección `.git`.
3. Terminal:
   ```
   cd C:\proyectos\proagro
   git init
   git add .
   git commit -m "ProAgro"
   git branch -M main
   git remote add origin LA_DIRECCION.git
   git push -u origin main
   ```
   Los `.env` NO se suben (están en .gitignore).

## Parte 3: publicar el servidor en Render (gratis)
1. render.com → registrarse con GitHub → New → Web Service → repositorio `proagro`.
2. Datos:
   - Name: `proagro-api`
   - Root Directory: `backend`
   - Runtime: Node
   - Build Command: `npm install && npx prisma db push`
   - Start Command: `npm start`
   - Instance Type: Free
3. Environment Variables → Add from .env → peguen todo su `backend\.env` y cambien:
   ```
   NODE_ENV=production
   PUBLIC_URL=https://proagro-api.onrender.com
   TRUST_PROXY=1
   ```
   (PUBLIC_URL = la dirección que Render les muestre arriba).
4. Deploy → esperen "Live". Prueben `https://proagro-api.onrender.com/api/salud` → `{"ok":true}`.

## Parte 4: generar el APK con EAS (gratis)
1. Cuenta en expo.dev.
2. Terminal:
   ```
   cd C:\proyectos\proagro\mobile
   npm install -g eas-cli
   eas login
   eas init
   ```
3. Abran `mobile\eas.json` y cambien las DOS líneas `https://CAMBIAR-POR-SU-SERVIDOR.onrender.com/api` por su dirección de Render + `/api`.
4. Generen el APK:
   ```
   eas build -p android --profile preview
   ```
   "Generate a new Android Keystore?" → Y. Tarda 10–30 min.
5. Al final sale un enlace y un QR: ábranlo en Android, descarguen e instalen el APK
   (acepten "instalar apps de origen desconocido").

## Notas
- Render gratis se duerme tras 15 min sin uso: la primera petición tarda ~50 s.
- Las fotos se borran cuando Render redespliega (plan gratis).
- Push en el APK requiere configurar Firebase (opcional); las alertas siguen en la campana.
- Si cambian algo del servidor: `git add .`, `git commit -m "cambio"`, `git push` y Render se actualiza solo.
- Si cambian algo de la app: repetir `eas build -p android --profile preview`.
