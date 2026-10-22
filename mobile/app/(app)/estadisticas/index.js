// CU-04 Ver estadísticas: cosecha, ingreso, agua aplicada, salud y histórico
import { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pantalla, Encabezado, Selector, Boton, Cargando, MensajeError, Vacio } from '../../../src/components/ui';
import { cultivosApi, estadisticasApi } from '../../../src/api/servicios';
import { colores, espacio, sombra, texto } from '../../../src/tema';
import { MESES, MES_CORTO, pesos, numero } from '../../../src/utils/formato';

const SALUD = { EXCELENTE: 'Excelente', BUENA: 'Buena', REGULAR: 'Regular', MALA: 'Mala' };

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
  const maxKg = Math.max(1, ...(datos?.historico || []).map((h) => h.kg));

  return (
    <Pantalla>
      <Encabezado titulo="ESTADÍSTICAS" subtitulo="Analiza el rendimiento de tus cultivos" />
      {cultivos.length === 0 ? (
        <Vacio mensaje="Agrega un cultivo para ver sus estadísticas.">
          <Boton titulo="Agregar cultivo" onPress={() => router.push('/agregar')} />
        </Vacio>
      ) : (
        <>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: espacio.m, marginBottom: espacio.m, ...sombra }}>
            <Selector etiqueta="Seleccione un cultivo" valor={idCultivo} opciones={cultivos.map((c) => ({ valor: c.idCultivo, nombre: c.tipoCultivo }))} onCambio={setIdCultivo} />
            <Selector etiqueta="Seleccione el mes" valor={mes} opciones={MESES.map((m, i) => ({ valor: i + 1, nombre: `${m} ${anio}` }))} onCambio={setMes} />
          </View>
          <MensajeError mensaje={error} onReintentar={cargar} />
          {cargando && !datos ? <Cargando /> : null}
          {datos ? (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <Indicador icono="basket-outline" titulo="Cosecha recogida" valor={`${numero(datos.cosechaKg, 1)} Kg`} />
                <Indicador icono="cash" titulo="Ingreso estimado" valor={pesos(datos.ingreso)} />
                <Indicador icono="water-outline" titulo="Agua aplicada" valor={`${numero(datos.aguaLitros)} Litros`} />
                <Indicador icono="heart-pulse" titulo="Salud predominante" valor={datos.saludPredominante ? `${SALUD[datos.saludPredominante]}${datos.saludPct !== null ? ` · ${datos.saludPct}%` : ''}` : 'Sin datos'} />
              </View>
              {datos.costo ? <Text style={[texto.suave, { marginBottom: 8 }]}>Gastaste {pesos(datos.costo)} este mes · Ganancia: {pesos(datos.ingreso - datos.costo)}</Text> : null}

              <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: espacio.m, marginBottom: espacio.m, ...sombra }}>
                <Text style={{ fontWeight: '800', marginBottom: 10 }}>Histórico de cosecha (Kg)</Text>
                {datos.historico.length === 0 ? (
                  <Text style={texto.suave}>Todavía no hay registros.</Text>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 140, justifyContent: 'space-around' }}>
                    {datos.historico.map((h) => (
                      <View key={`${h.anio}-${h.mes}`} style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontSize: 11 }}>{numero(h.kg)}</Text>
                        <View style={{ width: 28, height: Math.max(4, (h.kg / maxKg) * 100), backgroundColor: colores.verde, borderRadius: 4 }} />
                        <Text style={{ fontSize: 12, marginTop: 4 }}>{MES_CORTO[h.mes - 1]}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <Boton titulo="Actualizar registro" onPress={() => router.push({ pathname: '/estadisticas/registrar', params: { idCultivo, anio, mes } })} />

              <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: espacio.m, marginTop: espacio.m, ...sombra }}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={30} color={colores.verde} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ fontWeight: '800' }}>Consejo AgroBot</Text>
                  <Text>{datos.consejo}</Text>
                </View>
              </View>
            </>
          ) : null}
        </>
      )}
    </Pantalla>
  );
}

function Indicador({ icono, titulo, valor }) {
  return (
    <View style={{ width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: espacio.m, marginBottom: espacio.m, ...sombra }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <MaterialCommunityIcons name={icono} size={22} color={colores.verde} />
        <Text style={{ marginLeft: 6, fontSize: 13, flex: 1 }}>{titulo}</Text>
      </View>
      <Text style={{ fontSize: 19, fontWeight: '900', marginTop: 6 }} adjustsFontSizeToFit numberOfLines={1}>{valor}</Text>
    </View>
  );
}
