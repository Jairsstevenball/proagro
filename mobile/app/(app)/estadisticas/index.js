// CU-04 Ver estadísticas: cosecha, ingreso, agua aplicada, salud y histórico
import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pantalla, Encabezado, Selector, Boton, Cargando, MensajeError, Vacio } from '../../../src/components/ui';
import { cultivosApi, estadisticasApi } from '../../../src/api/servicios';
import { colores, espacio, sombra, texto, relleno } from '../../../src/tema';
import { MESES, MES_CORTO, pesos, numero } from '../../../src/utils/formato';


export default function Estadisticas() {
  const router = useRouter();
  const hoy = new Date();
  const [cultivos, setCultivos] = useState(null);
  const [idCultivo, setIdCultivo] = useState(null);
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio] = useState(hoy.getFullYear());
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  useFocusEffect(
    useCallback(() => {
      cultivosApi
        .lista('ACTIVO')
        .then((l) => {
          setCultivos(l);
          setIdCultivo((actual) => actual ?? l[0]?.idCultivo ?? null);
        })
        .catch((e) => setError(e.message));
    }, []),
  );

  const cargar = useCallback(async () => {
    if (!idCultivo) return;
    setCargando(true);
    setError(null);
    try {
      setDatos(await estadisticasApi.ver(idCultivo, anio, mes));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [idCultivo, anio, mes]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  if (!cultivos) return <Cargando />;
  const historico = datos?.historico || [];
  const maxKg = escalaMax(Math.max(0, ...historico.map((h) => h.kg)));

  return (
    <Pantalla>
      <Encabezado titulo="ESTADÍSTICAS" subtitulo="Analiza el rendimiento de tus cultivos" />
      {cultivos.length === 0 ? (
        <Vacio mensaje="Agrega un cultivo para ver sus estadísticas.">
          <Boton titulo="Agregar cultivo" onPress={() => router.push('/agregar')} />
        </Vacio>
      ) : (
        <>
          <View style={est.caja}>
            <Selector etiqueta="Seleccione un cultivo" ancho="62%" valor={idCultivo} opciones={cultivos.map((c) => ({ valor: c.idCultivo, nombre: c.tipoCultivo }))} onCambio={setIdCultivo} />
            <Selector etiqueta="Seleccione el mes" ancho="62%" valor={mes} opciones={MESES.map((m, i) => ({ valor: i + 1, nombre: `${m} ${anio}` }))} onCambio={setMes} />
          </View>
          <MensajeError mensaje={error} onReintentar={cargar} />
          {cargando && !datos ? <ActivityIndicator size="large" color={colores.verde} style={{ marginTop: 20 }} /> : null}
          {datos ? (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                <Indicador icono="basket-outline" titulo="Cosecha Recogida" valor={`${numero(datos.cosechaKg, 1)} Kg`} />
                <Indicador icono="cash-multiple" titulo="Ingreso Estimado" valor={pesos(datos.ingreso)} />
                <Indicador icono="water-outline" titulo="Agua Aplicada" valor={`${numero(datos.aguaLitros)} Litros`} />
                <Salud salud={datos.saludPredominante} pct={datos.saludPct} />
              </View>
              {datos.costo ? <Text style={[texto.suave, { marginBottom: 8, textAlign: 'center' }]}>Gastaste {pesos(datos.costo)} este mes · Ganancia: {pesos(datos.ingreso - datos.costo)}</Text> : null}

              <View style={est.caja}>
                <Text style={{ fontWeight: '800', marginBottom: 8, fontSize: 13 }}>Histórico de Cosechas (Kg)</Text>
                {historico.length === 0 ? (
                  <Text style={texto.suave}>Todavía no hay registros.</Text>
                ) : (
                  <View style={{ flexDirection: 'row' }}>
                    {/* eje Y con líneas guía */}
                    <View style={{ width: 34, height: ALTO, justifyContent: 'space-between' }}>
                      {[4, 3, 2, 1, 0].map((k) => (
                        <Text key={k} style={est.ejeY}>{numero((maxKg * k) / 4)}</Text>
                      ))}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ height: ALTO, justifyContent: 'space-between', ...relleno }}>
                        {[0, 1, 2, 3, 4].map((k) => <View key={k} style={est.guia} />)}
                      </View>
                      <View style={{ height: ALTO, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' }}>
                        {historico.map((h) => (
                          <View key={`${h.anio}-${h.mes}`} style={{ width: `${Math.min(36, 80 / historico.length)}%`, height: Math.max(3, (h.kg / maxKg) * ALTO), backgroundColor: '#1F8A2E' }} />
                        ))}
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 }}>
                        {historico.map((h) => (
                          <Text key={`${h.anio}-${h.mes}`} style={{ fontSize: 11, color: colores.textoSuave }}>{MES_CORTO[h.mes - 1]}</Text>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </View>

              <Boton titulo="Actualizar Registro" estilo={{ alignSelf: 'flex-start', minWidth: 200, marginLeft: 4 }} onPress={() => router.push({ pathname: '/estadisticas/registrar', params: { idCultivo, anio, mes } })} />

              <View style={[est.caja, { flexDirection: 'row', marginTop: espacio.s }]}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={32} color={colores.verde} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ fontWeight: '800', fontSize: 13 }}>Consejo AgroBot</Text>
                  <Text style={{ fontSize: 13, color: colores.texto }}>{datos.consejo}</Text>
                </View>
              </View>
            </>
          ) : null}
        </>
      )}
    </Pantalla>
  );
}

const ALTO = 120;
/** Redondea el máximo del eje Y a un número "bonito" (100, 250, 500, 1000...). */
function escalaMax(v) {
  if (v <= 0) return 100;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (v <= m * p) return m * p;
  return 10 * p;
}

function Insignia({ icono }) {
  return (
    <View style={est.insignia}>
      <MaterialCommunityIcons name={icono} size={15} color={colores.verdeOscuro} />
    </View>
  );
}

function Indicador({ icono, titulo, valor }) {
  return (
    <View style={est.indicador}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Insignia icono={icono} />
        <Text style={{ marginLeft: 6, fontSize: 12, flex: 1, color: colores.texto }}>{titulo}</Text>
      </View>
      <Text style={{ fontSize: 19, fontWeight: '900', marginTop: 6, color: colores.texto }} adjustsFontSizeToFit numberOfLines={1}>{valor}</Text>
    </View>
  );
}

const NOMBRE_SALUD = { EXCELENTE: 'Excelente', BUENA: 'Óptimo', REGULAR: 'Regular', MALA: 'Mala' };
const COLOR_SALUD = { EXCELENTE: colores.verde, BUENA: colores.verde, REGULAR: colores.precaucion, MALA: colores.peligro };

function Salud({ salud, pct }) {
  const color = COLOR_SALUD[salud] || colores.textoSuave;
  return (
    <View style={est.indicador}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Insignia icono="shield-check-outline" />
        <Text style={{ marginLeft: 6, fontSize: 12, flex: 1, color: colores.texto }}>Salud Predominante</Text>
      </View>
      {salud ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
          <View style={[est.anillo, { borderColor: color }]}>
            <Text style={{ fontSize: 11, fontWeight: '800' }}>{pct != null ? `${pct}%` : '—'}</Text>
          </View>
          <MaterialCommunityIcons name="check-circle" size={16} color={color} style={{ marginLeft: 8 }} />
          <Text style={{ marginLeft: 3, fontSize: 13, fontWeight: '700', color }}>{NOMBRE_SALUD[salud]}</Text>
        </View>
      ) : (
        <Text style={{ fontSize: 15, fontWeight: '800', marginTop: 8, color: colores.textoSuave }}>Sin datos</Text>
      )}
    </View>
  );
}

const est = StyleSheet.create({
  caja: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: espacio.m, marginBottom: espacio.m, borderWidth: 1, borderColor: '#DCE3D3', ...sombra },
  indicador: { width: '48%', backgroundColor: '#fff', borderRadius: 8, padding: espacio.s, paddingHorizontal: espacio.m, marginBottom: espacio.m, ...sombra },
  insignia: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#D5E8B5', alignItems: 'center', justifyContent: 'center' },
  anillo: { width: 38, height: 38, borderRadius: 19, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  ejeY: { fontSize: 9, color: colores.textoSuave, textAlign: 'right', paddingRight: 4, marginVertical: -5 },
  guia: { height: 1, backgroundColor: '#E6E9E2' },
});
