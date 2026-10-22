// Bitácora de seguridad: quién hizo qué y cuándo (sin guardar IP real ni datos personales).
import { prisma } from './prisma.js';
import { hashIp } from './proteccion.js';
import { logger } from './logger.js';

export async function auditar(req, evento, { idUsuario = null, detalle = null } = {}) {
  try {
    await prisma.auditoria.create({
      data: {
        idUsuario: idUsuario ?? req?.user?.id ?? null,
        evento,
        ipHash: req ? hashIp(req.ip) : null,
        userAgent: req?.get?.('user-agent')?.slice(0, 200) ?? null,
        detalle,
      },
    });
  } catch (err) {
    // La auditoría nunca debe tumbar la petición.
    logger.error({ err, evento }, 'no se pudo auditar');
  }
}
