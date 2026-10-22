// CU-03 Consultar clima y recomendaciones
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { validar } from '../lib/http.js';
import { VEREDAS } from '../data/veredas.js';
import { obtenerPronostico, detectarRiesgos } from '../services/clima.js';
import { construirAlertas } from '../services/alertas.js';

const router = Router();

// Resumen para la pantalla de inicio: clima actual, pronóstico y alertas en vivo
router.get('/resumen', validar({ query: z.object({ vereda: z.enum(Object.keys(VEREDAS)).optional() }).strict() }), async (req, res) => {
  const cultivos = await prisma.cultivo.findMany({
    where: { idUsuario: req.user.id, estado: 'ACTIVO' },
    select: { idCultivo: true, tipoCultivo: true },
  });
  const pronostico = await obtenerPronostico(req.datos.query.vereda || req.user.ubicacion);
  const alertas = construirAlertas(detectarRiesgos(pronostico), cultivos);
  res.json({ ...pronostico, alertas });
});

export default router;
