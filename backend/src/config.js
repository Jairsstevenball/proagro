// Configuración validada al arrancar: si falta una clave o es débil, el servidor NO inicia.
import 'dotenv/config';
import { z } from 'zod';

const produccion = process.env.NODE_ENV === 'production';

// Clave de 32 bytes en base64 (genérala con: npm run claves)
const clave32 = (nombre) =>
  z.string({ required_error: `Falta ${nombre}` }).refine((v) => {
    try {
      return Buffer.from(v, 'base64').length === 32;
    } catch {
      return false;
    }
  }, `${nombre} debe ser 32 bytes en base64 (usa: npm run claves)`);

const lista = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []));

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  DATABASE_URL: z.string().min(1, 'Falta DATABASE_URL'),
  TRUST_PROXY: z.coerce.number().int().min(0).default(produccion ? 1 : 0),
  CORS_ORIGINS: lista, // la app móvil no necesita CORS; solo para un panel web futuro

  JWT_SECRET: z.string().min(48, 'JWT_SECRET debe tener al menos 48 caracteres (usa: npm run claves)'),
  ACCESS_TOKEN_MIN: z.coerce.number().int().min(5).max(60).default(15),
  REFRESH_TOKEN_DIAS: z.coerce.number().int().min(1).max(60).default(30),
  SESION_MAX_DIAS: z.coerce.number().int().min(1).max(365).default(90),

  DATA_KEY: clave32('DATA_KEY'), // cifra cédula, celular y correo
  INDEX_KEY: clave32('INDEX_KEY'), // hash ciego para buscar sin descifrar
  FILE_KEY: clave32('FILE_KEY'), // firma las URLs de las fotos
  PASSWORD_PEPPER: z.string().min(32, 'PASSWORD_PEPPER debe tener al menos 32 caracteres'),

  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),
  // Modelos de respaldo si el principal está saturado (separados por coma)
  GEMINI_RESPALDO: lista.default('gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite'),
  AGROBOT_DIARIO: z.coerce.number().int().min(1).default(30),

  GOOGLE_CLIENT_IDS: lista,
  MICROSOFT_CLIENT_ID: z.string().default(''),

  ALERTAS_CRON: z.string().default('0 5,17 * * *'),
  UPLOAD_DIR: z.string().default('uploads'),
  TERMINOS_VERSION: z.string().default('2026-10'),
});

const r = esquema.safeParse(process.env);
if (!r.success) {
  console.error('\n❌ Configuración inválida en .env:');
  for (const i of r.error.issues) console.error(`   - ${i.path.join('.')}: ${i.message}`);
  console.error('   Copia .env.example a .env y corre "npm run claves" para generar las claves.\n');
  process.exit(1);
}
const e = r.data;

if (e.NODE_ENV === 'production' && !e.PUBLIC_URL.startsWith('https://')) {
  console.error('❌ En producción PUBLIC_URL debe usar https://');
  process.exit(1);
}

export const config = {
  env: e.NODE_ENV,
  produccion: e.NODE_ENV === 'production',
  port: e.PORT,
  publicUrl: e.PUBLIC_URL.replace(/\/$/, ''),
  trustProxy: e.TRUST_PROXY,
  corsOrigins: e.CORS_ORIGINS,
  jwtSecret: new TextEncoder().encode(e.JWT_SECRET),
  accessMin: e.ACCESS_TOKEN_MIN,
  refreshDias: e.REFRESH_TOKEN_DIAS,
  sesionMaxDias: e.SESION_MAX_DIAS,
  dataKey: Buffer.from(e.DATA_KEY, 'base64'),
  indexKey: Buffer.from(e.INDEX_KEY, 'base64'),
  fileKey: Buffer.from(e.FILE_KEY, 'base64'),
  pepper: Buffer.from(e.PASSWORD_PEPPER),
  geminiApiKey: e.GEMINI_API_KEY,
  geminiModel: e.GEMINI_MODEL,
  geminiModelos: [...new Set([e.GEMINI_MODEL, ...e.GEMINI_RESPALDO])],
  agrobotDiario: e.AGROBOT_DIARIO,
  googleClientIds: e.GOOGLE_CLIENT_IDS,
  microsoftClientId: e.MICROSOFT_CLIENT_ID,
  alertasCron: e.ALERTAS_CRON,
  uploadDir: e.UPLOAD_DIR,
  terminosVersion: e.TERMINOS_VERSION,
  timezone: 'America/Bogota',
  issuer: 'proagro-api',
  audience: 'proagro-app',
};
