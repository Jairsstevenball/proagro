// Administrador: estadísticas globales, usuarios, moderación del Marketplace y auditoría.
// Los datos personales se muestran ENMASCARADOS (300****567): el admin no necesita verlos completos.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError, validar, paramsId, textoOpcional } from '../lib/http.js';
import { soloAdmin } from '../middleware/auth.js';
import { descifrarDato, enmascarar } from '../lib/proteccion.js';
import { revocarTodas } from '../services/tokens.js';
import { auditar } from '../lib/auditoria.js';

const router = Router();
router.use(soloAdmin);

router.get('/resumen', async (_req, res) => {
  const [usuarios, porVereda, cultivos, porTipo, cosecha, alertas, mensajes, publicaciones, reportesPendientes] = await Promise.all([
    prisma.usuario.count(),
    prisma.usuario.groupBy({ by: ['ubicacion'], _count: true }),
    prisma.cultivo.count({ where: { estado: 'ACTIVO' } }),
    prisma.cultivo.groupBy({ by: ['tipoCultivo'], where: { estado: 'ACTIVO' }, _count: true }),
    prisma.registroCultivo.aggregate({ _sum: { cantidadCosecha: true, valorVenta: true } }),
    prisma.notificacionAlerta.count(),
    prisma.agroBot.count(),
    prisma.producto.count({ where: { estado: 'ACTIVO' } }),
    prisma.reportePublicacion.count({ where: { revisado: false } }),
  ]);
  res.json({
    usuarios, porVereda, cultivosActivos: cultivos, porTipo,
    cosechaTotalKg: cosecha._sum.cantidadCosecha ?? 0,
    ventasTotales: cosecha._sum.valorVenta ?? 0,
    alertasEnviadas: alertas, consultasAgroBot: mensajes,
    publicacionesActivas: publicaciones, reportesPendientes,
  });
});

router.get('/usuarios', validar({ query: z.object({ pagina: z.coerce.number().int().min(1).default(1) }).strict() }), async (req, res) => {
  const usuarios = await prisma.usuario.findMany({
    select: {
      id: true, nombre: true, primerApellido: true, ubicacion: true, celularCifrado: true, rol: true,
      activo: true, fechaRegistro: true, ultimoIngreso: true, _count: { select: { cultivos: true, productos: true } },
    },
    orderBy: { fechaRegistro: 'desc' },
    skip: (req.datos.query.pagina - 1) * 50,
    take: 50,
  });
  res.json(usuarios.map(({ celularCifrado, ...u }) => ({ ...u, celular: enmascarar(descifrarDato(celularCifrado)) })));
});

const idUuid = z.object({ id: z.string().uuid() }).strict();

// Suspender / reactivar una cuenta. Suspender cierra todas sus sesiones al instante.
router.patch('/usuarios/:id/activo', validar({ params: idUuid, body: z.object({ activo: z.boolean() }).strict() }), async (req, res) => {
  const { id } = req.datos.params;
  if (id === req.user.id) throw new HttpError(400, 'No puedes suspender tu propia cuenta');
  await prisma.usuario.update({ where: { id }, data: { activo: req.datos.body.activo } });
  if (!req.datos.body.activo) await revocarTodas(id);
  await auditar(req, req.datos.body.activo ? 'ADMIN_REACTIVAR' : 'ADMIN_SUSPENDER', { detalle: { usuario: id } });
  res.status(204).end();
});

// --- Moderación del Marketplace ---
router.get('/reportes', async (_req, res) => {
  const reportes = await prisma.reportePublicacion.findMany({
    where: { revisado: false },
    orderBy: { fecha: 'desc' },
    take: 100,
    include: { producto: { select: { idProducto: true, titulo: true, estado: true, precio: true, idUsuario: true } } },
  });
  res.json(reportes.map(({ idUsuario, ...r }) => r)); // no se revela quién reportó
});

const esquemaModerar = z.object({ accion: z.enum(['OCULTAR', 'RESTAURAR']), nota: textoOpcional(300) }).strict();

router.patch('/mercado/:id', validar({ params: paramsId(), body: esquemaModerar }), async (req, res) => {
  const { id } = req.datos.params;
  const { accion, nota } = req.datos.body;
  await prisma.$transaction([
    prisma.producto.update({ where: { idProducto: id }, data: { estado: accion === 'OCULTAR' ? 'OCULTO' : 'ACTIVO' } }),
    prisma.reportePublicacion.updateMany({ where: { idProducto: id }, data: { revisado: true } }),
  ]);
  await auditar(req, `ADMIN_MERCADO_${accion}`, { detalle: { idProducto: id, nota } });
  res.status(204).end();
});

router.get('/auditoria', validar({ query: z.object({ evento: z.string().max(40).optional() }).strict() }), async (req, res) => {
  const eventos = await prisma.auditoria.findMany({
    where: req.datos.query.evento ? { evento: req.datos.query.evento } : {},
    orderBy: { fecha: 'desc' },
    take: 200,
  });
  res.json(eventos);
});

export default router;
