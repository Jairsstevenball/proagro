// Clima a prueba de caídas.
//
//  1. Open-Meteo (principal): gratis, sin llave, trae ET0 FAO-56. UNA sola consulta trae las 4 veredas.
//  2. MET Noruega (respaldo): gratis, sin llave. Si Open-Meteo falla o limita la IP compartida de Render.
//     No trae ET0: se calcula con la fórmula de Hargreaves (FAO-56, ecuación 52).
//  3. Caché en memoria + en la base de datos (tabla clima_cache): sobrevive a reinicios de Render.
//     Datos frescos por 60 min; hasta 3 h se responde al instante y se actualiza por detrás. Si TODO falla, se responde con el último dato guardado (hasta 48 h)
//     marcado como "desactualizado", en vez de un "Error interno del servidor".
import { VEREDAS, VEREDA_POR_DEFECTO } from '../data/veredas.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { HttpError } from '../lib/http.js';

const FRESCO_MS = 60 * 60 * 1000; // 1 hora: después se actualiza
const USABLE_MS = 3 * 60 * 60 * 1000; // hasta 3 h se responde al instante y se actualiza por detrás
const MAX_VIEJO_MS = 48 * 60 * 60 * 1000; // 2 días
const ESPERA_TRAS_FALLO_MS = 2 * 60 * 1000; // no insistir a proveedores caídos más de 1 vez cada 2 min
const USER_AGENT = process.env.CLIMA_USER_AGENT || 'ProAgro/1.1 (proyecto academico UCundinamarca; https://github.com/Jairsstevenball)';

const memoria = new Map(); // vereda -> { t, data }
let cargadoDeBd = false;
let refrescoEnCurso = null;
let ultimoFallo = 0;

// Códigos WMO -> texto en español
const CONDICION = {
  0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
  45: 'Niebla', 48: 'Niebla con escarcha',
  51: 'Llovizna ligera', 53: 'Llovizna', 55: 'Llovizna intensa',
  56: 'Llovizna helada', 57: 'Llovizna helada intensa',
  61: 'Lluvia ligera', 63: 'Lluvia', 65: 'Lluvia fuerte',
  66: 'Lluvia helada', 67: 'Lluvia helada fuerte',
  71: 'Nevada ligera', 73: 'Nevada', 75: 'Nevada fuerte', 77: 'Granos de nieve',
  80: 'Chubascos ligeros', 81: 'Chubascos', 82: 'Chubascos fuertes',
  85: 'Chubascos de nieve', 86: 'Chubascos de nieve fuertes',
  95: 'Tormenta', 96: 'Tormenta con granizo', 99: 'Tormenta con granizo fuerte',
};
export const condicionTexto = (code) => CONDICION[code] ?? 'Sin dato';

/** Fecha de hoy en Colombia (YYYY-MM-DD). */
const hoyBogota = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);

/** Reacomoda pasados/hoy/próximos según la fecha de HOY (importa cuando el dato es de ayer). */
function alDia(data) {
  const hoy = hoyBogota();
  const porFecha = new Map();
  for (const d of [...(data.pasados || []), ...(data.proximos || [])]) porFecha.set(d.fecha, d);
  const dias = [...porFecha.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
  return {
    ...data,
    pasados: dias.filter((x) => x.fecha < hoy).slice(-7),
    hoy: dias.find((x) => x.fecha === hoy) || dias.find((x) => x.fecha > hoy) || null,
    proximos: dias.filter((x) => x.fecha >= hoy),
  };
}

async function pedirJson(url, intentos = 2) {
  let ultimo;
  for (let i = 0; i < intentos; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (res.ok) return await res.json();
      ultimo = new Error(`respondió ${res.status}`);
      if (![429, 500, 502, 503, 504].includes(res.status)) break; // error definitivo: no reintentar
    } catch (e) {
      ultimo = e; // sin red, timeout
    }
    if (i < intentos - 1) await new Promise((r) => setTimeout(r, 1500));
  }
  throw ultimo;
}

// ---------------- Proveedor 1: Open-Meteo (las 4 veredas en una sola consulta) ----------------
async function openMeteoTodas() {
  const nombres = Object.keys(VEREDAS);
  const params = new URLSearchParams({
    latitude: nombres.map((n) => VEREDAS[n].lat).join(','),
    longitude: nombres.map((n) => VEREDAS[n].lon).join(','),
    timezone: 'America/Bogota',
    past_days: '7',
    forecast_days: '7',
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation,is_day',
    daily: [
      'weather_code', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_sum',
      'precipitation_probability_max', 'wind_speed_10m_max', 'wind_gusts_10m_max',
      'et0_fao_evapotranspiration',
    ].join(','),
  });
  const json = await pedirJson(`https://api.open-meteo.com/v1/forecast?${params}`);
  const lista = Array.isArray(json) ? json : [json]; // con varias coordenadas responde una lista
  const salida = new Map();
  nombres.forEach((vereda, i) => lista[i] && salida.set(vereda, armarOpenMeteo(vereda, lista[i])));
  return salida;
}

function armarOpenMeteo(vereda, raw) {
  const d = raw.daily;
  const dias = d.time.map((fecha, i) => ({
    fecha,
    codigo: d.weather_code[i],
    condicion: condicionTexto(d.weather_code[i]),
    tMax: d.temperature_2m_max[i],
    tMin: d.temperature_2m_min[i],
    lluviaMm: d.precipitation_sum[i] ?? 0,
    probLluvia: d.precipitation_probability_max[i] ?? null,
    vientoMax: d.wind_speed_10m_max[i],
    rachaMax: d.wind_gusts_10m_max[i],
    et0: d.et0_fao_evapotranspiration[i] ?? 0,
  }));
  const hoy = raw.current.time.slice(0, 10);
  return {
    vereda,
    fuente: 'Open-Meteo',
    actual: {
      fechaHora: raw.current.time,
      temperatura: raw.current.temperature_2m,
      humedad: raw.current.relative_humidity_2m,
      viento: raw.current.wind_speed_10m,
      precipitacion: raw.current.precipitation,
      codigo: raw.current.weather_code,
      condicion: condicionTexto(raw.current.weather_code),
      esDia: raw.current.is_day === 1,
    },
    pasados: dias.filter((x) => x.fecha < hoy),
    hoy: dias.find((x) => x.fecha === hoy),
    proximos: dias.filter((x) => x.fecha >= hoy),
  };
}

// ---------------- Proveedor 2: MET Noruega (api.met.no) ----------------
// symbol_code de MET -> código WMO aproximado (para reutilizar textos y reglas de riesgo)
function simboloAWmo(s = '') {
  const b = s.replace(/_(day|night|polartwilight)$/, '');
  if (b.includes('thunder')) return 95;
  if (b.includes('sleet') || b.includes('snow')) return 71;
  if (b === 'heavyrain') return 65;
  if (b === 'rain') return 63;
  if (b === 'lightrain') return 61;
  if (b === 'heavyrainshowers') return 82;
  if (b === 'rainshowers') return 81;
  if (b === 'lightrainshowers') return 80;
  if (b === 'fog') return 45;
  if (b === 'cloudy') return 3;
  if (b === 'partlycloudy') return 2;
  if (b === 'fair') return 1;
  if (b === 'clearsky') return 0;
  return 3;
}

/** ET0 por Hargreaves (FAO-56 ec. 52), en mm/día. Ra = radiación extraterrestre (FAO-56 ec. 21). */
export function et0Hargreaves(tMax, tMin, latitud, fecha) {
  if (tMax == null || tMin == null || tMax < tMin) return 0;
  const inicio = Date.UTC(Number(fecha.slice(0, 4)), 0, 1);
  const J = Math.floor((Date.parse(fecha) - inicio) / 864e5) + 1;
  const phi = (latitud * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos(((2 * Math.PI) / 365) * J);
  const delta = 0.409 * Math.sin(((2 * Math.PI) / 365) * J - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(delta))));
  const Ra = ((24 * 60) / Math.PI) * 0.082 * dr * (ws * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(ws));
  const et0 = 0.0023 * ((tMax + tMin) / 2 + 17.8) * Math.sqrt(tMax - tMin) * Ra * 0.408;
  return Math.round(Math.max(0, et0) * 100) / 100;
}

async function metNoruega(vereda, anterior) {
  const { lat, lon } = VEREDAS[vereda];
  const json = await pedirJson(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`, 1);
  const serie = json?.properties?.timeseries;
  if (!Array.isArray(serie) || !serie.length) throw new Error('MET Noruega sin datos');

  const local = (iso) => new Date(Date.parse(iso) - 5 * 3600e3).toISOString(); // hora Colombia
  const porDia = new Map();
  for (const p of serie) {
    const fecha = local(p.time).slice(0, 10);
    const det = p.data.instant.details;
    const d = porDia.get(fecha) || { temps: [], vientos: [], lluvia: 0, codigos: [] };
    d.temps.push(det.air_temperature);
    d.vientos.push((det.wind_speed ?? 0) * 3.6);
    const n1 = p.data.next_1_hours;
    const n6 = p.data.next_6_hours;
    if (n1) d.lluvia += n1.details?.precipitation_amount ?? 0;
    else if (n6) d.lluvia += n6.details?.precipitation_amount ?? 0; // después de ~2 días los datos vienen cada 6 h
    const sim = (n1 || n6)?.summary?.symbol_code;
    if (sim) d.codigos.push(simboloAWmo(sim));
    porDia.set(fecha, d);
  }

  const proximos = [...porDia.entries()].slice(0, 7).map(([fecha, d]) => {
    const tMax = Math.max(...d.temps);
    const tMin = Math.min(...d.temps);
    const codigo = d.codigos.length ? Math.max(...d.codigos) : 3;
    return {
      fecha, codigo, condicion: condicionTexto(codigo),
      tMax: Math.round(tMax * 10) / 10, tMin: Math.round(tMin * 10) / 10,
      lluviaMm: Math.round(d.lluvia * 10) / 10, probLluvia: null,
      vientoMax: Math.round(Math.max(...d.vientos)), rachaMax: null,
      et0: et0Hargreaves(tMax, tMin, lat, fecha),
    };
  });

  const ahora = serie[0];
  const det = ahora.data.instant.details;
  const sim = (ahora.data.next_1_hours || ahora.data.next_6_hours)?.summary?.symbol_code || '';
  const codigo = simboloAWmo(sim);
  const hora = Number(local(ahora.time).slice(11, 13));
  return {
    vereda,
    fuente: 'MET Noruega',
    actual: {
      fechaHora: local(ahora.time).slice(0, 16),
      temperatura: det.air_temperature,
      humedad: det.relative_humidity,
      viento: Math.round((det.wind_speed ?? 0) * 3.6),
      precipitacion: ahora.data.next_1_hours?.details?.precipitation_amount ?? 0,
      codigo,
      condicion: condicionTexto(codigo),
      esDia: sim ? !sim.endsWith('_night') : hora >= 6 && hora < 18,
    },
    // MET no trae días pasados: se conservan los que ya teníamos guardados
    pasados: anterior?.pasados || [],
    proximos,
  };
}

// ---------------- Caché ----------------
async function cargarDeBd() {
  if (cargadoDeBd) return;
  cargadoDeBd = true;
  try {
    const filas = await prisma.climaCache.findMany();
    for (const f of filas) memoria.set(f.clave, { t: f.actualizadoEn.getTime(), data: f.datos });
  } catch (e) {
    logger.warn({ err: e }, 'No se pudo leer clima_cache');
  }
}

async function guardar(vereda, data) {
  const lista = alDia(data);
  memoria.set(vereda, { t: Date.now(), data: lista });
  await prisma.climaCache
    .upsert({ where: { clave: vereda }, create: { clave: vereda, datos: lista }, update: { datos: lista } })
    .catch((e) => logger.warn({ err: e }, 'No se pudo guardar clima_cache'));
}

/** Actualiza TODAS las veredas. Solo una actualización a la vez aunque lleguen 50 peticiones juntas. */
function refrescar() {
  if (refrescoEnCurso) return refrescoEnCurso;
  if (Date.now() - ultimoFallo < ESPERA_TRAS_FALLO_MS) return Promise.reject(new Error('proveedores en pausa tras un fallo reciente'));
  refrescoEnCurso = (async () => {
    try {
      const todas = await openMeteoTodas();
      for (const [vereda, data] of todas) await guardar(vereda, data);
      return;
    } catch (e) {
      logger.warn({ err: e }, 'Open-Meteo falló, probando MET Noruega');
    }
    const resultados = await Promise.allSettled(
      Object.keys(VEREDAS).map(async (vereda) => guardar(vereda, await metNoruega(vereda, memoria.get(vereda)?.data))),
    );
    const fallos = resultados.filter((r) => r.status === 'rejected');
    if (fallos.length) logger.warn({ err: fallos[0].reason }, `MET Noruega falló en ${fallos.length} vereda(s)`);
    if (fallos.length === resultados.length) throw new Error('Ningún proveedor de clima respondió');
  })()
    .catch((e) => {
      ultimoFallo = Date.now();
      throw e;
    })
    .finally(() => {
      refrescoEnCurso = null;
    });
  return refrescoEnCurso;
}

/** Pronóstico de 7 días + 7 días pasados para una vereda. Nunca lanza un error 500. */
export async function obtenerPronostico(veredaPedida) {
  const vereda = VEREDAS[veredaPedida] ? veredaPedida : VEREDA_POR_DEFECTO;
  await cargarDeBd();

  let hit = memoria.get(vereda);
  const edad = hit ? Date.now() - hit.t : Infinity;
  if (edad < FRESCO_MS) return alDia(hit.data);
  if (edad < USABLE_MS) {
    // Responde YA con el dato reciente y actualiza en segundo plano (el usuario no espera).
    refrescar().catch((e) => logger.warn({ err: e?.message }, 'No se pudo actualizar el clima'));
    return alDia(hit.data);
  }

  try {
    await refrescar();
  } catch (e) {
    logger.warn({ err: e?.message }, 'No se pudo actualizar el clima');
  }

  hit = memoria.get(vereda);
  if (hit && Date.now() - hit.t < USABLE_MS) return alDia(hit.data);
  if (hit && Date.now() - hit.t < MAX_VIEJO_MS) {
    return { ...alDia(hit.data), desactualizado: true, actualizadoEn: new Date(hit.t).toISOString() };
  }
  throw new HttpError(503, 'No pudimos consultar el clima en este momento. Intenta de nuevo en unos minutos.');
}

/** Guarda una "foto" del clima actual en la tabla Clima (requisito del modelo de datos). */
export async function guardarSnapshot(pronostico) {
  const a = pronostico.actual;
  return prisma.clima.create({
    data: {
      ubicacion: pronostico.vereda,
      fechaHora: new Date(),
      temperatura: a.temperatura,
      humedad: a.humedad,
      velocidad: a.viento,
      condicionCielo: a.condicion,
      precipitacion: pronostico.hoy?.lluviaMm ?? a.precipitacion,
      et0: pronostico.hoy?.et0 ?? null,
    },
  });
}

/**
 * Reglas de riesgo climático para los próximos 2 días.
 * Umbrales pensados para alta montaña andina; ajústenlos con los agricultores.
 */
export function detectarRiesgos(pronostico) {
  const riesgos = [];
  const proximos = pronostico.proximos.slice(0, 2);

  for (const dia of proximos) {
    const cuando = dia.fecha === pronostico.hoy?.fecha ? 'hoy' : `el ${dia.fecha}`;
    if (dia.tMin !== null && dia.tMin <= 3) {
      riesgos.push({
        riesgo: 'HELADA', fecha: dia.fecha,
        nivel: dia.tMin <= 0 ? 'PELIGRO' : 'PRECAUCION',
        titulo: 'Riesgo de helada',
        mensaje: `Se espera una temperatura mínima de ${dia.tMin} °C ${cuando} en la madrugada.`,
      });
    }
    if ([96, 99].includes(dia.codigo)) {
      riesgos.push({
        riesgo: 'GRANIZO', fecha: dia.fecha, nivel: 'PELIGRO',
        titulo: 'Posible granizada',
        mensaje: `Se pronostican tormentas con granizo ${cuando}.`,
      });
    }
    if (dia.lluviaMm >= 20 || (dia.lluviaMm >= 10 && (dia.probLluvia ?? 0) >= 80)) {
      riesgos.push({
        riesgo: 'LLUVIA', fecha: dia.fecha,
        nivel: dia.lluviaMm >= 30 ? 'PELIGRO' : 'PRECAUCION',
        titulo: 'Lluvias fuertes',
        mensaje: `Se esperan lluvias fuertes ${cuando} (unos ${Math.round(dia.lluviaMm)} mm).`,
      });
    }
    if ((dia.rachaMax ?? 0) >= 50 || (dia.vientoMax ?? 0) >= 35) {
      riesgos.push({
        riesgo: 'VIENTO', fecha: dia.fecha, nivel: 'PRECAUCION',
        titulo: 'Vientos fuertes',
        mensaje: `Se esperan ráfagas de hasta ${Math.round(dia.rachaMax ?? dia.vientoMax)} km/h ${cuando}.`,
      });
    }
  }

  // Sequía: casi nada de lluvia en 7 días pasados y nada fuerte en los próximos 3.
  const lluviaPasada = pronostico.pasados.reduce((s, x) => s + (x.lluviaMm || 0), 0);
  const lluviaProxima = pronostico.proximos.slice(0, 3).reduce((s, x) => s + (x.lluviaMm || 0), 0);
  if (pronostico.pasados.length >= 5 && lluviaPasada < 3 && lluviaProxima < 3) {
    riesgos.push({
      riesgo: 'SEQUIA', fecha: pronostico.hoy?.fecha, nivel: 'PRECAUCION',
      titulo: 'Periodo seco',
      mensaje: `Solo llovió ${lluviaPasada.toFixed(1)} mm en la última semana y no se espera lluvia en los próximos días.`,
    });
  }
  return riesgos;
}
