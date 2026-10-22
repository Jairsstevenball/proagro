// Subida de fotos SEGURA:
//  1. Máximo 15 MB y un solo archivo, en memoria (nada toca el disco sin validar).
//  2. sharp DECODIFICA la imagen: si no es una imagen real (ej. un .exe renombrado), falla.
//  3. Se vuelve a codificar como JPEG: elimina metadatos EXIF (incluida la ubicación GPS
//     de la finca), scripts escondidos y archivos "políglotas".
//  4. Nombre aleatorio de 128 bits; el nombre original del usuario nunca se usa.
//  5. Se guarda fuera de cualquier carpeta pública y solo se sirve con URL firmada que vence.
import multer from 'multer';
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { HttpError } from '../lib/http.js';
import { nombreValido } from '../lib/proteccion.js';

export const UPLOAD_DIR = path.resolve(config.uploadDir);
fs.mkdirSync(UPLOAD_DIR, { recursive: true, mode: 0o700 });

const FORMATOS = new Set(['jpeg', 'png', 'webp', 'heif', 'avif']);

const multerFoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1, fields: 20, fieldSize: 8 * 1024, parts: 25 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|heic|heif|avif)$/.test(file.mimetype)) cb(null, true);
    else cb(new HttpError(400, 'Solo se permiten fotos (JPG, PNG o WEBP)'));
  },
});

/** Procesa la imagen y devuelve { nombre, buffer } listo para guardar. */
export async function procesarImagen(buffer) {
  let img;
  try {
    img = sharp(buffer, { limitInputPixels: 40_000_000, failOn: 'error' });
    const meta = await img.metadata();
    if (!FORMATOS.has(meta.format)) throw new Error('formato');
  } catch {
    throw new HttpError(400, 'El archivo no es una imagen válida');
  }
  const salida = await img
    .rotate() // respeta la orientación de la cámara antes de borrar el EXIF
    .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer(); // sharp NO copia metadatos salvo que se pida con withMetadata()
  return { nombre: `${crypto.randomBytes(16).toString('hex')}.jpg`, buffer: salida };
}

export async function guardarImagen(buffer) {
  const { nombre, buffer: limpio } = await procesarImagen(buffer);
  await fs.promises.writeFile(path.join(UPLOAD_DIR, nombre), limpio, { mode: 0o600, flag: 'wx' });
  return { nombre, buffer: limpio };
}

export async function borrarImagen(nombre) {
  if (!nombre || !nombreValido(nombre)) return;
  await fs.promises.unlink(path.join(UPLOAD_DIR, nombre)).catch(() => {});
}

const MAX_BASE64 = 14_000_000; // ~10 MB de imagen

function limpiarAlTerminar(req, res) {
  // Si la petición termina en error (validación, permisos), no dejamos la foto huérfana.
  res.on('finish', () => {
    if (res.statusCode >= 400 && req.foto) borrarImagen(req.foto.nombre);
  });
}

/**
 * Middleware de foto. Acepta dos formas:
 *  - JSON con el campo "fotoBase64" (lo que usa la app: evita un error de Android con multipart)
 *  - multipart/form-data con el campo "foto"
 * Deja req.foto = { nombre, buffer } o undefined si no enviaron foto.
 */
export function subirFoto(campo = 'foto') {
  const unico = multerFoto.single(campo);
  return (req, res, next) => {
    if (req.is('application/json')) {
      const b64 = req.body?.fotoBase64;
      if (req.body) delete req.body.fotoBase64; // el validador estricto no debe verlo
      if (!b64) return next();
      if (typeof b64 !== 'string' || b64.length > MAX_BASE64) return next(new HttpError(400, 'La foto es muy pesada (máximo 10 MB)'));
      const buffer = Buffer.from(b64.replace(/^data:image\/[a-z+]+;base64,/i, ''), 'base64');
      return guardarImagen(buffer)
        .then((f) => {
          req.foto = f;
          limpiarAlTerminar(req, res);
          next();
        })
        .catch(next);
    }
    unico(req, res, async (err) => {
      if (err) return next(err);
      try {
        if (req.file) {
          req.foto = await guardarImagen(req.file.buffer);
          limpiarAlTerminar(req, res);
        }
        req.file = undefined; // el original sin limpiar no se usa más
        next();
      } catch (e) {
        next(e);
      }
    });
  };
}
