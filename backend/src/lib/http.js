// Utilidades HTTP: errores, validación estricta con zod y manejador de errores.
import { z, ZodError } from 'zod';
import { limpiarTexto } from './cripto.js';
import { logger } from './logger.js';

export class HttpError extends Error {
  constructor(status, message, codigo) {
    super(message);
    this.status = status;
    this.codigo = codigo;
  }
}

/**
 * Valida body / query / params con esquemas zod ESTRICTOS (rechaza campos desconocidos,
 * así nadie puede colar "rol: ADMIN" o "idUsuario" en una petición).
 * El resultado queda en req.datos = { body, query, params }.
 */
export function validar({ body, query, params } = {}) {
  return (req, _res, next) => {
    req.datos = {
      body: body ? body.parse(req.body ?? {}) : {},
      query: query ? query.parse(req.query ?? {}) : {},
      params: params ? params.parse(req.params ?? {}) : {},
    };
    next();
  };
}

// ---------- Piezas de esquema reutilizables ----------

/** Texto limpio (sin caracteres de control) con largo máximo. */
export const texto = (max, min = 1) =>
  z
    .string({ invalid_type_error: 'Debe ser texto' })
    .transform(limpiarTexto)
    .pipe(z.string().min(min, min === 1 ? 'Campo obligatorio' : `Mínimo ${min} caracteres`).max(max, `Máximo ${max} caracteres`));

/** Texto opcional: '' o null se convierten en null. */
export const textoOpcional = (max) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === null ? null : limpiarTexto(v) || null))
    .refine((v) => v === undefined || v === null || v.length <= max, `Máximo ${max} caracteres`);

/** Número que puede venir como "1.200,5" desde un formulario. */
export const numero = ({ min = 0, max = 1e9, entero = false } = {}) =>
  z
    .union([z.number(), z.string()])
    .transform((v, ctx) => {
      const n = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.'));
      if (!Number.isFinite(n)) {
        ctx.addIssue({ code: 'custom', message: 'Número inválido' });
        return z.NEVER;
      }
      return n;
    })
    .pipe(entero ? z.number().int('Debe ser un número entero').min(min).max(max) : z.number().min(min).max(max));

export const numeroOpcional = (opts) =>
  z
    .union([numero(opts), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v === '' ? null : v));

export const idEntero = z.coerce.number().int().positive().max(2147483647);
export const paramsId = (nombre = 'id') => z.object({ [nombre]: idEntero }).strict();

export const fecha = z.coerce
  .date({ invalid_type_error: 'Fecha inválida' })
  .refine((d) => d.getFullYear() >= 2000 && d <= new Date(Date.now() + 366 * 864e5), 'Fecha fuera de rango');

// ---------- Manejador de errores ----------

export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    const i = err.issues[0];
    const campo = i.path.join('.');
    const mensaje = i.code === 'unrecognized_keys' ? `Campo no permitido: ${i.keys.join(', ')}` : i.message;
    return res.status(400).json({ error: campo ? `${campo}: ${mensaje}` : mensaje });
  }
  if (err.code === 'P2002') return res.status(409).json({ error: 'Ya existe un registro con esos datos' });
  if (err.code === 'P2025') return res.status(404).json({ error: 'No encontrado' });
  if (err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'La foto es muy pesada (máximo 15 MB)' : 'Archivo no permitido';
    return res.status(400).json({ error: msg });
  }
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Petición demasiado grande' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });

  const status = err.status || 500;
  if (status >= 500) logger.error({ err, reqId: req.id }, 'error no controlado');
  // Nunca se envían detalles internos (stack, SQL) al cliente.
  res.status(status).json({
    error: status >= 500 ? 'Error interno del servidor' : err.message,
    ...(err.codigo ? { codigo: err.codigo } : {}),
    ...(status >= 500 ? { reqId: req.id } : {}),
  });
}
