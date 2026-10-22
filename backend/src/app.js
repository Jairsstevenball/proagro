import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { pinoHttp } from 'pino-http';
import { config } from './config.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './lib/http.js';
import { auth } from './middleware/auth.js';
import { cabeceras, soloHttps, sinCache, limiteGeneral } from './middleware/seguridad.js';
import { VEREDAS } from './data/veredas.js';
import authRoutes from './routes/auth.js';
import archivosRoutes from './routes/archivos.js';
import cultivosRoutes from './routes/cultivos.js';
import riegoRoutes from './routes/riego.js';
import estadisticasRoutes from './routes/estadisticas.js';
import climaRoutes from './routes/clima.js';
import notificacionesRoutes from './routes/notificaciones.js';
import agrobotRoutes from './routes/agrobot.js';
import mercadoRoutes from './routes/mercado.js';
import adminRoutes from './routes/admin.js';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy); // IP real detrás de Render/Railway (para los límites)
app.set('query parser', 'simple'); // evita objetos anidados en la query (?a[b]=c)

app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const id = crypto.randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    // Logs cortos: sin query, sin headers (ni tokens) y solo el código de respuesta
    serializers: {
      req: (r) => ({ id: r.id, method: r.method, url: r.url.split('?')[0] }),
      res: (r) => ({ statusCode: r.statusCode }),
    },
    autoLogging: { ignore: (req) => req.url === '/api/salud' },
  }),
);
app.use(soloHttps);
app.use(cabeceras);
app.use(cors({ origin: config.corsOrigins.length ? config.corsOrigins : false }));
app.use(limiteGeneral);
// Rutas que reciben foto en base64: hasta 12 MB. El resto: máximo 100 KB.
app.use(['/api/cultivos', '/api/mercado', '/api/agrobot'], express.json({ limit: '12mb', strict: true, type: 'application/json' }));
app.use(express.json({ limit: '100kb', strict: true, type: 'application/json' }));

app.get('/api/salud', (_req, res) => res.json({ ok: true }));
app.get('/api/veredas', (_req, res) => res.json(Object.keys(VEREDAS)));
app.get('/api/terminos', (_req, res) => res.json({ version: config.terminosVersion }));

// Fotos con URL firmada (antes de sinCache: las imágenes sí pueden guardarse en caché privada)
app.use('/api/archivos', archivosRoutes);

app.use('/api', sinCache);
app.use('/api/auth', authRoutes);
app.use('/api/cultivos', auth, cultivosRoutes);
app.use('/api/riego', auth, riegoRoutes);
app.use('/api/estadisticas', auth, estadisticasRoutes);
app.use('/api/clima', auth, climaRoutes);
app.use('/api/notificaciones', auth, notificacionesRoutes);
app.use('/api/agrobot', auth, agrobotRoutes);
app.use('/api/mercado', auth, mercadoRoutes);
app.use('/api/admin', auth, adminRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use(errorHandler);
