// Revisa el clima y crea las alertas y recomendaciones de riego AHORA (sin esperar las 5:00).
// Uso (en la carpeta backend):   npm run alertas
import 'dotenv/config';
import { revisarAlertas } from '../src/services/alertas.js';
import { prisma } from '../src/lib/prisma.js';

const creadas = await revisarAlertas();
console.log(`✅ Revisión terminada. Notificaciones nuevas: ${creadas}`);
console.log('   (Si sale 0: ya se habían creado hoy o no hay cultivos activos.)');
await prisma.$disconnect();
process.exit(0);
