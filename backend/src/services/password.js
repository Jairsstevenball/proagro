// Contraseñas con Argon2id (recomendación OWASP 2024+) + "pepper" secreto del servidor.
// Aunque roben la base de datos, sin el pepper del .env los hashes no sirven.
import { hash, verify } from '@node-rs/argon2';
import { config } from '../config.js';

const OPCIONES = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
  secret: config.pepper,
};

export const hashContrasena = (pw) => hash(pw, OPCIONES);

// Hash falso para gastar el mismo tiempo cuando el usuario no existe (evita adivinar cuentas).
let hashFalso;
export async function verificarContrasena(pw, hashGuardado) {
  if (!hashGuardado) {
    hashFalso ??= await hash('contrasena-falsa-para-tiempo-constante', OPCIONES);
    await verify(hashFalso, pw, { secret: config.pepper }).catch(() => false);
    return false;
  }
  try {
    return await verify(hashGuardado, pw, { secret: config.pepper });
  } catch {
    return false;
  }
}

const COMUNES = new Set([
  '12345678', '123456789', '1234567890', 'password', 'password1', 'contrasena', 'contraseña',
  'qwerty123', 'abc12345', '11111111', '00000000', 'colombia', 'colombia1', 'bogota123',
  'proagro1', 'proagro123', 'agricultor', 'campo123', 'papa1234', 'iloveyou', 'admin123',
]);

/** Devuelve un mensaje de error o null si la contraseña es aceptable. */
export function problemaContrasena(pw, { documento, celular, nombre } = {}) {
  const s = String(pw || '');
  if (s.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (s.length > 128) return 'La contraseña es demasiado larga';
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(s) || !/\d/.test(s)) return 'La contraseña debe tener letras y números';
  if (/^(.)\1+$/.test(s)) return 'La contraseña no puede ser un solo carácter repetido';
  const baja = s.toLowerCase();
  if (COMUNES.has(baja)) return 'Esa contraseña es muy común. Elige otra';
  for (const dato of [documento, celular]) {
    if (dato && String(dato).length >= 4 && baja.includes(String(dato).toLowerCase())) {
      return 'La contraseña no debe contener tu documento ni tu celular';
    }
  }
  if (nombre && nombre.length >= 4 && baja.includes(nombre.toLowerCase())) return 'La contraseña no debe contener tu nombre';
  return null;
}
