// Funciones de protección de datos personales ya conectadas a las claves del .env.
import { config } from '../config.js';
import { cifrar, descifrar, hashCiego, firmar, igualesSeguro } from './cripto.js';

export const normalizarCelular = (c) => {
  let d = String(c || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('57')) d = d.slice(2); // +57
  return d;
};
export const normalizarDocumento = (d) => String(d || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
export const normalizarCorreo = (c) => (c ? String(c).trim().toLowerCase() : null);

export const cifrarDato = (v) => cifrar(v, config.dataKey);
export const descifrarDato = (v) => descifrar(v, config.dataKey);

export const hashDocumento = (d) => hashCiego(normalizarDocumento(d), config.indexKey, 'documento');
export const hashCelular = (c) => hashCiego(normalizarCelular(c), config.indexKey, 'celular');
export const hashCorreo = (c) => hashCiego(normalizarCorreo(c), config.indexKey, 'correo');
export const hashOauth = (proveedor, sub) => hashCiego(`${proveedor}:${sub}`, config.indexKey, 'oauth');
export const hashIp = (ip) => hashCiego(ip || 'desconocida', config.indexKey, 'ip');

/** Campos cifrados + hashes listos para guardar en Prisma. */
export function camposPersonales({ documento, celular, correoElectronico }) {
  const datos = {};
  if (documento !== undefined) {
    datos.documentoCifrado = cifrarDato(normalizarDocumento(documento));
    datos.documentoHash = hashDocumento(documento);
  }
  if (celular !== undefined) {
    datos.celularCifrado = cifrarDato(normalizarCelular(celular));
    datos.celularHash = hashCelular(celular);
  }
  if (correoElectronico !== undefined) {
    const correo = normalizarCorreo(correoElectronico);
    datos.correoCifrado = correo ? cifrarDato(correo) : null;
    datos.correoHash = correo ? hashCorreo(correo) : null;
  }
  return datos;
}

/** Lo que el propio usuario puede ver de su cuenta (nunca hashes ni contraseña). */
export function usuarioPublico(u) {
  if (!u) return u;
  return {
    id: u.id,
    documento: descifrarDato(u.documentoCifrado),
    nombre: u.nombre,
    primerApellido: u.primerApellido,
    segundoApellido: u.segundoApellido,
    ubicacion: u.ubicacion,
    celular: descifrarDato(u.celularCifrado),
    correoElectronico: u.correoCifrado ? descifrarDato(u.correoCifrado) : null,
    proveedorAuth: u.proveedorAuth,
    tieneContrasena: Boolean(u.contrasena),
    rol: u.rol,
    fechaRegistro: u.fechaRegistro,
  };
}

/** Enmascara para el administrador: 300****567 */
export function enmascarar(v) {
  if (!v) return v;
  const s = String(v);
  if (s.length <= 4) return '****';
  return `${s.slice(0, 3)}${'*'.repeat(Math.max(2, s.length - 6))}${s.slice(-3)}`;
}

// ---------- URLs firmadas para fotos ----------
const NOMBRE_ARCHIVO = /^[a-f0-9]{32}\.jpg$/;
export const nombreValido = (n) => NOMBRE_ARCHIVO.test(String(n));

/** Convierte el nombre guardado en BD en una URL temporal (1 hora por defecto). */
export function urlFirmada(nombre, segundos = 3600) {
  if (!nombre || !nombreValido(nombre)) return null;
  const exp = Math.floor(Date.now() / 1000) + segundos;
  return `${config.publicUrl}/api/archivos/${nombre}?exp=${exp}&sig=${firmar(nombre, exp, config.fileKey)}`;
}

export function verificarFirma(nombre, exp, sig) {
  const e = Number(exp);
  if (!nombreValido(nombre) || !Number.isInteger(e) || e < Date.now() / 1000) return false;
  return igualesSeguro(firmar(nombre, e, config.fileKey), sig);
}
