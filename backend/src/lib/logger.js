// Logs estructurados. Se ocultan contraseñas, tokens y datos personales automáticamente.
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-refresh-token"]',
      '*.contrasena',
      '*.contrasenaActual',
      '*.contrasenaNueva',
      '*.refreshToken',
      '*.token',
      '*.idToken',
      '*.documento',
      '*.celular',
      '*.correoElectronico',
    ],
    censor: '[OCULTO]',
  },
});
