// Cliente HTTP de ProAgro.
//  - El access token solo está en memoria (se pierde al cerrar la app: es lo deseado).
//  - Si vence, se renueva UNA sola vez con el refresh token aunque haya varias peticiones a la vez.
//  - En producción se niega a hablar con un servidor que no sea HTTPS.
//  - Tiempo máximo por petición para no dejar la app colgada con mala señal en el campo.
import { leerRefresh, guardarRefresh, borrarRefresh } from '../auth/almacen';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');

if (!__DEV__ && !API_URL.startsWith('https://')) {
  throw new Error('EXPO_PUBLIC_API_URL debe usar https:// en producción');
}

export class ApiError extends Error {
  constructor(status, mensaje, codigo) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
  }
}

let accessToken = null;
let accessVence = 0; // momento (ms) en que vence el access token
let alPerderSesion = () => {};
let renovando = null;

export const fijarAccessToken = (t, expiraEnSeg = 15 * 60) => {
  accessToken = t;
  accessVence = t ? Date.now() + expiraEnSeg * 1000 : 0;
};
// ¿El token vence en menos de 1 minuto? (o ya venció)
const porVencer = () => !accessToken || Date.now() > accessVence - 60_000;
export const alPerderSesionHacer = (fn) => {
  alPerderSesion = fn;
};

async function conTiempo(url, opciones, ms) {
  const control = new AbortController();
  const t = setTimeout(() => control.abort(), ms);
  try {
    return await fetch(url, { ...opciones, signal: control.signal });
  } catch (e) {
    if (e.name === 'AbortError') throw new ApiError(0, 'La conexión está muy lenta. Intenta de nuevo', 'TIEMPO');
    throw new ApiError(0, 'Sin conexión. Revisa tu internet', 'SIN_RED');
  } finally {
    clearTimeout(t);
  }
}

async function leerRespuesta(res) {
  const tipo = res.headers.get('content-type') || '';
  const datos = tipo.includes('application/json') ? await res.json().catch(() => null) : null;
  if (!res.ok) throw new ApiError(res.status, datos?.error || 'Ocurrió un error. Intenta de nuevo', datos?.codigo);
  return datos;
}

/** Renueva la sesión. Si varias peticiones lo piden a la vez, comparten la misma promesa. */
export function renovarSesion() {
  if (!renovando) {
    renovando = (async () => {
      const refreshToken = await leerRefresh();
      if (!refreshToken) throw new ApiError(401, 'Sin sesión', 'SIN_SESION');
      const res = await conTiempo(
        `${API_URL}/auth/refresh`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) },
        15000,
      );
      try {
        const datos = await leerRespuesta(res);
        await guardarRefresh(datos.refreshToken);
        fijarAccessToken(datos.accessToken, datos.expiraEn);
        return datos.accessToken;
      } catch (e) {
        if (e.status === 401) {
          await borrarRefresh();
          accessToken = null;
        }
        throw e;
      }
    })().finally(() => {
      renovando = null;
    });
  }
  return renovando;
}

/**
 * @param ruta  '/cultivos'
 * @param op.metodo  GET | POST | PUT | PATCH | DELETE
 * @param op.body  objeto JSON
 * @param op.form  FormData (para fotos)
 * @param op.auth  false para rutas públicas
 */
export async function pedir(ruta, { metodo = 'GET', body, form, auth = true, tiempo = 20000 } = {}, reintento = true) {
  // Si el token está por vencer, renovamos ANTES (evita reenviar fotos pesadas dos veces).
  if (auth && reintento && porVencer()) {
    try {
      await renovarSesion();
    } catch (e) {
      if (e.status === 401) alPerderSesion(e.message);
      throw e;
    }
  }
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await conTiempo(`${API_URL}${ruta}`, { method: metodo, headers, body: form || (body ? JSON.stringify(body) : undefined) }, tiempo);

  if (res.status === 401 && auth) {
    const datos = await res.json().catch(() => null);
    const codigo = datos?.codigo;
    // Token vencido (normal cada 15 min): se renueva y se repite la petición una vez.
    if ((codigo === 'TOKEN_VENCIDO' || (!accessToken && codigo === 'SIN_TOKEN')) && reintento) {
      try {
        await renovarSesion();
      } catch (e) {
        if (e.status === 401) alPerderSesion(e.message);
        throw e;
      }
      return pedir(ruta, { metodo, body, form, auth, tiempo }, false);
    }
    // Sesión cerrada en el servidor (cerró en todos los dispositivos, robo detectado...)
    if (['SESION_INVALIDA', 'TOKEN_INVALIDO', 'SIN_TOKEN', 'SESION_REVOCADA'].includes(codigo)) {
      await borrarRefresh();
      accessToken = null;
      alPerderSesion(datos?.error);
    }
    // Otro 401 (ej. "contraseña actual incorrecta"): es un error normal del formulario.
    throw new ApiError(401, datos?.error || 'No autorizado', codigo);
  }
  if (res.status === 403) {
    const datos = await res.json().catch(() => null);
    if (datos?.codigo === 'CUENTA_SUSPENDIDA') {
      await borrarRefresh();
      accessToken = null;
      alPerderSesion(datos.error);
    }
    throw new ApiError(403, datos?.error || 'No tienes permiso', datos?.codigo);
  }
  return leerRespuesta(res);
}

/** Arma un FormData con campos de texto y una foto opcional { uri }. */
export function formulario(campos, foto) {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) {
    if (v !== undefined && v !== null && v !== '') f.append(k, String(v));
  }
  if (foto?.uri) f.append('foto', { uri: foto.uri, name: 'foto.jpg', type: 'image/jpeg' });
  return f;
}
