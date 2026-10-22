// Cabeceras seguras, HTTPS obligatorio y límites de peticiones.
import helmet from 'helmet';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { config } from '../config.js';

export const cabeceras = helmet({
  // Es una API JSON: nada de scripts, frames ni recursos externos.
  contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
  crossOriginResourcePolicy: { policy: 'same-site' },
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'no-referrer' },
});

/** En producción rechaza cualquier petición que no llegue por HTTPS. */
export function soloHttps(req, res, next) {
  if (config.produccion && !req.secure) return res.status(403).json({ error: 'Se requiere HTTPS' });
  next();
}

/** Las APIs no se guardan en caché (ni en el teléfono ni en proxies). */
export function sinCache(_req, res, next) {
  res.set('Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');
  next();
}

const porIp = (req) => ipKeyGenerator(req.ip);
const porUsuario = (req) => (req.user?.id ? `u:${req.user.id}` : ipKeyGenerator(req.ip));

const limitador = (minutos, limite, mensaje, keyGenerator = porIp, extra = {}) =>
  rateLimit({
    windowMs: minutos * 60 * 1000,
    limit: limite,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator,
    message: { error: mensaje, codigo: 'DEMASIADAS_PETICIONES' },
    skip: () => config.env === 'test' && !process.env.PROBAR_LIMITES,
    ...extra,
  });

// Nota: se guardan en memoria. Si despliegan varias instancias, usen un store de Redis.
export const limiteGeneral = limitador(1, 120, 'Demasiadas peticiones. Espera un momento');
export const limiteLogin = limitador(15, 10, 'Demasiados intentos. Espera 15 minutos', porIp, { skipSuccessfulRequests: true });
export const limiteRegistro = limitador(60, 5, 'Demasiados registros desde esta red. Intenta más tarde');
export const limiteRefresh = limitador(15, 60, 'Demasiadas renovaciones de sesión');
export const limiteSubidas = limitador(60, 40, 'Subiste demasiadas fotos. Intenta en una hora', porUsuario);
export const limiteAgroBot = limitador(1, 6, 'Estás enviando mensajes muy rápido. Espera un minuto', porUsuario);
export const limiteContacto = limitador(24 * 60, 25, 'Alcanzaste el máximo de contactos por hoy', porUsuario);
export const limitePublicar = limitador(24 * 60, 15, 'Alcanzaste el máximo de publicaciones por hoy', porUsuario);
export const limiteReportes = limitador(24 * 60, 10, 'Alcanzaste el máximo de reportes por hoy', porUsuario);
