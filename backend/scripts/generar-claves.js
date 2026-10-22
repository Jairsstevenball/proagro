// Genera claves aleatorias seguras para el .env.  Uso: npm run claves
import crypto from 'node:crypto';

const b64 = () => crypto.randomBytes(32).toString('base64');
console.log(`# Pega estas líneas en tu .env (cada entorno debe tener claves DISTINTAS)
JWT_SECRET="${crypto.randomBytes(48).toString('base64url')}"
DATA_KEY="${b64()}"
INDEX_KEY="${b64()}"
FILE_KEY="${b64()}"
PASSWORD_PEPPER="${crypto.randomBytes(32).toString('base64url')}"`);
