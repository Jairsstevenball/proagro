// Clima con Open-Meteo: gratis, sin API key, incluye ET0 FAO-56 (ideal para riego).
// Docs: https://open-meteo.com/en/docs
import { coordenadas } from '../data/veredas.js';
import { prisma } from '../lib/prisma.js';

const CACHE_MS = 30 * 60 * 1000; // 30 minutos
const cache = new Map();

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

/** Pronóstico de 7 días + 7 días pasados para una vereda. Usa caché en memoria. */
export async function obtenerPronostico(vereda) {
  const hit = cache.get(vereda);
  if (hit && Date.now() - hit.t < CACHE_MS) return hit.data;

  const { lat, lon } = coordenadas(vereda);
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
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

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`);
  const raw = await res.json();

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

  const hoyStr = raw.current.time.slice(0, 10);
  const data = {
    vereda,
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
    pasados: dias.filter((x) => x.fecha < hoyStr),
    hoy: dias.find((x) => x.fecha === hoyStr),
    proximos: dias.filter((x) => x.fecha >= hoyStr),
  };

  cache.set(vereda, { t: Date.now(), data });
  return data;
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
    const cuando = dia === pronostico.hoy ? 'hoy' : `el ${dia.fecha}`;
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
