// Pantalla principal (CU-07): clima del día, alertas, Mi cultivo y accesos a los módulos
import { useState } from 'react';
import { View, Text, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth/AuthContext';
import { climaApi, notificacionesApi } from '../../src/api/servicios';
import { useDatos } from '../../src/utils/useDatos';
import { MensajeError, Logo } from '../../src/components/ui';
import { colores, espacio, sombra, texto } from '../../src/tema';
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
const COLOR_NIVEL = { PELIGRO: colores.peligro, PRECAUCION: colores.precaucion, INFO: colores.info };

export default function Inicio() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [refrescando, setRefrescando] = useState(false);
  const clima = useDatos(() => climaApi.resumen());
  const avisos = useDatos(() => notificacionesApi.noLeidas());

  const c = clima.datos;
  const refrescar = async () => {
    setRefrescando(true);
    await Promise.all([clima.recargar(), avisos.recargar()]);
    setRefrescando(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colores.crema }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: espacio.l, paddingBottom: 30 }} refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[colores.verde]} />}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: espacio.m }}>
          <Logo tamano="pequeno" />
          <Text style={[texto.titulo, { fontSize: 24, marginLeft: 8, flex: 1 }]}>PROAGRO</Text>
          <Pressable onPress={() => router.push('/notificaciones')} hitSlop={10} accessibilityLabel="Notificaciones">
            <Ionicons name="notifications-outline" size={30} color={colores.texto} />
            {avisos.datos?.total ? (
              <View style={est.insignia}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{avisos.datos.total > 9 ? '9+' : avisos.datos.total}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {/* Tarjeta de clima */}
        <View style={est.clima}>
          <Text style={[texto.subtitulo, { color: '#fff' }]}>{saludo()}, {usuario?.nombre} 🌱</Text>
          <MensajeError mensaje={clima.error} onReintentar={clima.recargar} />
          {c ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <MaterialCommunityIcons name={ICONO_CLIMA(c.actual.codigo)} size={54} color="#FFE082" />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 36, fontWeight: '800' }}>{Math.round(c.actual.temperatura)}°C</Text>
                  <Text style={{ color: '#fff' }}>{c.actual.condicion} · {c.vereda}</Text>
                </View>
                <View>
                  <Dato icono="water-percent" valor={`${c.actual.humedad}%`} />
                  <Dato icono="weather-windy" valor={`${Math.round(c.actual.viento)} km/h`} />
                  <Dato icono="weather-pouring" valor={`${c.hoy?.probLluvia ?? 0}%`} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                {c.proximos.slice(1, 5).map((d) => (
                  <View key={d.fecha} style={{ alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 12 }}>{diaSemana(d.fecha)}</Text>
                    <MaterialCommunityIcons name={ICONO_CLIMA(d.codigo)} size={22} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 12 }}>{Math.round(d.tMin)}°/{Math.round(d.tMax)}°</Text>
                  </View>
                ))}
              </View>
              <Text style={{ color: '#fff', marginTop: 8 }}>Aquí tienes el resumen de hoy</Text>
            </>
          ) : !clima.error ? (
            <Text style={{ color: '#fff', marginTop: 10 }}>Consultando el clima...</Text>
          ) : null}
        </View>

        {/* Alertas en vivo: "Alerta Clima" y "Alerta Cultivo" */}
        {c?.alertas?.slice(0, 3).map((a, i) => (
          <View key={i} style={[est.alerta, { borderLeftColor: COLOR_NIVEL[a.nivel] || colores.info }]}>
            <Text style={{ fontWeight: '800' }}>{a.tipoAlerta === 'CLIMA' ? 'Alerta Clima' : 'Alerta Cultivo'} · {a.titulo}</Text>
            <Text style={{ marginTop: 2 }}>{a.mensaje}</Text>
            <Text style={{ color: COLOR_NIVEL[a.nivel], fontWeight: '700', marginTop: 2 }}>Nivel: {a.nivel === 'PELIGRO' ? 'Peligro' : 'Precaución'}</Text>
          </View>
        ))}

        <Pressable style={est.banner} onPress={() => router.push('/mi-cultivo')}>
          <MaterialCommunityIcons name="sprout" size={44} color="#fff" />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>Mi cultivo</Text>
            <Text style={{ color: '#fff' }}>Gestiona tus cultivos</Text>
          </View>
          <Ionicons name="chevron-forward" size={26} color="#fff" />
        </Pressable>

        <View style={est.grilla}>
          <Modulo titulo="AgroBot" sub="Asesor agrícola" icono="robot-happy-outline" onPress={() => router.push('/agrobot')} />
          <Modulo titulo="Riego" sub="Gestión de riego" icono="water-outline" onPress={() => router.push('/riego')} />
          <Modulo titulo="Producción" sub="Mira tus estadísticas" icono="chart-bar" onPress={() => router.push('/estadisticas')} />
          <Modulo titulo="Mercado" sub="Compra y vende" icono="storefront-outline" onPress={() => router.push('/mercado')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Dato({ icono, valor }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 1 }}>
      <MaterialCommunityIcons name={icono} size={16} color="#fff" />
      <Text style={{ color: '#fff', marginLeft: 4, fontSize: 13 }}>{valor}</Text>
    </View>
  );
}

function Modulo({ titulo, sub, icono, onPress }) {
  return (
    <Pressable style={({ pressed }) => [est.modulo, pressed && { opacity: 0.8 }]} onPress={onPress} accessibilityRole="button" accessibilityLabel={titulo}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <MaterialCommunityIcons name={icono} size={30} color={colores.verde} />
        <Ionicons name="chevron-forward" size={20} color={colores.texto} />
      </View>
      <Text style={{ fontSize: 17, fontWeight: '800', marginTop: 8 }}>{titulo}</Text>
      <Text style={texto.suave}>{sub}</Text>
    </Pressable>
  );
}

const est = StyleSheet.create({
  insignia: { position: 'absolute', top: -4, right: -4, backgroundColor: colores.peligro, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  clima: { backgroundColor: '#4E7F9E', borderRadius: 14, padding: espacio.l, marginBottom: espacio.m, ...sombra },
  alerta: { backgroundColor: colores.blanco, borderRadius: 10, padding: espacio.m, marginBottom: espacio.s, borderLeftWidth: 5, ...sombra },
  banner: { backgroundColor: colores.verde, borderRadius: 14, padding: espacio.l, flexDirection: 'row', alignItems: 'center', marginVertical: espacio.m, ...sombra },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  modulo: { width: '48%', backgroundColor: colores.blanco, borderRadius: 12, padding: espacio.m, marginBottom: espacio.m, ...sombra },
});
