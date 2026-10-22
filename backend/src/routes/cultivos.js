// CU-08 a CU-12: gestionar, consultar activos/inactivos, registrar y guardar cultivos
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError, validar, texto, textoOpcional, numeroOpcional, paramsId, fecha, idEntero } from '../lib/http.js';
import { subirFoto, borrarImagen } from '../middleware/upload.js';
import { limiteSubidas } from '../middleware/seguridad.js';
import { urlFirmada } from '../lib/proteccion.js';
import { TIPOS_CULTIVO, TIPOS_ABONO } from '../data/cultivos.js';

const router = Router();
const MAX_CULTIVOS = 50;

/** Busca un cultivo y verifica que sea del usuario (evita ver cultivos ajenos cambiando el id). */
export async function cultivoDelUsuario(idCultivo, idUsuario) {
  const id = idEntero.safeParse(idCultivo);
  if (!id.success) throw new HttpError(400, 'Id de cultivo inválido');
  const cultivo = await prisma.cultivo.findFirst({ where: { idCultivo: id.data, idUsuario } });
  // Mismo mensaje si no existe o si es de otro: no revelamos qué ids existen.
  if (!cultivo) throw new HttpError(404, 'Cultivo no encontrado');
  return cultivo;
}

export const cultivoPublico = ({ idUsuario, ...c }) => ({ ...c, fotoUrl: urlFirmada(c.fotoUrl) });

const tipoCultivo = z.enum(TIPOS_CULTIVO, { errorMap: () => ({ message: 'Selecciona un tipo de cultivo' }) });
const campos = {
  tipoAbono: textoOpcional(60),
  herramientas: textoOpcional(500),
  areaM2: numeroOpcional({ min: 1, max: 1_000_000 }),
  fechaInicio: fecha.optional(),
};

router.get('/tipos', (_req, res) => res.json({ cultivos: TIPOS_CULTIVO, abonos: TIPOS_ABONO }));

router.get('/', validar({ query: z.object({ estado: z.enum(['ACTIVO', 'INACTIVO']).optional() }).strict() }), async (req, res) => {
  const where = { idUsuario: req.user.id, ...(req.datos.query.estado ? { estado: req.datos.query.estado } : {}) };
  const cultivos = await prisma.cultivo.findMany({ where, orderBy: { fechaInicio: 'desc' } });
  res.json(cultivos.map(cultivoPublico));
});

router.get('/:id', validar({ params: paramsId() }), async (req, res) => {
  res.json(cultivoPublico(await cultivoDelUsuario(req.datos.params.id, req.user.id)));
});

// multipart/form-data: tipoCultivo, tipoAbono, herramientas, areaM2, fechaInicio, foto(archivo)
router.post('/', limiteSubidas, subirFoto(), validar({ body: z.object({ tipoCultivo, ...campos }).strict() }), async (req, res) => {
  const total = await prisma.cultivo.count({ where: { idUsuario: req.user.id, estado: 'ACTIVO' } });
  if (total >= MAX_CULTIVOS) throw new HttpError(400, `Máximo ${MAX_CULTIVOS} cultivos activos`);
  const b = req.datos.body;
  const cultivo = await prisma.cultivo.create({
    data: {
      idUsuario: req.user.id,
      tipoCultivo: b.tipoCultivo,
      tipoAbono: b.tipoAbono ?? null,
      herramientas: b.herramientas ?? null,
      areaM2: b.areaM2 ?? null,
      fechaInicio: b.fechaInicio,
      fotoUrl: req.foto?.nombre ?? null,
    },
  });
  res.status(201).json(cultivoPublico(cultivo));
});

router.put(
  '/:id',
  limiteSubidas,
  subirFoto(),
  validar({ params: paramsId(), body: z.object({ tipoCultivo: tipoCultivo.optional(), ...campos }).strict() }),
  async (req, res) => {
    const actual = await cultivoDelUsuario(req.datos.params.id, req.user.id);
    const b = req.datos.body;
    const data = {};
    for (const k of ['tipoCultivo', 'tipoAbono', 'herramientas', 'areaM2', 'fechaInicio']) if (b[k] !== undefined) data[k] = b[k];
    if (req.foto) data.fotoUrl = req.foto.nombre;
    const cultivo = await prisma.cultivo.update({ where: { idCultivo: actual.idCultivo }, data });
    if (req.foto && actual.fotoUrl) await borrarImagen(actual.fotoUrl);
    res.json(cultivoPublico(cultivo));
  },
);

// Activar / inactivar (pantallas "¿Está seguro de inactivar este cultivo?" y "Activar")
router.patch(
  '/:id/estado',
  validar({ params: paramsId(), body: z.object({ estado: z.enum(['ACTIVO', 'INACTIVO']) }).strict() }),
  async (req, res) => {
    const actual = await cultivoDelUsuario(req.datos.params.id, req.user.id);
    const { estado } = req.datos.body;
    const cultivo = await prisma.cultivo.update({
      where: { idCultivo: actual.idCultivo },
      data: { estado, fechaFinalizacion: estado === 'INACTIVO' ? new Date() : null },
    });
    res.json(cultivoPublico(cultivo));
  },
);

router.delete('/:id', validar({ params: paramsId() }), async (req, res) => {
  const actual = await cultivoDelUsuario(req.datos.params.id, req.user.id);
  await prisma.cultivo.delete({ where: { idCultivo: actual.idCultivo } });
  await borrarImagen(actual.fotoUrl);
  res.status(204).end();
});

export default router;
