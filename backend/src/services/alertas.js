// Genera notificaciones de clima y de cultivo para los usuarios de cada vereda
// y las envía como notificación push (Expo Push, gratis).
import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { obtenerPronostico, guardarSnapshot, detectarRiesgos } from './clima.js';
import { consejoCultivo } from '../data/cultivos.js';
import { enviarPush } from './push.js';

/** Convierte los riesgos en alertas "Alerta Clima" + "Alerta Cultivo" (como en el mockup). */
export function construirAlertas(riesgos, cultivosActivos) {
  const alertas = [];
  for (const r of riesgos) {
    alertas.push({ tipoAlerta: 'CLIMA', nivel: r.nivel, titulo: r.titulo, mensaje: r.mensaje, riesgo: r.riesgo });
    for (const c of cultivosActivos) {
      const consejo = consejoCultivo(r.riesgo, c.tipoCultivo);
      if (consejo) {
        alertas.push({
          tipoAlerta: 'CULTIVO', nivel: r.nivel, idCultivo: c.idCultivo,
          titulo: `${c.tipoCultivo}: ${r.titulo.toLowerCase()}`, mensaje: consejo, riesgo: r.riesgo,
        });
      }
    }
  }
  return alertas;
}

async function yaExiste(idUsuario, a, desde) {
  const n = await prisma.notificacionAlerta.count({
    where: { idUsuario, titulo: a.titulo, idCultivo: a.idCultivo ?? null, fecha: { gte: desde } },
  });
  return n > 0;
}

/** Revisa el clima de todas las veredas con usuarios y guarda alertas nuevas (sin duplicar en 24 h). */
export async function revisarAlertas() {
  const veredas = await prisma.usuario.findMany({ where: { activo: true }, distinct: ['ubicacion'], select: { ubicacion: true } });
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let creadas = 0;
  const mensajesPush = [];

  for (const { ubicacion } of veredas) {
    try {
      const pronostico = await obtenerPronostico(ubicacion);
      const clima = await guardarSnapshot(pronostico);
      const riesgos = detectarRiesgos(pronostico);
      if (!riesgos.length) continue;

      const usuarios = await prisma.usuario.findMany({
        where: { ubicacion, activo: true },
        select: {
          id: true,
          pushTokens: { select: { token: true } },
          cultivos: { where: { estado: 'ACTIVO' }, select: { idCultivo: true, tipoCultivo: true } },
        },
      });

      for (const u of usuarios) {
        const nuevas = [];
        for (const a of construirAlertas(riesgos, u.cultivos)) {
          if (await yaExiste(u.id, a, desde)) continue;
          await prisma.notificacionAlerta.create({
            data: {
              idUsuario: u.id, idClima: clima.idClima, idCultivo: a.idCultivo ?? null,
              tipoAlerta: a.tipoAlerta, nivel: a.nivel, titulo: a.titulo, mensaje: a.mensaje,
            },
          });
          nuevas.push(a);
          creadas++;
        }
        // Un solo push por persona con la alerta más grave (no llenarle el teléfono).
        const principal = nuevas.find((a) => a.nivel === 'PELIGRO') || nuevas[0];
        if (principal) {
          for (const { token } of u.pushTokens) {
            mensajesPush.push({ to: token, title: principal.titulo, body: principal.mensaje, sound: 'default', data: { pantalla: 'notificaciones' } });
          }
        }
      }
    } catch (e) {
      logger.error({ vereda: ubicacion, msg: e.message }, '[alertas] error');
    }
  }
  await enviarPush(mensajesPush);
  logger.info({ creadas, push: mensajesPush.length }, '[alertas] revisión terminada');
  return creadas;
}

export function iniciarCronAlertas() {
  cron.schedule(config.alertasCron, () => revisarAlertas().catch((e) => logger.error(e)), { timezone: config.timezone });
  logger.info(`[alertas] programadas con cron "${config.alertasCron}" (${config.timezone})`);
}
