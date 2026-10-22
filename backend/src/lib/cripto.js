// Primitivas criptográficas. Solo usa node:crypto (sin dependencias) y recibe las claves
// por parámetro para poder probarlo aislado (ver test/cripto.test.js).
import crypto from 'node:crypto';

const VERSION = 'v1';

/** Cifra texto con AES-256-GCM. Resultado: "v1.<iv>.<tag>.<datos>" en base64url. */
export function cifrar(texto, clave) {
  if (texto === null || texto === undefined) return null;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', clave, iv);
  const datos = Buffer.concat([c.update(String(texto), 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), datos.toString('base64url')].join('.');
}

/** Descifra y verifica integridad. Lanza error si el dato fue alterado o la clave no coincide. */
export function descifrar(paquete, clave) {
  if (!paquete) return null;
  const [version, iv, tag, datos] = String(paquete).split('.');
  if (version !== VERSION || !iv || !tag || datos === undefined) throw new Error('Dato cifrado inválido');
  const d = crypto.createDecipheriv('aes-256-gcm', clave, Buffer.from(iv, 'base64url'));
  d.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([d.update(Buffer.from(datos, 'base64url')), d.final()]).toString('utf8');
}

/** "Hash ciego": HMAC-SHA256 determinista para buscar/indexar sin guardar el dato. */
export function hashCiego(valor, clave, contexto = '') {
  if (valor === null || valor === undefined || valor === '') return null;
  return crypto.createHmac('sha256', clave).update(`${contexto}:${valor}`).digest('base64url');
}

export const sha256 = (v) => crypto.createHash('sha256').update(v).digest('base64url');

export const tokenAleatorio = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

/** Comparación en tiempo constante (evita ataques de tiempo). */
export function igualesSeguro(a, b) {
  const ba = Buffer.from(String(a ?? ''));
  const bb = Buffer.from(String(b ?? ''));
  if (ba.length !== bb.length) {
    crypto.timingSafeEqual(ba, ba); // gasta el mismo tiempo
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
}

/** Firma una URL de archivo con vencimiento. */
export function firmar(nombre, exp, clave) {
  return crypto.createHmac('sha256', clave).update(`${nombre}.${exp}`).digest('base64url');
}

/** Elimina caracteres de control e invisibles que se usan para engañar (RTL override, etc.). */
export function limpiarTexto(s) {
  return String(s)
    .normalize('NFC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g, '')
    .trim();
}
