// CU-01 Registrarse, CU-02 Iniciar sesión, sesiones, perfil y eliminación de cuenta.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError, validar, texto, textoOpcional } from '../lib/http.js';
import { auth } from '../middleware/auth.js';
import { limiteLogin, limiteRegistro, limiteRefresh } from '../middleware/seguridad.js';
import { borrarImagen } from '../middleware/upload.js';
import { VEREDAS } from '../data/veredas.js';
import { config } from '../config.js';
import {
  camposPersonales, usuarioPublico, normalizarCelular, normalizarDocumento,
  hashCelular, hashCorreo, hashDocumento, hashOauth,
} from '../lib/proteccion.js';
import { hashContrasena, verificarContrasena, problemaContrasena } from '../services/password.js';
import { crearSesion, rotarSesion, revocarSesion, revocarTodas, firmarTicket, verificarTicket } from '../services/tokens.js';
import { verificarIdToken } from '../services/oauth.js';
import { auditar } from '../lib/auditoria.js';

const router = Router();

const MAX_INTENTOS = 5;

// ---------- Esquemas ----------
const vereda = z.enum(Object.keys(VEREDAS), { errorMap: () => ({ message: 'Selecciona una vereda válida' }) });
const documento = z
  .string()
  .transform(normalizarDocumento)
  .pipe(z.string().regex(/^[0-9A-Z]{5,15}$/, 'Documento inválido'));
const celular = z
  .string()
  .transform(normalizarCelular)
  .pipe(z.string().regex(/^3\d{9}$/, 'El celular debe tener 10 dígitos y empezar por 3'));
const correo = z
  .union([z.string().trim().toLowerCase().email('Correo inválido').max(120), z.literal(''), z.null()])
  .optional()
  .transform((v) => v || null);
const nombre = texto(60).refine((v) => /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ' -]+$/.test(v), 'Solo letras');
const dispositivo = z.string().max(80).optional();
const terminos = z.literal(true, { errorMap: () => ({ message: 'Debes aceptar los términos y el tratamiento de datos' }) });

const datosPersona = {
  documento,
  nombre,
  primerApellido: nombre,
  segundoApellido: textoOpcional(60),
  ubicacion: vereda,
  celular,
  aceptaTerminos: terminos,
  dispositivo,
};

const esquemaRegistro = z.object({ ...datosPersona, correoElectronico: correo, contrasena: z.string().max(128) }).strict();
const esquemaLogin = z.object({ usuario: z.string().trim().min(3).max(120), contrasena: z.string().min(1).max(128), dispositivo }).strict();
const esquemaRefresh = z.object({ refreshToken: z.string().min(40).max(200) }).strict();
const esquemaOauth = z
  .object({ proveedor: z.enum(['google', 'microsoft']), idToken: z.string().min(100).max(5000), nonce: z.string().max(200).optional(), dispositivo })
  .strict();
const esquemaCompletar = z.object({ ticket: z.string().max(3000), ...datosPersona }).strict();

async function respuestaSesion(req, usuario, disp) {
  const tokens = await crearSesion(req, usuario, disp);
  return { ...tokens, usuario: usuarioPublico(usuario) };
}

async function verificarDuplicados({ documento: d, celular: c, correoElectronico: m }) {
  const or = [{ documentoHash: hashDocumento(d) }, { celularHash: hashCelular(c) }];
  if (m) or.push({ correoHash: hashCorreo(m) });
  const existe = await prisma.usuario.findFirst({ where: { OR: or }, select: { id: true } });
  if (existe) throw new HttpError(409, 'Ya existe una cuenta con ese documento, celular o correo. Si es tuya, inicia sesión');
}

// ---------- Registro ----------
router.post('/registro', limiteRegistro, validar({ body: esquemaRegistro }), async (req, res) => {
  const b = req.datos.body;
  const problema = problemaContrasena(b.contrasena, b);
  if (problema) throw new HttpError(400, problema);
  await verificarDuplicados(b);

  const usuario = await prisma.usuario.create({
    data: {
      ...camposPersonales(b),
      nombre: b.nombre,
      primerApellido: b.primerApellido,
      segundoApellido: b.segundoApellido ?? null,
      ubicacion: b.ubicacion,
      contrasena: await hashContrasena(b.contrasena),
      proveedorAuth: 'local',
      terminosVersion: config.terminosVersion,
    },
  });
  await auditar(req, 'REGISTRO', { idUsuario: usuario.id });
  res.status(201).json(await respuestaSesion(req, usuario, b.dispositivo));
});

// ---------- Login (con celular o correo) ----------
router.post('/login', limiteLogin, validar({ body: esquemaLogin }), async (req, res) => {
  const { usuario: id, contrasena, dispositivo: disp } = req.datos.body;
  const where = id.includes('@') ? { correoHash: hashCorreo(id) } : { celularHash: hashCelular(id) };
  const usuario = await prisma.usuario.findUnique({ where });

  if (usuario?.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
    const min = Math.ceil((usuario.bloqueadoHasta - Date.now()) / 60000);
    throw new HttpError(429, `Por seguridad tu cuenta está bloqueada ${min} minuto(s) por intentos fallidos`, 'CUENTA_BLOQUEADA');
  }

  // Si el usuario no existe igual se verifica un hash falso: mismo tiempo de respuesta.
  const ok = await verificarContrasena(contrasena, usuario?.contrasena);
  if (!ok) {
    if (usuario) {
      const intentos = usuario.intentosFallidos + 1;
      const bloquear = intentos >= MAX_INTENTOS;
      // 15 min, 30, 60... hasta 24 h
      const minutos = Math.min(15 * 2 ** (intentos - MAX_INTENTOS), 24 * 60);
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { intentosFallidos: intentos, bloqueadoHasta: bloquear ? new Date(Date.now() + minutos * 60000) : null },
      });
      await auditar(req, bloquear ? 'CUENTA_BLOQUEADA' : 'LOGIN_FALLIDO', { idUsuario: usuario.id, detalle: { intentos } });
    } else {
      await auditar(req, 'LOGIN_FALLIDO', { detalle: { usuarioInexistente: true } });
    }
    throw new HttpError(401, 'Celular o contraseña incorrectos');
  }
  if (!usuario.activo) throw new HttpError(403, 'Tu cuenta está suspendida. Comunícate con soporte', 'CUENTA_SUSPENDIDA');

  const actualizado = await prisma.usuario.update({
    where: { id: usuario.id },
    data: { intentosFallidos: 0, bloqueadoHasta: null, ultimoIngreso: new Date() },
  });
  await auditar(req, 'LOGIN_OK', { idUsuario: usuario.id });
  res.json(await respuestaSesion(req, actualizado, disp));
});

// ---------- Renovar sesión ----------
router.post('/refresh', limiteRefresh, validar({ body: esquemaRefresh }), async (req, res) => {
  res.json(await rotarSesion(req, req.datos.body.refreshToken));
});

// ---------- Google / Microsoft ----------
router.post('/oauth', limiteLogin, validar({ body: esquemaOauth }), async (req, res) => {
  const { proveedor, idToken, nonce, dispositivo: disp } = req.datos.body;
  const perfil = await verificarIdToken(proveedor, idToken, nonce);
  const oauthHash = hashOauth(proveedor, perfil.sub);

  let usuario = await prisma.usuario.findUnique({ where: { oauthHash } });
  // ¿Ya tenía cuenta con ese correo? La vinculamos (el proveedor verificó el correo).
  if (!usuario && perfil.correo) {
    const porCorreo = await prisma.usuario.findUnique({ where: { correoHash: hashCorreo(perfil.correo) } });
    if (porCorreo && !porCorreo.oauthHash) {
      usuario = await prisma.usuario.update({ where: { id: porCorreo.id }, data: { oauthHash } });
      await auditar(req, 'OAUTH_VINCULADO', { idUsuario: usuario.id, detalle: { proveedor } });
    }
  }

  if (!usuario) {
    // Falta información del mockup de registro (documento, vereda, celular): la pedimos.
    const ticket = await firmarTicket({ proveedor, sub: perfil.sub, correo: perfil.correo }, 'registro-oauth');
    return res.json({ requiereRegistro: true, ticket, sugerido: { nombre: perfil.nombre, primerApellido: perfil.apellido, correoElectronico: perfil.correo } });
  }
  if (!usuario.activo) throw new HttpError(403, 'Tu cuenta está suspendida', 'CUENTA_SUSPENDIDA');
  usuario = await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoIngreso: new Date() } });
  await auditar(req, 'LOGIN_OK', { idUsuario: usuario.id, detalle: { proveedor } });
  res.json(await respuestaSesion(req, usuario, disp));
});

router.post('/oauth/completar', limiteRegistro, validar({ body: esquemaCompletar }), async (req, res) => {
  const b = req.datos.body;
  const t = await verificarTicket(b.ticket, 'registro-oauth');
  const datos = { ...b, correoElectronico: t.correo || null };
  await verificarDuplicados(datos);
  const usuario = await prisma.usuario.create({
    data: {
      ...camposPersonales(datos),
      nombre: b.nombre,
      primerApellido: b.primerApellido,
      segundoApellido: b.segundoApellido ?? null,
      ubicacion: b.ubicacion,
      proveedorAuth: t.proveedor,
      oauthHash: hashOauth(t.proveedor, t.sub),
      terminosVersion: config.terminosVersion,
    },
  });
  await auditar(req, 'REGISTRO', { idUsuario: usuario.id, detalle: { proveedor: t.proveedor } });
  res.status(201).json(await respuestaSesion(req, usuario, b.dispositivo));
});

// ================= Rutas con sesión =================

router.post('/logout', auth, async (req, res) => {
  await revocarSesion(req.user.sid);
  await auditar(req, 'LOGOUT');
  res.status(204).end();
});

router.post('/logout-todas', auth, async (req, res) => {
  await revocarTodas(req.user.id);
  await auditar(req, 'LOGOUT_TODAS');
  res.status(204).end();
});

router.get('/sesiones', auth, async (req, res) => {
  const sesiones = await prisma.sesion.findMany({
    where: { idUsuario: req.user.id, revocada: null, expira: { gt: new Date() } },
    select: { id: true, dispositivo: true, creada: true, ultimoUso: true },
    orderBy: { ultimoUso: 'desc' },
  });
  res.json(sesiones.map((s) => ({ ...s, actual: s.id === req.user.sid })));
});

router.delete('/sesiones/:id', auth, validar({ params: z.object({ id: z.string().uuid() }).strict() }), async (req, res) => {
  await prisma.sesion.updateMany({
    where: { id: req.datos.params.id, idUsuario: req.user.id, revocada: null },
    data: { revocada: new Date() },
  });
  res.status(204).end();
});

router.get('/me', auth, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: req.user.id } });
  res.json(usuarioPublico(usuario));
});

const esquemaPerfil = z
  .object({
    nombre: nombre.optional(),
    primerApellido: nombre.optional(),
    segundoApellido: textoOpcional(60),
    ubicacion: vereda.optional(),
    celular: celular.optional(),
    correoElectronico: correo,
  })
  .strict();

router.put('/me', auth, validar({ body: esquemaPerfil }), async (req, res) => {
  const b = req.datos.body;
  const cambiaCorreo = Object.hasOwn(req.body || {}, 'correoElectronico');
  const data = {};
  for (const k of ['nombre', 'primerApellido', 'segundoApellido', 'ubicacion']) if (b[k] !== undefined) data[k] = b[k];
  if (b.celular) Object.assign(data, camposPersonales({ celular: b.celular }));
  if (cambiaCorreo) Object.assign(data, camposPersonales({ correoElectronico: b.correoElectronico }));
  const usuario = await prisma.usuario.update({ where: { id: req.user.id }, data });
  if (b.celular || cambiaCorreo) await auditar(req, 'CONTACTO_CAMBIADO');
  res.json(usuarioPublico(usuario));
});

const esquemaContrasena = z.object({ contrasenaActual: z.string().max(128).optional(), contrasenaNueva: z.string().max(128) }).strict();

router.put('/contrasena', auth, limiteLogin, validar({ body: esquemaContrasena }), async (req, res) => {
  const { contrasenaActual, contrasenaNueva } = req.datos.body;
  const u = await prisma.usuario.findUnique({ where: { id: req.user.id } });
  // Si ya tiene contraseña, se exige la actual (quien robe el teléfono desbloqueado no puede cambiarla).
  if (u.contrasena && !(await verificarContrasena(contrasenaActual || '', u.contrasena))) {
    await auditar(req, 'CAMBIO_CONTRASENA_FALLIDO');
    throw new HttpError(401, 'La contraseña actual no es correcta');
  }
  const pub = usuarioPublico(u);
  const problema = problemaContrasena(contrasenaNueva, { documento: pub.documento, celular: pub.celular, nombre: u.nombre });
  if (problema) throw new HttpError(400, problema);

  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: u.id },
      data: { contrasena: await hashContrasena(contrasenaNueva), contrasenaCambiada: new Date() },
    }),
    // Cierra todas las OTRAS sesiones (por si alguien más conocía la contraseña)
    prisma.sesion.updateMany({ where: { idUsuario: u.id, revocada: null, NOT: { id: req.user.sid } }, data: { revocada: new Date() } }),
  ]);
  await auditar(req, 'CONTRASENA_CAMBIADA');
  res.status(204).end();
});

router.post('/push-token', auth, validar({ body: z.object({ token: z.string().regex(/^Expo(nent)?PushToken\[[\w-]+\]$/, 'Token inválido') }).strict() }), async (req, res) => {
  const { token } = req.datos.body;
  await prisma.pushToken.upsert({ where: { token }, create: { token, idUsuario: req.user.id }, update: { idUsuario: req.user.id, fecha: new Date() } });
  res.status(204).end();
});

// Derecho a la supresión de datos (Ley 1581 de 2012).
const esquemaEliminar = z.object({ confirmacion: z.literal('ELIMINAR'), contrasena: z.string().max(128).optional() }).strict();

router.delete('/me', auth, limiteLogin, validar({ body: esquemaEliminar }), async (req, res) => {
  const u = await prisma.usuario.findUnique({
    where: { id: req.user.id },
    include: { cultivos: { select: { fotoUrl: true } }, productos: { select: { fotoUrl: true } }, mensajes: { select: { imagenUrl: true } } },
  });
  if (u.contrasena && !(await verificarContrasena(req.datos.body.contrasena || '', u.contrasena))) {
    throw new HttpError(401, 'La contraseña no es correcta');
  }
  const fotos = [...u.cultivos.map((c) => c.fotoUrl), ...u.productos.map((p) => p.fotoUrl), ...u.mensajes.map((m) => m.imagenUrl)];
  await prisma.usuario.delete({ where: { id: u.id } }); // en cascada: cultivos, riegos, sesiones...
  await Promise.all(fotos.map(borrarImagen));
  await auditar(req, 'CUENTA_ELIMINADA', { idUsuario: u.id });
  res.status(204).end();
});

export default router;
