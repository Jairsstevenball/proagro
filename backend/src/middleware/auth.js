// Exige "Authorization: Bearer <accessToken>". En CADA petición se revisa en la base de datos
// que la sesión siga viva y que la cuenta no esté bloqueada: cerrar sesión o bloquear a un
// usuario tiene efecto inmediato, sin esperar a que venza el token.
import { prisma } from '../lib/prisma.js';
import { verificarAccess } from '../services/tokens.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function auth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return res.status(401).json({ error: 'Debes iniciar sesión', codigo: 'SIN_TOKEN' });

  let payload;
  try {
    payload = await verificarAccess(token);
  } catch (e) {
    const vencido = e?.code === 'ERR_JWT_EXPIRED';
    return res.status(401).json({
      error: vencido ? 'Sesión vencida' : 'Sesión inválida',
      codigo: vencido ? 'TOKEN_VENCIDO' : 'TOKEN_INVALIDO',
    });
  }
  if (!UUID.test(payload.sid || '') || !UUID.test(payload.sub || '')) {
    return res.status(401).json({ error: 'Sesión inválida', codigo: 'TOKEN_INVALIDO' });
  }

  const sesion = await prisma.sesion.findUnique({
    where: { id: payload.sid },
    select: {
      revocada: true,
      expiraAbsoluta: true,
      usuario: { select: { id: true, rol: true, activo: true, tokenVersion: true, ubicacion: true } },
    },
  });
  const u = sesion?.usuario;
  if (!sesion || sesion.revocada || sesion.expiraAbsoluta < new Date() || !u || u.id !== payload.sub || u.tokenVersion !== payload.tv) {
    return res.status(401).json({ error: 'Sesión cerrada. Ingresa de nuevo', codigo: 'SESION_INVALIDA' });
  }
  if (!u.activo) return res.status(403).json({ error: 'Tu cuenta está suspendida', codigo: 'CUENTA_SUSPENDIDA' });

  // El rol sale de la BD, no del token: si le quitan el rol de admin, aplica de inmediato.
  req.user = { id: u.id, rol: u.rol, ubicacion: u.ubicacion, sid: payload.sid };
  next();
}

export function soloAdmin(req, res, next) {
  if (req.user?.rol !== 'ADMIN') return res.status(403).json({ error: 'Solo administradores' });
  next();
}
