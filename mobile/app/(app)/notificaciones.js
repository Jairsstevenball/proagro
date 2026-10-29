import { View, Text } from 'react-native';
import { useEffect } from 'react';
import { Pantalla, Encabezado, Cargando, MensajeError, Vacio } from '../../src/components/ui';
import { notificacionesApi } from '../../src/api/servicios';
import { useDatos } from '../../src/utils/useDatos';
import { colores, espacio, sombra } from '../../src/tema';
import { fechaCorta } from '../../src/utils/formato';

const TIPO = { CLIMA: 'Alerta Clima', CULTIVO: 'Alerta Cultivo', RIEGO: 'Recomendación de riego' };
const COLOR = { PELIGRO: colores.peligro, PRECAUCION: colores.precaucion, INFO: colores.info };

export default function Notificaciones() {
  const { datos, cargando, error, recargar } = useDatos(() => notificacionesApi.lista());

  // Al abrir, se marcan como leídas
  useEffect(() => {
    if (datos?.some((n) => n.estado === 'NO_LEIDA')) notificacionesApi.leerTodas().catch(() => {});
  }, [datos]);

  if (cargando) return <Cargando />;
  return (
    <Pantalla>
      <Encabezado titulo="ALERTAS" icono="bell-outline" />
      <MensajeError mensaje={error} onReintentar={recargar} />
      {datos?.length === 0 ? <Vacio icono="bell-check-outline" mensaje="No tienes alertas. Cada mañana te llega la recomendación de riego de tus cultivos, y te avisamos si viene una helada, granizo, lluvias fuertes o un periodo seco." /> : null}
      {datos?.map((n) => (
        <View key={n.idNotificacion} style={{ backgroundColor: '#fff', borderRadius: 10, padding: espacio.m, marginBottom: espacio.s, borderLeftWidth: 5, borderLeftColor: COLOR[n.nivel] || colores.info, opacity: n.estado === 'LEIDA' ? 0.75 : 1, ...sombra }}>
          <Text style={{ fontWeight: '800' }}>{TIPO[n.tipoAlerta] || 'Alerta'} · {n.titulo}</Text>
          <Text style={{ marginTop: 3 }}>{n.mensaje}</Text>
          <Text style={{ color: colores.textoSuave, fontSize: 12, marginTop: 4 }}>{fechaCorta(n.fecha)}</Text>
        </View>
      ))}
    </Pantalla>
  );
}
