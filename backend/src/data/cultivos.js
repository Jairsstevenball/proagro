// Coeficientes de cultivo (Kc) y duración de etapas en días.
// Fuente base: FAO-56 (Allen et al., 1998), tablas 11 y 12. Las duraciones se alargaron
// porque en la zona alta de Ciudad Bolívar (2.700–3.100 m) los ciclos son más lentos.
// Son valores REFERENCIALES: validen con los agricultores / un agrónomo y ajusten.

export const CULTIVOS = {
  Papa: { kc: { ini: 0.5, mid: 1.15, end: 0.75 }, etapas: [30, 35, 50, 35] },
  Arveja: { kc: { ini: 0.5, mid: 1.15, end: 1.1 }, etapas: [20, 30, 35, 20] },
  Lechuga: { kc: { ini: 0.7, mid: 1.0, end: 0.95 }, etapas: [25, 35, 25, 10] },
  'Maíz': { kc: { ini: 0.3, mid: 1.2, end: 0.35 }, etapas: [30, 40, 60, 40] },
  Fresa: { kc: { ini: 0.4, mid: 0.85, end: 0.75 }, etapas: [30, 40, 90, 30] },
  Mora: { kc: { ini: 0.3, mid: 1.05, end: 0.5 }, etapas: [30, 60, 180, 60] },
  Otro: { kc: { ini: 0.8, mid: 0.8, end: 0.8 }, etapas: [30, 30, 60, 30] },
};

export const TIPOS_CULTIVO = Object.keys(CULTIVOS);

// Opciones del selector "Tipo de abono" del mockup (Agregar_cultivos).
export const TIPOS_ABONO = ['Compost', 'Gallinaza', 'Bocashi', 'Humus de lombriz', 'Químico (NPK)', 'Ninguno', 'Otro'];

export function datosCultivo(tipo) {
  return CULTIVOS[tipo] || CULTIVOS.Otro;
}

// Consejos por cultivo para cada riesgo climático ("Alerta Cultivo" del mockup).
const CONSEJOS = {
  HELADA: {
    Papa: 'Riega ligeramente al final de la tarde y cubre las plantas jóvenes; la humedad del suelo reduce el daño por helada en el follaje.',
    Fresa: 'Cubre las plantas con plástico o tela antiheladas durante la noche y retíralo en la mañana.',
    Mora: 'Protege brotes y flores; evita podar antes de la helada.',
    _: 'Cubre las plantas más pequeñas durante la noche y riega ligeramente en la tarde para proteger las raíces.',
  },
  LLUVIA: {
    Papa: 'Revisa el drenaje y evita el exceso de humedad para prevenir gota (Phytophthora) y daños en los tubérculos.',
    Arveja: 'Asegura el drenaje entre surcos; el encharcamiento pudre raíces y favorece hongos.',
    Fresa: 'Revisa el acolchado y retira frutos maduros antes de la lluvia para evitar pudrición.',
    _: 'Revisa canales y drenajes, y suspende el riego mientras dure la lluvia.',
  },
  VIENTO: {
    Mora: 'Revisa tutores y amarres; el viento fuerte quiebra las ramas cargadas.',
    'Maíz': 'Aporca las plantas para evitar que el viento las tumbe.',
    _: 'Asegura tutores, plásticos e invernaderos; evita fumigar con viento.',
  },
  GRANIZO: {
    _: 'Si tienes malla o polisombra, instálala. Después del granizo revisa heridas en hojas y frutos para prevenir enfermedades.',
  },
  SEQUIA: {
    _: 'Riega temprano en la mañana, usa acolchado (pasto seco o plástico) para conservar humedad y prioriza los cultivos en floración.',
  },
};

export function consejoCultivo(riesgo, tipoCultivo) {
  const tabla = CONSEJOS[riesgo] || {};
  return tabla[tipoCultivo] || tabla._ || '';
}
