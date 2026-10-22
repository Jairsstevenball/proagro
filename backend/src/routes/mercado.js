// CU-06 Consultar mercado: Marketplace para comprar insumos y vender la cosecha sin intermediarios.
// Fase 1: sin pagos en línea. El comprador contacta al vendedor por WhatsApp desde la app.
//
// Protección:
//  - El celular del vendedor NUNCA aparece en el listado; solo se entrega al pulsar "Contactar",
//    con límite diario por usuario y queda registrado (trazabilidad ante estafas).
//  - No se permiten enlaces ni números de teléfono en el texto (los estafadores sacan al
//    comprador de la app). Todo contacto pasa por el botón.
//  - Reportes: con 3 reportes de personas distintas la publicación se oculta automáticamente.
//  - Solo el dueño puede editar o borrar su publicación.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError, validar, texto, textoOpcional, numero, paramsId } from '../lib/http.js';
import { subirFoto, borrarImagen } from '../middleware/upload.js';
import { limitePublicar, limiteContacto, limiteReportes, limiteSubidas } from '../middleware/seguridad.js';
import { urlFirmada, descifrarDato } from '../lib/proteccion.js';
import { auditar } from '../lib/auditoria.js';
import { VEREDAS } from '../data/veredas.js';
import { CATEGORIAS, UNIDADES, MOTIVOS_REPORTE, REPORTES_PARA_OCULTAR, MAX_PUBLICACIONES_ACTIVAS } from '../data/mercado.js';

const router = Router();
const POR_PAGINA = 20;

const vendedorSelect = { select: { nombre: true, primerApellido: true, ubicacion: true, fechaRegistro: true } };

function productoPublico(p, idUsuarioActual) {
  const { idUsuario, usuario, _count, ...resto } = p;
  return {
    ...resto,
    fotoUrl: urlFirmada(p.fotoUrl),
    esMio: idUsuario === idUsuarioActual,
    vendedor: usuario
      ? { nombre: `${usuario.nombre} ${usuario.primerApellido.charAt(0)}.`, vereda: usuario.ubicacion, desde: usuario.fechaRegistro }
      : undefined,
  };
}

// --- Anti-estafa: sin URLs ni teléfonos en el texto ---
const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|co|net|org|io|me|ly|link)\b)/i;
// Celular colombiano (300 123 4567, 300-123-4567...) o 10+ dígitos seguidos. No bloquea precios como 1.200.000
const TELEFONO_RE = /(\+?57[\s.-]?)?\b3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b|\d{10,}/;
const sinContactoEscondido = (v) => !v || (!URL_RE.test(v) && !TELEFONO_RE.test(v));
const MSG_CONTACTO = 'No escribas enlaces ni números de teléfono; los compradores te contactan con el botón "Contactar"';

const base = {
  titulo: texto(80, 3).refine(sinContactoEscondido, MSG_CONTACTO),
  descripcion: textoOpcional(800).refine(sinContactoEscondido, MSG_CONTACTO),
  precio: numero({ min: 100, max: 50_000_000, entero: true }),
  unidad: z.enum(UNIDADES, { errorMap: () => ({ message: 'Unidad inválida' }) }),
  cantidad: numero({ min: 0.1, max: 1_000_000 }),
};

const esquemaCrear = z
  .object({
    tipo: z.enum(['INSUMO', 'COSECHA']),
    categoria: z.string(),
    ...base,
    vereda: z.enum(Object.keys(VEREDAS)).optional(),
  })
  .strict()
  .refine((b) => CATEGORIAS[b.tipo].includes(b.categoria), { message: 'Categoría inválida', path: ['categoria'] });

const esquemaEditar = z
  .object({
    categoria: z.string().optional(),
    titulo: base.titulo.optional(),
    descripcion: base.descripcion,
    precio: base.precio.optional(),
    unidad: base.unidad.optional(),
    cantidad: base.cantidad.optional(),
  })
  .strict();

async function productoPropio(idProducto, idUsuario) {
  const p = await prisma.producto.findFirst({ where: { idProducto, idUsuario } });
  if (!p) throw new HttpError(404, 'Publicación no encontrada');
  return p;
}

router.get('/catalogos', (_req, res) => res.json({ categorias: CATEGORIAS, unidades: UNIDADES, motivosReporte: MOTIVOS_REPORTE }));

// Listado público (para usuarios con sesión) con filtros y paginación
const esquemaLista = z
  .object({
    tipo: z.enum(['INSUMO', 'COSECHA']).optional(),
    categoria: z.string().max(40).optional(),
    vereda: z.enum(Object.keys(VEREDAS)).optional(),
    q: z.string().trim().max(60).optional(),
    pagina: z.coerce.number().int().min(1).max(500).default(1),
  })
  .strict();

router.get('/', validar({ query: esquemaLista }), async (req, res) => {
  const { tipo, categoria, vereda, q, pagina } = req.datos.query;
  const where = {
    estado: 'ACTIVO',
    usuario: { activo: true },
    ...(tipo && { tipo }),
    ...(categoria && { categoria }),
    ...(vereda && { vereda }),
    ...(q && { titulo: { contains: q, mode: 'insensitive' } }),
  };
  const [total, productos] = await Promise.all([
    prisma.producto.count({ where }),
    prisma.producto.findMany({
      where,
      orderBy: { fechaPublicacion: 'desc' },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { usuario: vendedorSelect },
    }),
  ]);
  res.json({ total, pagina, paginas: Math.ceil(total / POR_PAGINA), productos: productos.map((p) => productoPublico(p, req.user.id)) });
});

router.get('/mios', async (req, res) => {
  const productos = await prisma.producto.findMany({
    where: { idUsuario: req.user.id },
    orderBy: { fechaPublicacion: 'desc' },
    include: { _count: { select: { contactos: true } } },
  });
  res.json(productos.map((p) => ({ ...productoPublico(p, req.user.id), contactos: p._count.contactos })));
});

router.get('/:id', validar({ params: paramsId() }), async (req, res) => {
  const p = await prisma.producto.findUnique({ where: { idProducto: req.datos.params.id }, include: { usuario: vendedorSelect } });
  // Las ocultas o pausadas solo las ve su dueño.
  if (!p || (p.estado !== 'ACTIVO' && p.idUsuario !== req.user.id)) throw new HttpError(404, 'Publicación no encontrada');
  res.json(productoPublico(p, req.user.id));
});

router.post('/', limitePublicar, limiteSubidas, subirFoto(), validar({ body: esquemaCrear }), async (req, res) => {
  const activas = await prisma.producto.count({ where: { idUsuario: req.user.id, estado: 'ACTIVO' } });
  if (activas >= MAX_PUBLICACIONES_ACTIVAS) throw new HttpError(400, `Puedes tener máximo ${MAX_PUBLICACIONES_ACTIVAS} publicaciones activas`);
  const b = req.datos.body;
  const p = await prisma.producto.create({
    data: {
      idUsuario: req.user.id,
      tipo: b.tipo,
      categoria: b.categoria,
      titulo: b.titulo,
      descripcion: b.descripcion ?? null,
      precio: b.precio,
      unidad: b.unidad,
      cantidad: b.cantidad,
      vereda: b.vereda || req.user.ubicacion,
      fotoUrl: req.foto?.nombre ?? null,
    },
  });
  await auditar(req, 'MERCADO_PUBLICAR', { detalle: { idProducto: p.idProducto } });
  res.status(201).json(productoPublico(p, req.user.id));
});

router.put('/:id', limiteSubidas, subirFoto(), validar({ params: paramsId(), body: esquemaEditar }), async (req, res) => {
  const actual = await productoPropio(req.datos.params.id, req.user.id);
  if (actual.estado === 'OCULTO') throw new HttpError(403, 'Esta publicación está en revisión por reportes');
  const b = req.datos.body;
  if (b.categoria && !CATEGORIAS[actual.tipo].includes(b.categoria)) throw new HttpError(400, 'Categoría inválida');
  const data = {};
  for (const k of ['categoria', 'titulo', 'descripcion', 'precio', 'unidad', 'cantidad']) if (b[k] !== undefined) data[k] = b[k];
  if (req.foto) data.fotoUrl = req.foto.nombre;
  const p = await prisma.producto.update({ where: { idProducto: actual.idProducto }, data });
  if (req.foto && actual.fotoUrl) await borrarImagen(actual.fotoUrl);
  res.json(productoPublico(p, req.user.id));
});

// El dueño puede pausar, reactivar o marcar como vendido (no puede quitar un OCULTO de moderación)
router.patch(
  '/:id/estado',
  validar({ params: paramsId(), body: z.object({ estado: z.enum(['ACTIVO', 'PAUSADO', 'VENDIDO']) }).strict() }),
  async (req, res) => {
    const actual = await productoPropio(req.datos.params.id, req.user.id);
    if (actual.estado === 'OCULTO') throw new HttpError(403, 'Esta publicación está en revisión por reportes');
    const p = await prisma.producto.update({ where: { idProducto: actual.idProducto }, data: { estado: req.datos.body.estado } });
    res.json(productoPublico(p, req.user.id));
  },
);

router.delete('/:id', validar({ params: paramsId() }), async (req, res) => {
  const actual = await productoPropio(req.datos.params.id, req.user.id);
  await prisma.producto.delete({ where: { idProducto: actual.idProducto } });
  await borrarImagen(actual.fotoUrl);
  res.status(204).end();
});

// "Contactar": entrega el enlace de WhatsApp del vendedor
router.post('/:id/contacto', limiteContacto, validar({ params: paramsId() }), async (req, res) => {
  const p = await prisma.producto.findUnique({
    where: { idProducto: req.datos.params.id },
    include: { usuario: { select: { celularCifrado: true, activo: true, nombre: true } } },
  });
  if (!p || p.estado !== 'ACTIVO' || !p.usuario.activo) throw new HttpError(404, 'Publicación no disponible');
  if (p.idUsuario === req.user.id) throw new HttpError(400, 'Esta publicación es tuya');

  await prisma.contactoMercado.create({ data: { idProducto: p.idProducto, idUsuario: req.user.id } });
  const celular = descifrarDato(p.usuario.celularCifrado);
  const texto = `Hola ${p.usuario.nombre}, vi en ProAgro tu publicación "${p.titulo}" ($${p.precio.toLocaleString('es-CO')} por ${p.unidad}). ¿Sigue disponible?`;
  res.json({ whatsapp: `https://wa.me/57${celular}?text=${encodeURIComponent(texto)}` });
});

const esquemaReporte = z.object({ motivo: z.enum(MOTIVOS_REPORTE), detalle: textoOpcional(300) }).strict();

router.post('/:id/reportar', limiteReportes, validar({ params: paramsId(), body: esquemaReporte }), async (req, res) => {
  const p = await prisma.producto.findUnique({ where: { idProducto: req.datos.params.id } });
  if (!p || p.estado !== 'ACTIVO') throw new HttpError(404, 'Publicación no disponible');
  if (p.idUsuario === req.user.id) throw new HttpError(400, 'No puedes reportar tu propia publicación');

  try {
    await prisma.reportePublicacion.create({
      data: { idProducto: p.idProducto, idUsuario: req.user.id, motivo: req.datos.body.motivo, detalle: req.datos.body.detalle ?? null },
    });
  } catch (e) {
    if (e.code === 'P2002') throw new HttpError(409, 'Ya reportaste esta publicación');
    throw e;
  }
  const reportes = await prisma.reportePublicacion.count({ where: { idProducto: p.idProducto, revisado: false } });
  if (reportes >= REPORTES_PARA_OCULTAR) {
    await prisma.producto.update({ where: { idProducto: p.idProducto }, data: { estado: 'OCULTO' } });
  }
  await auditar(req, 'MERCADO_REPORTE', { detalle: { idProducto: p.idProducto, motivo: req.datos.body.motivo } });
  res.status(201).json({ ok: true, mensaje: 'Gracias. Revisaremos la publicación' });
});

export default router;
