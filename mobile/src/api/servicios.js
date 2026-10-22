// Todas las llamadas al backend en un solo lugar.
import { pedir } from './cliente';

// Campos + foto en una sola petición JSON. Se omiten los campos vacíos.
const conFoto = (campos, foto) => {
  const body = {};
  for (const [k, v] of Object.entries(campos)) if (v !== undefined && v !== null && v !== '') body[k] = v;
  if (foto?.base64) body.fotoBase64 = foto.base64;
  return body;
};

const q = (obj = {}) => {
  const p = Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return p.length ? `?${p.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}` : '';
};

export const authApi = {
  veredas: () => pedir('/veredas', { auth: false }),
  registro: (datos) => pedir('/auth/registro', { metodo: 'POST', body: datos, auth: false }),
  login: (datos) => pedir('/auth/login', { metodo: 'POST', body: datos, auth: false }),
  oauth: (datos) => pedir('/auth/oauth', { metodo: 'POST', body: datos, auth: false }),
  completarOauth: (datos) => pedir('/auth/oauth/completar', { metodo: 'POST', body: datos, auth: false }),
  logout: () => pedir('/auth/logout', { metodo: 'POST' }),
  logoutTodas: () => pedir('/auth/logout-todas', { metodo: 'POST' }),
  yo: () => pedir('/auth/me'),
  actualizarPerfil: (datos) => pedir('/auth/me', { metodo: 'PUT', body: datos }),
  cambiarContrasena: (datos) => pedir('/auth/contrasena', { metodo: 'PUT', body: datos }),
  sesiones: () => pedir('/auth/sesiones'),
  cerrarSesion: (id) => pedir(`/auth/sesiones/${id}`, { metodo: 'DELETE' }),
  eliminarCuenta: (datos) => pedir('/auth/me', { metodo: 'DELETE', body: datos }),
  pushToken: (token) => pedir('/auth/push-token', { metodo: 'POST', body: { token } }),
};

export const climaApi = {
  resumen: () => pedir('/clima/resumen'),
};

export const notificacionesApi = {
  lista: () => pedir('/notificaciones'),
  noLeidas: () => pedir('/notificaciones/no-leidas'),
  leerTodas: () => pedir('/notificaciones/leer-todas', { metodo: 'PATCH' }),
};

export const cultivosApi = {
  tipos: () => pedir('/cultivos/tipos'),
  lista: (estado) => pedir(`/cultivos${q({ estado })}`),
  uno: (id) => pedir(`/cultivos/${id}`),
  crear: (campos, foto) => pedir('/cultivos', { metodo: 'POST', body: conFoto(campos, foto), tiempo: 60000 }),
  actualizar: (id, campos, foto) => pedir(`/cultivos/${id}`, { metodo: 'PUT', body: conFoto(campos, foto), tiempo: 60000 }),
  estado: (id, estado) => pedir(`/cultivos/${id}/estado`, { metodo: 'PATCH', body: { estado } }),
  eliminar: (id) => pedir(`/cultivos/${id}`, { metodo: 'DELETE' }),
};

export const riegoApi = {
  metodos: () => pedir('/riego/metodos'),
  historial: (idCultivo) => pedir(`/riego/cultivo/${idCultivo}`),
  registrar: (idCultivo, datos) => pedir(`/riego/cultivo/${idCultivo}`, { metodo: 'POST', body: datos }),
  recomendacion: (idCultivo) => pedir(`/riego/cultivo/${idCultivo}/recomendacion`),
};

export const estadisticasApi = {
  ver: (idCultivo, anio, mes) => pedir(`/estadisticas/${idCultivo}${q({ anio, mes })}`),
  guardar: (idCultivo, datos) => pedir(`/estadisticas/${idCultivo}`, { metodo: 'PUT', body: datos }),
};

export const agrobotApi = {
  historial: () => pedir('/agrobot/historial'),
  cupo: () => pedir('/agrobot/cupo'),
  enviar: (mensaje, foto, idCultivo) =>
    pedir('/agrobot', { metodo: 'POST', body: conFoto({ mensaje, idCultivo }, foto), tiempo: 60000 }),
  borrar: () => pedir('/agrobot/historial', { metodo: 'DELETE' }),
};

export const mercadoApi = {
  catalogos: () => pedir('/mercado/catalogos'),
  lista: (filtros) => pedir(`/mercado${q(filtros)}`),
  mios: () => pedir('/mercado/mios'),
  uno: (id) => pedir(`/mercado/${id}`),
  crear: (campos, foto) => pedir('/mercado', { metodo: 'POST', body: conFoto(campos, foto), tiempo: 60000 }),
  actualizar: (id, campos, foto) => pedir(`/mercado/${id}`, { metodo: 'PUT', body: conFoto(campos, foto), tiempo: 60000 }),
  estado: (id, estado) => pedir(`/mercado/${id}/estado`, { metodo: 'PATCH', body: { estado } }),
  eliminar: (id) => pedir(`/mercado/${id}`, { metodo: 'DELETE' }),
  contactar: (id) => pedir(`/mercado/${id}/contacto`, { metodo: 'POST' }),
  reportar: (id, datos) => pedir(`/mercado/${id}/reportar`, { metodo: 'POST', body: datos }),
};
