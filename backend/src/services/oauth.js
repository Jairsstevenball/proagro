// "Continuar con Google / Microsoft" (pantalla de inicio del mockup).
// La app obtiene un ID token con expo-auth-session y lo envía aquí. El servidor NUNCA confía
// en lo que diga la app: verifica la firma del token contra las llaves públicas del proveedor,
// el emisor, la audiencia (nuestro client id), el vencimiento y el nonce.
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from '../config.js';
import { HttpError } from '../lib/http.js';

const googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const microsoftJwks = createRemoteJWKSet(new URL('https://login.microsoftonline.com/common/discovery/v2.0/keys'));

async function verificarGoogle(idToken) {
  if (!config.googleClientIds.length) throw new HttpError(503, 'Ingreso con Google no está configurado');
  const { payload } = await jwtVerify(idToken, googleJwks, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: config.googleClientIds,
    algorithms: ['RS256'],
  });
  if (!payload.email_verified) throw new HttpError(401, 'Tu correo de Google no está verificado');
  return payload;
}

async function verificarMicrosoft(idToken) {
  if (!config.microsoftClientId) throw new HttpError(503, 'Ingreso con Microsoft no está configurado');
  const { payload } = await jwtVerify(idToken, microsoftJwks, {
    audience: config.microsoftClientId,
    algorithms: ['RS256'],
  });
  // Cuentas multi-inquilino: el emisor debe corresponder al tenant del token.
  if (!payload.tid || payload.iss !== `https://login.microsoftonline.com/${payload.tid}/v2.0`) {
    throw new HttpError(401, 'Token de Microsoft inválido');
  }
  return payload;
}

/** Devuelve { sub, correo, nombre, apellido } verificados. */
export async function verificarIdToken(proveedor, idToken, nonce) {
  let p;
  try {
    p = proveedor === 'google' ? await verificarGoogle(idToken) : await verificarMicrosoft(idToken);
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(401, 'No pudimos verificar tu cuenta. Intenta de nuevo');
  }
  if (nonce && p.nonce !== nonce) throw new HttpError(401, 'No pudimos verificar tu cuenta. Intenta de nuevo');
  return {
    sub: p.sub,
    correo: p.email || p.preferred_username || null,
    nombre: p.given_name || p.name?.split(' ')[0] || '',
    apellido: p.family_name || p.name?.split(' ').slice(1).join(' ') || '',
  };
}
