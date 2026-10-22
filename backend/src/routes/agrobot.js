// CU-13 Obtener recomendaciones del chatbot (texto y fotos)
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError, validar, textoOpcional, idEntero } from '../lib/http.js';
import { subirFoto, borrarImagen } from '../middleware/upload.js';
import { limiteAgroBot } from '../middleware/seguridad.js';
import { urlFirmada } from '../lib/proteccion.js';
import { config } from '../config.js';
import { responder } from '../services/agrobot.js';
import { obtenerPronostico } from '../services/clima.js';
import { cultivoDelUsuario } from './cultivos.js';

const router = Router();

const mensajePublico = ({ idUsuario, ...m }) => ({ ...m, imagenUrl: urlFirmada(m.imagenUrl) });

router.get('/historial', validar({ query: z.object({ limit: z.coerce.number().int().min(1).max(100).default(30) }).strict() }), async (req, res) => {
  const mensajes = await prisma.agroBot.findMany({
    where: { idUsuario: req.user.id },
    orderBy: { fechaHora: 'desc' },
    take: req.datos.query.limit,
  });
  res.json(mensajes.reverse().map(mensajePublico));
});

router.get('/cupo', async (req, res) => {
  res.json({ usados: await usadosHoy(req.user.id), limite: config.agrobotDiario });
});

async function usadosHoy(idUsuario) {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  return prisma.agroBot.count({ where: { idUsuario, fechaHora: { gte: inicio } } });
}

// multipart/form-data: mensaje (texto), idCultivo (opcional), foto (opcional)
const esquema = z.object({ mensaje: textoOpcional(1000), idCultivo: z.union([idEntero, z.literal('')]).optional() }).strict();

router.post('/', limiteAgroBot, async (req, res, next) => {
  // El cupo diario se revisa ANTES de aceptar la foto: protege la cuota gratuita de Gemini.
  if ((await usadosHoy(req.user.id)) >= config.agrobotDiario) {
    return next(new HttpError(429, `Llegaste al límite de ${config.agrobotDiario} preguntas por hoy. Mañana puedes seguir`, 'CUPO_AGOTADO'));
  }
  next();
}, subirFoto(), validar({ body: esquema }), async (req, res) => {
  const mensaje = req.datos.body.mensaje || '';
  if (!mensaje && !req.foto) throw new HttpError(400, 'Escribe una pregunta o envía una foto');

  const idUsuario = req.user.id;
  const [cultivos, historial] = await Promise.all([
    prisma.cultivo.findMany({ where: { idUsuario, estado: 'ACTIVO' }, take: 10 }),
    prisma.agroBot.findMany({ where: { idUsuario }, orderBy: { fechaHora: 'desc' }, take: 6 }),
  ]);
  const cultivoFoco = req.datos.body.idCultivo ? await cultivoDelUsuario(req.datos.body.idCultivo, idUsuario) : null;
  const clima = await obtenerPronostico(req.user.ubicacion).catch(() => null);

  const respuesta = await responder({
    mensaje,
    foto: req.foto?.buffer,
    historial: historial.reverse(),
    vereda: req.user.ubicacion,
    cultivos, clima, cultivoFoco,
  });

  const guardado = await prisma.agroBot.create({
    data: {
      idUsuario,
      idCultivo: cultivoFoco?.idCultivo ?? null,
      mensajeUsuario: mensaje || '(foto)',
      imagenUrl: req.foto?.nombre ?? null,
      respuestaBot: respuesta,
    },
  });
  res.status(201).json(mensajePublico(guardado));
});

router.delete('/historial', async (req, res) => {
  const fotos = await prisma.agroBot.findMany({ where: { idUsuario: req.user.id, imagenUrl: { not: null } }, select: { imagenUrl: true } });
  await prisma.agroBot.deleteMany({ where: { idUsuario: req.user.id } });
  await Promise.all(fotos.map((f) => borrarImagen(f.imagenUrl)));
  res.status(204).end();
});

export default router;
