// Pantalla principal (CU-07) como el mockup:
// encabezado PROAGRO + campana · tarjeta de clima sobre foto de campo · alertas · "Mis cultivos" · 4 módulos
import { useState } from 'react';
import { View, Text, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth/AuthContext';
import { climaApi, notificacionesApi, cultivosApi } from '../../src/api/servicios';
import { useDatos } from '../../src/utils/useDatos';
import { MensajeError, Logo, Pantalla, Titulo } from '../../src/components/ui';
import { colores, espacio, sombra } from '../../src/tema';
import { saludo, diaSemana } from '../../src/utils/formato';

const ICONO_CLIMA = (c = 0) => {
  if (c === 0 || c === 1) return 'weather-sunny';
  if (c === 2) return 'weather-partly-cloudy';
  if (c === 3) return 'weather-cloudy';
  if (c === 45 || c === 48) return 'weather-fog';
  if (c >= 95) return 'weather-lightning-rainy';
  if (c >= 51) return 'weather-rainy';
  return 'weather-cloudy';
};
const COLOR_ICONO = (c = 0) => (c <= 2 ? '#FFD54F' : '#ECEFF1');
const TIPO = { CLIMA: 'Alerta Clima', CULTIVO: 'Alerta Cultivo', RIEGO: 'Recomendación de riego' };
const NIVEL = { PELIGRO: { texto: 'Peligro', color: colores.peligro }, PRECAUCION: { texto: 'Precaución', color: colores.precaucion } };

export default function Inicio() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [refrescando, setRefrescando] = useState(false);
  const clima = useDatos(() => climaApi.resumen());
  const avisos = useDatos(() => notificacionesApi.noLeidas());
  const cultivos = useDatos(() => cultivosApi.lista('ACTIVO'));

  const c = clima.datos;
  const refrescar = async () => {
    setRefrescando(true);
    await Promise.all([clima.recargar(), avisos.recargar(), cultivos.recargar()]);
    setRefrescando(false);
  };
  const nCultivos = cultivos.datos?.length;

  return (
    <Pantalla refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[colores.verde]} />}>
      {/* Encabezado: logo + PROAGRO + campana */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: espacio.m }}>
        <Logo tamano="pequeno" />
        <Titulo tamano={28} alinear="left" estilo={{ marginLeft: 8, flex: 1 }}>PROAGRO</Titulo>
        <Pressable onPress={() => router.push('/notificaciones')} hitSlop={10} accessibilityLabel="Notificaciones">
          <Ionicons name="notifications-outline" size={30} color="#1A1A1A" />
          {avisos.datos?.total ? (
            <View style={est.insignia}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{avisos.datos.total > 9 ? '9+' : avisos.datos.total}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Tarjeta de clima: color sólido con opacidad para leer bien la información */}
      <View style={est.clima}>
        <Text style={est.saludo}>{saludo()}, {usuario?.nombre} 🌱</Text>
        <MensajeError mensaje={clima.error} onReintentar={clima.recargar} />
        {c ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <MaterialCommunityIcons name={ICONO_CLIMA(c.actual.codigo)} size={54} color={COLOR_ICONO(c.actual.codigo)} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={est.temp}>{Math.round(c.actual.temperatura)}°C</Text>
                <Text style={est.claro} numberOfLines={1}>{c.actual.condicion}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="location" size={12} color="#E8F5E9" />
                  <Text style={[est.claro, { fontSize: 12 }]}>{c.vereda}</Text>
                </View>
              </View>
              <View>
                <Dato icono="water-percent" nombre="Humedad" valor={`${c.actual.humedad}%`} />
                <Dato icono="weather-windy" nombre="Viento" valor={`${Math.round(c.actual.viento)} km/h`} />
                <Dato icono="weather-pouring" nombre="Lluvia" valor={c.hoy?.probLluvia != null ? `${c.hoy.probLluvia}%` : `${c.hoy?.lluviaMm ?? 0} mm`} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              {c.proximos.slice(1, 5).map((d) => (
                <View key={d.fecha} style={est.dia}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{diaSemana(d.fecha)}</Text>
                  <MaterialCommunityIcons name={ICONO_CLIMA(d.codigo)} size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 11 }}>{Math.round(d.tMin)}°/{Math.round(d.tMax)}°</Text>
                </View>
              ))}
            </View>
            <Text style={est.resumen}>Aquí tienes el resumen de hoy</Text>
          </>
        ) : !clima.error ? (
          <Text style={[est.claro, { marginTop: 10 }]}>Consultando el clima...</Text>
        ) : null}
      </View>

      {/* Alertas en vivo: "Alerta Clima" y "Alerta Cultivo" en el recuadro verde del mockup */}
      {c?.alertas?.length ? (
        <View style={est.alertas}>
          {c.alertas.slice(0, 3).map((a, i) => (
            <View key={i} style={{ marginBottom: i < Math.min(2, c.alertas.length - 1) ? 8 : 0 }}>
              <Text style={{ fontWeight: '800', fontSize: 13 }}>{TIPO[a.tipoAlerta] || 'Alerta'}</Text>
              <Text style={{ fontSize: 13 }}>{a.mensaje}</Text>
              {a.tipoAlerta === 'CLIMA' ? (
                <Text style={{ fontSize: 13 }}>
                  Nivel de alerta: <Text style={{ color: NIVEL[a.nivel]?.color, fontWeight: '700' }}>● {NIVEL[a.nivel]?.texto || 'Información'}</Text>
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {/* Banner "Mis cultivos": color sólido con opacidad */}
      <Pressable onPress={() => router.push('/mi-cultivo')} style={({ pressed }) => [est.banner, { opacity: pressed ? 0.85 : 1 }]} accessibilityRole="button" accessibilityLabel="Mis cultivos">
        <View style={est.bannerIcono}>
          <MaterialCommunityIcons name="sprout" size={40} color="#E8F5E9" />
        </View>
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={est.bannerTitulo}>Mis cultivos</Text>
          <Text style={est.bannerTexto}>
            {nCultivos == null ? 'Gestiona tus cultivos' : nCultivos === 0 ? 'Agrega tu primer cultivo' : `Tienes ${nCultivos} cultivo${nCultivos === 1 ? '' : 's'} activo${nCultivos === 1 ? '' : 's'}`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={26} color="#fff" style={{ marginRight: 8 }} />
      </Pressable>

      <View style={est.grilla}>
        <Modulo titulo="AgroBot" sub="Consejos agrícolas" icono="sprout" onPress={() => router.push('/agrobot')} />
        <Modulo titulo="Riego" sub="Control de tus cultivos" icono="water" onPress={() => router.push('/riego')} />
        <Modulo titulo="Producción" sub="Analiza tus estadísticas aquí" icono="chart-bar" onPress={() => router.push('/estadisticas')} />
        <Modulo titulo="Mercado" sub="Compra y venta de productos" icono="storefront" onPress={() => router.push('/mercado')} />
      </View>
    </Pantalla>
  );
}

function Dato({ icono, nombre, valor }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 1 }}>
      <MaterialCommunityIcons name={icono} size={15} color="#E8F5E9" />
      <Text style={{ color: '#E8F5E9', marginLeft: 3, fontSize: 12, width: 56 }}>{nombre}</Text>
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{valor}</Text>
    </View>
  );
}

function Modulo({ titulo, sub, icono, onPress }) {
  return (
    <Pressable style={({ pressed }) => [est.modulo, pressed && { opacity: 0.8 }]} onPress={onPress} accessibilityRole="button" accessibilityLabel={titulo}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <MaterialCommunityIcons name={icono} size={30} color={colores.verdeBrillante} />
        <Ionicons name="chevron-forward" size={20} color="#1A1A1A" />
      </View>
      <Text style={{ fontSize: 16, fontWeight: '800', marginTop: 6, color: colores.texto }}>{titulo}</Text>
      <Text style={{ fontSize: 12, color: colores.textoSuave, marginTop: 2 }}>{sub}</Text>
    </Pressable>
  );
}

const est = StyleSheet.create({
  insignia: { position: 'absolute', top: -4, right: -4, backgroundColor: colores.peligro, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  clima: { backgroundColor: 'rgba(46, 139, 61, 0.9)', borderRadius: 10, padding: espacio.l, ...sombra },
  saludo: { fontSize: 17, fontWeight: '800', color: '#fff' },
  temp: { fontSize: 32, fontWeight: '900', color: '#fff' },
  claro: { color: '#E8F5E9', fontSize: 13 },
  dia: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 8, paddingVertical: 5, width: '23%' },
  resumen: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 12 },
  alertas: { backgroundColor: '#D9EDB4', borderRadius: 6, padding: espacio.m, marginTop: espacio.m, borderWidth: 1, borderColor: colores.panelBorde, ...sombra },
  banner: { height: 88, flexDirection: 'row', alignItems: 'center', borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(46, 139, 61, 0.88)', marginVertical: espacio.m, ...sombra },
  bannerIcono: { width: 88, height: 88, backgroundColor: 'rgba(31, 107, 44, 0.95)', alignItems: 'center', justifyContent: 'center' },
  bannerTitulo: { color: '#fff', fontSize: 19, fontWeight: '800' },
  bannerTexto: { color: '#E8F5E9', fontSize: 13 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  modulo: { width: '48%', backgroundColor: colores.blanco, borderRadius: 6, padding: espacio.m, marginBottom: espacio.m, minHeight: 104, ...sombra },
});
