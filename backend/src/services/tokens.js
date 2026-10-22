// Sesiones con dos tokens:
//  - access token (JWT, 15 min): va en cada petición. Si lo roban, sirve muy poco tiempo.
//  - refresh token (aleatorio, 30 días): solo sirve para pedir otro access token y ROTA en
//    cada uso. Si alguien usa un refresh token viejo (robado), se cierran TODAS las sesiones.
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { sha256, tokenAleatorio, igualesSeguro } from '../lib/cripto.js';
import { hashIp } from '../lib/proteccion.js';
import { HttpError } from '../lib/http.js';
import { auditar } from '../lib/auditoria.js';

const DIA = 864e5;

export async function firmarAccess(usuario, idSesion) {
  return new SignJWT({ rol: usuario.rol, tv: usuario.tokenVersion, sid: idSesion })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(usuario.id)
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setIssuedAt()
    .setExpirationTime(`${config.accessMin}m`)
    .sign(config.jwtSecret);
}

export async function verificarAccess(token) {
  const { payload } = await jwtVerify(token, config.jwtSecret, {
    issuer: config.issuer,
    audience: config.audience,
    algorithms: ['HS256'], // fija el algoritmo: evita ataques "alg: none"
  });
  return payload;
}

/** Tokens cortos de un solo propósito (ej. completar registro con Google). */
export async function firmarTicket(datos, proposito, minutos = 10) {
  return new SignJWT(datos)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(config.issuer)
    .setAudience(`${config.audience}:${proposito}`)
    .setIssuedAt()
    .setExpirationTime(`${minutos}m`)
    .sign(config.jwtSecret);
}

export async function verificarTicket(ticket, proposito) {
  try {
    const { payload } = await jwtVerify(ticket, config.jwtSecret, {
      issuer: config.issuer,
      audience: `${config.audience}:${proposito}`,
      algorithms: ['HS256'],
    });
    return payload;
  } catch {
    throw new HttpError(401, 'El enlace venció. Vuelve a intentarlo');
  }
}

const armarRefresh = (idSesion, secreto) => `${idSesion}.${secreto}`;

/** Crea una sesión nueva y devuelve { accessToken, refreshToken, expiraEn }. */
export async function crearSesion(req, usuario, dispositivo) {
  const secreto = tokenAleatorio(32);
  const ahora = Date.now();
  const sesion = await prisma.sesion.create({
    data: {
      idUsuario: usuario.id,
      tokenHash: sha256(secreto),
      dispositivo: dispositivo?.slice(0, 80) || null,
      ipHash: hashIp(req.ip),
      expira: new Date(ahora + config.refreshDias * DIA),
      expiraAbsoluta: new Date(ahora + config.sesionMaxDias * DIA),
    },
  });
  return {
    accessToken: await firmarAccess(usuario, sesion.id),
    refreshToken: armarRefresh(sesion.id, secreto),
    expiraEn: config.accessMin * 60,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Rota el refresh token. Detecta reutilización y revoca todo si hay sospecha de robo. */
export async function rotarSesion(req, refreshToken) {
  const [idSesion, secreto] = String(refreshToken || '').split('.');
  if (!UUID.test(idSesion || '') || !secreto) throw new HttpError(401, 'Sesión inválida', 'SESION_INVALIDA');

  const sesion = await prisma.sesion.findUnique({ where: { id: idSesion }, include: { usuario: true } });
  if (!sesion) throw new HttpError(401, 'Sesión inválida', 'SESION_INVALIDA');

  const hashRecibido = sha256(secreto);
  const ahora = new Date();

  // ¿Usaron el token ANTERIOR? => alguien copió el token. Cerramos todas las sesiones.
  if (sesion.tokenAnterior && igualesSeguro(hashRecibido, sesion.tokenAnterior)) {
    await prisma.$transaction([
      prisma.sesion.updateMany({ where: { idUsuario: sesion.idUsuario, revocada: null }, data: { revocada: ahora } }),
      prisma.usuario.update({ where: { id: sesion.idUsuario }, data: { tokenVersion: { increment: 1 } } }),
    ]);
    await auditar(req, 'REUSO_TOKEN', { idUsuario: sesion.idUsuario, detalle: { idSesion } });
    throw new HttpError(401, 'Por seguridad cerramos tus sesiones. Ingresa de nuevo', 'SESION_REVOCADA');
  }

  if (
    !igualesSeguro(hashRecibido, sesion.tokenHash) ||
    sesion.revocada ||
    sesion.expira < ahora ||
    sesion.expiraAbsoluta < ahora ||
    !sesion.usuario.activo
  ) {
    throw new HttpError(401, 'Tu sesión venció. Ingresa de nuevo', 'SESION_INVALIDA');
  }

  const nuevo = tokenAleatorio(32);
  // Actualización condicional: si dos peticiones rotan a la vez, solo una gana.
  const r = await prisma.sesion.updateMany({
    where: { id: sesion.id, tokenHash: sesion.tokenHash },
    data: {
      tokenAnterior: sesion.tokenHash,
      tokenHash: sha256(nuevo),
      ultimoUso: ahora,
      expira: new Date(Math.min(ahora.getTime() + config.refreshDias * DIA, sesion.expiraAbsoluta.getTime())),
    },
  });
  if (r.count !== 1) throw new HttpError(401, 'Sesión inválida', 'SESION_INVALIDA');

  return {
    accessToken: await firmarAccess(sesion.usuario, sesion.id),
    refreshToken: armarRefresh(sesion.id, nuevo),
    expiraEn: config.accessMin * 60,
  };
}

export async function revocarSesion(idSesion) {
  await prisma.sesion.updateMany({ where: { id: idSesion, revocada: null }, data: { revocada: new Date() } });
}

export async function revocarTodas(idUsuario) {
  await prisma.$transaction([
    prisma.sesion.updateMany({ where: { idUsuario, revocada: null }, data: { revocada: new Date() } }),
    prisma.usuario.update({ where: { id: idUsuario }, data: { tokenVersion: { increment: 1 } } }),
  ]);
}
