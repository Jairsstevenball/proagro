// CU-04 Ver estadísticas (pantallas "Estadística" y "Estadistica_formulario")
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { validar, numero, numeroOpcional, paramsId } from '../lib/http.js';
import { cultivoDelUsuario } from './cultivos.js';
import { aguaDelMes } from '../services/riego.js';

const router = Router();
const SALUD = ['EXCELENTE', 'BUENA', 'REGULAR', 'MALA'];
const params = paramsId('idCultivo');

const hoy = () => new Date();
const periodo = {
  anio: z.coerce.number().int().min(2020).max(2100).default(() => hoy().getFullYear()),
  mes: z.coerce.number().int().min(1).max(12).default(() => hoy().getMonth() + 1),
};

function consejo({ registro, agua, saludPredominante }) {
  if (!registro) return 'Registra tu cosecha de este mes para ver tu rendimiento y recibir consejos.';
  if (registro.saludCultivo === 'MALA' || registro.saludCultivo === 'REGULAR') {
    return 'La salud de tus plantas no está bien. Toma una foto y pregúntale a AgroBot qué puede estar pasando.';
  }
  if (registro.valorVenta && registro.costoProduccion && registro.costoProduccion > registro.valorVenta) {
    return 'Este mes gastaste más de lo que vendiste. Revisa tus costos de abono e insumos o intenta vender directo en el Mercado de ProAgro.';
  }
  if (agua === 0) return 'Registra cómo riegas en el módulo de Riego para saber si estás usando el agua correcta.';
  return `Vas bien. La salud predominante de tu cultivo es ${saludPredominante?.toLowerCase() || 'buena'}; sigue revisando las recomendaciones de riego cada día.`;
}

router.get('/:idCultivo', validar({ params, query: z.object(periodo).strict() }), async (req, res) => {
  const c = await cultivoDelUsuario(req.datos.params.idCultivo, req.user.id);
  const { anio, mes } = req.datos.query;

  const [registros, riegos] = await Promise.all([
    prisma.registroCultivo.findMany({ where: { idCultivo: c.idCultivo }, orderBy: [{ anio: 'asc' }, { mes: 'asc' }] }),
    prisma.riego.findMany({ where: { idCultivo: c.idCultivo }, orderBy: { fechaRegistro: 'asc' } }),
  ]);

  const registro = registros.find((r) => r.anio === anio && r.mes === mes) || null;
  const conteo = {};
  for (const r of registros) conteo[r.saludCultivo] = (conteo[r.saludCultivo] || 0) + 1;
  const saludPredominante = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const saludPct = registros.length
    ? Math.round((registros.filter((r) => r.saludCultivo === 'EXCELENTE' || r.saludCultivo === 'BUENA').length / registros.length) * 100)
    : null;
  const agua = aguaDelMes(riegos, anio, mes, c.fechaInicio);

  res.json({
    cultivo: { idCultivo: c.idCultivo, tipoCultivo: c.tipoCultivo },
    anio, mes, registro,
    cosechaKg: registro?.cantidadCosecha ?? 0,
    ingreso: registro?.valorVenta ?? 0,
    costo: registro?.costoProduccion ?? 0,
    aguaLitros: agua,
    saludPredominante,
    saludPct,
    historico: registros.slice(-6).map((r) => ({ anio: r.anio, mes: r.mes, kg: r.cantidadCosecha })),
    consejo: consejo({ registro, agua, saludPredominante }),
  });
});

const esquemaRegistro = z
  .object({
    ...periodo,
    cantidadCosecha: numero({ min: 0, max: 10_000_000 }),
    valorVenta: numeroOpcional({ min: 0, max: 10_000_000_000 }),
    costoProduccion: numeroOpcional({ min: 0, max: 10_000_000_000 }),
    saludCultivo: z.enum(SALUD, { errorMap: () => ({ message: 'Selecciona el estado de salud' }) }),
  })
  .strict();

router.put('/:idCultivo', validar({ params, body: esquemaRegistro }), async (req, res) => {
  const c = await cultivoDelUsuario(req.datos.params.idCultivo, req.user.id);
  const { anio, mes, ...b } = req.datos.body;
  const data = {
    cantidadCosecha: b.cantidadCosecha,
    valorVenta: b.valorVenta ?? null,
    costoProduccion: b.costoProduccion ?? null,
    saludCultivo: b.saludCultivo,
    fechaRegistro: new Date(),
  };
  const registro = await prisma.registroCultivo.upsert({
    where: { idCultivo_anio_mes: { idCultivo: c.idCultivo, anio, mes } },
    create: { idCultivo: c.idCultivo, anio, mes, ...data },
    update: data,
  });
  res.json(registro);
});

export default router;
