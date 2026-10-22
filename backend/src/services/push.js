// Notificaciones push con el servicio gratuito de Expo: https://docs.expo.dev/push-notifications/sending-notifications/
// Los mensajes NO llevan datos personales: solo el título y consejo de la alerta.
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

const URL = 'https://exp.host/--/api/v2/push/send';

export async function enviarPush(mensajes) {
  for (let i = 0; i < mensajes.length; i += 100) {
    const lote = mensajes.slice(i, i + 100);
    try {
      const res = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(lote),
        signal: AbortSignal.timeout(15000),
      });
      const { data = [] } = await res.json();
      // Tokens de teléfonos que desinstalaron la app: se borran.
      const invalidos = data
        .map((r, idx) => (r.status === 'error' && r.details?.error === 'DeviceNotRegistered' ? lote[idx].to : null))
        .filter(Boolean);
      if (invalidos.length) await prisma.pushToken.deleteMany({ where: { token: { in: invalidos } } });
    } catch (e) {
      logger.warn({ msg: e.message }, '[push] no se pudo enviar el lote');
    }
  }
}
