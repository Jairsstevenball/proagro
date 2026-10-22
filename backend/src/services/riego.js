// Recomendación de riego con el método FAO-56 (Allen et al., 1998):
//   ETc = Kc × ET0               (agua que pierde el cultivo, mm/día)
//   Necesidad neta = ETc − lluvia efectiva
//   Necesidad bruta = neta / eficiencia del método de riego
//   1 mm sobre 1 m² = 1 litro
// Este archivo NO depende de la base de datos para poder probarlo solo (ver test/).
import { datosCultivo } from '../data/cultivos.js';

export const EFICIENCIA = { GOTEO: 0.9, ASPERSION: 0.75, CANALES: 0.6 };
export const NOMBRE_METODO = { GOTEO: 'goteo', ASPERSION: 'aspersión', CANALES: 'canales' };
const ETAPAS = ['Inicial', 'Desarrollo', 'Media (floración / llenado)', 'Final (maduración)'];
const DIA_MS = 24 * 60 * 60 * 1000;

/** Etapa fenológica y Kc del día, interpolando linealmente como indica FAO-56. */
export function etapaYKc(tipoCultivo, fechaInicio, hoy = new Date()) {
  const { kc, etapas } = datosCultivo(tipoCultivo);
  const dias = Math.max(0, Math.floor((hoy - new Date(fechaInicio)) / DIA_MS));
  const [lIni, lDev, lMid, lLate] = etapas;

  if (dias < lIni) return { etapa: ETAPAS[0], kc: kc.ini, dias };
  if (dias < lIni + lDev) {
    const f = (dias - lIni) / lDev;
    return { etapa: ETAPAS[1], kc: kc.ini + f * (kc.mid - kc.ini), dias };
  }
  if (dias < lIni + lDev + lMid) return { etapa: ETAPAS[2], kc: kc.mid, dias };
  if (dias < lIni + lDev + lMid + lLate) {
    const f = (dias - lIni - lDev - lMid) / lLate;
    return { etapa: ETAPAS[3], kc: kc.mid + f * (kc.end - kc.mid), dias };
  }
  return { etapa: ETAPAS[3], kc: kc.end, dias };
}

/** Lluvia efectiva simplificada: lloviznas < 2 mm no aprovechables, el resto al 80 %. */
export function lluviaEfectiva(mm) {
  return mm < 2 ? 0 : mm * 0.8;
}

const r1 = (x) => Math.round(x * 10) / 10;

/** Necesidad de un día. Devuelve mm (= L/m²) y litros si se conoce el área. */
export function necesidadDia({ kc, et0, lluviaMm, metodo, areaM2 }) {
  const etc = kc * et0;
  const neta = Math.max(0, etc - lluviaEfectiva(lluviaMm));
  const eficiencia = EFICIENCIA[metodo] ?? 0.7;
  const bruta = neta / eficiencia;
  return {
    etcMm: r1(etc),
    netaMm: r1(neta),
    brutaMm: r1(bruta),
    litros: areaM2 ? Math.round(bruta * areaM2) : null,
  };
}

/** Litros aplicados en el mes: cada día cuenta la última configuración de riego registrada ese día o antes. */
export function aguaDelMes(riegosAsc, anio, mes, fechaInicioCultivo, hoy = new Date()) {
  const inicioMes = new Date(anio, mes - 1, 1);
  const finMes = new Date(anio, mes, 0, 23, 59, 59);
  const fin = finMes < hoy ? finMes : hoy;
  const ini = new Date(fechaInicioCultivo);
  const inicioCultivo = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate());
  let total = 0;
  for (let d = new Date(inicioMes); d <= fin; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    if (d < inicioCultivo) continue;
    const finDia = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    let vigente = null;
    for (const r of riegosAsc) {
      if (new Date(r.fechaRegistro) <= finDia) vigente = r;
      else break;
    }
    if (vigente) total += vigente.cantidadAgua;
  }
  return Math.round(total);
}

/**
 * Recomendación completa para un cultivo.
 * @param cultivo  { tipoCultivo, fechaInicio, areaM2 }
 * @param ultimoRiego  { metodoRiego, cantidadAgua, frecuenciaRiego } | null
 * @param dias  arreglo de días del pronóstico [{ fecha, et0, lluviaMm, probLluvia }] empezando hoy
 */
export function recomendarRiego({ cultivo, ultimoRiego, dias, hoy = new Date() }) {
  const metodo = ultimoRiego?.metodoRiego || 'ASPERSION';
  const { etapa, kc, dias: diasSiembra } = etapaYKc(cultivo.tipoCultivo, cultivo.fechaInicio, hoy);
  const area = cultivo.areaM2 || null;

  const plan = dias.slice(0, 3).map((d) => ({
    fecha: d.fecha,
    et0: d.et0,
    lluviaMm: d.lluviaMm,
    probLluvia: d.probLluvia,
    ...necesidadDia({ kc, et0: d.et0, lluviaMm: d.lluviaMm, metodo, areaM2: area }),
  }));
  const hoyN = plan[0];
  const mensajes = [];

  if (!hoyN) return { error: 'Sin datos de clima' };

  if (hoyN.netaMm === 0) {
    mensajes.push(`Hoy no necesitas regar: la lluvia esperada (${r1(hoyN.lluviaMm)} mm) cubre lo que consume tu cultivo.`);
  } else if (area) {
    mensajes.push(`Hoy tu cultivo necesita unos ${hoyN.litros} litros de agua (${hoyN.brutaMm} L por m²) regando por ${NOMBRE_METODO[metodo]}.`);
  } else {
    mensajes.push(`Hoy tu cultivo necesita unos ${hoyN.brutaMm} litros por cada metro cuadrado. Agrega el área del cultivo para calcular el total.`);
  }

  if ((hoyN.probLluvia ?? 0) >= 70 && hoyN.lluviaMm < 2) {
    mensajes.push('Hay alta probabilidad de lluvia: espera a ver si llueve antes de regar.');
  }

  // Comparación con lo que el agricultor dice que usa (variable "consumo de agua de riego").
  let comparacion = null;
  if (area && ultimoRiego?.cantidadAgua && hoyN.litros !== null) {
    const actual = ultimoRiego.cantidadAgua;
    const recomendado = hoyN.litros;
    const difPct = recomendado === 0 ? null : Math.round(((actual - recomendado) / recomendado) * 100);
    comparacion = { litrosActuales: actual, litrosRecomendados: recomendado, diferenciaPct: difPct };
    if (recomendado === 0) {
      mensajes.push(`Hoy podrías ahorrarte los ${actual} litros que sueles usar.`);
    } else if (difPct > 15) {
      mensajes.push(`Estás usando cerca de ${difPct}% más agua de la necesaria. Regar de más desperdicia agua y favorece hongos.`);
    } else if (difPct < -15) {
      mensajes.push(`Estás usando cerca de ${Math.abs(difPct)}% menos agua de la que necesita el cultivo en esta etapa.`);
    } else {
      mensajes.push('La cantidad de agua que usas está bien para esta etapa.');
    }
  }

  const cuando = metodo === 'GOTEO'
    ? 'Riega temprano (5 a 8 a. m.). Con goteo puedes dividir el agua en 2 turnos cortos.'
    : 'Riega temprano en la mañana (5 a 8 a. m.) o al final de la tarde para perder menos agua por evaporación. Evita regar al mediodía.';

  return {
    etapa,
    diasDesdeSiembra: diasSiembra,
    kc: Math.round(kc * 100) / 100,
    metodo,
    eficiencia: EFICIENCIA[metodo],
    areaM2: area,
    hoy: hoyN,
    plan,
    comparacion,
    cuando,
    mensajes,
  };
}
