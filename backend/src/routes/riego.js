// CU-05 Gestionar riego + recomendación FAO-56 (cuándo y cuánto regar)
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { validar, numero, textoOpcional, paramsId } from '../lib/http.js';
import { cultivoDelUsuario } from './cultivos.js';
import { obtenerPronostico } from '../services/clima.js';
import { recomendarRiego, EFICIENCIA } from '../services/riego.js';

const router = Router();
const params = paramsId('idCultivo');

router.get('/metodos', (_req, res) =>
  res.json([
    { valor: 'GOTEO', nombre: 'Riego por goteo' },
    { valor: 'ASPERSION', nombre: 'Riego por aspersor' },
    { valor: 'CANALES', nombre: 'Riego por canales' },
  ]));

router.get('/cultivo/:idCultivo', validar({ params }), async (req, res) => {
  const c = await cultivoDelUsuario(req.datos.params.idCultivo, req.user.id);
  const riegos = await prisma.riego.findMany({ where: { idCultivo: c.idCultivo }, orderBy: { fechaRegistro: 'desc' }, take: 30 });
  res.json(riegos);
});

// Formulario del mockup: cantidad al día, método, veces al día, nota adicional
const esquemaRiego = z
  .object({
    cantidadAgua: numero({ min: 0, max: 500_000 }),
    metodoRiego: z.enum(Object.keys(EFICIENCIA), { errorMap: () => ({ message: 'Selecciona un método de riego' }) }),
    frecuenciaRiego: numero({ min: 1, max: 24, entero: true }),
    horaRiego: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:MM)').nullable().optional(),
    observaciones: textoOpcional(500),
  })
  .strict();

router.post('/cultivo/:idCultivo', validar({ params, body: esquemaRiego }), async (req, res) => {
  const c = await cultivoDelUsuario(req.datos.params.idCultivo, req.user.id);
  const b = req.datos.body;
  const riego = await prisma.riego.create({
    data: {
      idCultivo: c.idCultivo,
      cantidadAgua: b.cantidadAgua,
      metodoRiego: b.metodoRiego,
      frecuenciaRiego: b.frecuenciaRiego,
      horaRiego: b.horaRiego ?? null,
      observaciones: b.observaciones ?? null,
    },
  });
  res.status(201).json(riego);
});

router.get('/cultivo/:idCultivo/recomendacion', validar({ params }), async (req, res) => {
  const c = await cultivoDelUsuario(req.datos.params.idCultivo, req.user.id);
  const [pronostico, ultimoRiego] = await Promise.all([
    obtenerPronostico(req.user.ubicacion),
    prisma.riego.findFirst({ where: { idCultivo: c.idCultivo }, orderBy: { fechaRegistro: 'desc' } }),
  ]);
  const rec = recomendarRiego({ cultivo: c, ultimoRiego, dias: pronostico.proximos });
  res.json({ cultivo: { idCultivo: c.idCultivo, tipoCultivo: c.tipoCultivo }, ultimoRiego, ...rec });
});

export default router;
