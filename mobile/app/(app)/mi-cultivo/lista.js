// CU-09 / CU-10 Consultar cultivos activos o inactivos (franjas con foto y el nombre grande: "PAPA", "MORA")
import { Pressable, Text, ImageBackground, View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pantalla, Encabezado, Cargando, MensajeError, Vacio, Boton } from '../../../src/components/ui';
import { cultivosApi } from '../../../src/api/servicios';
import { useDatos } from '../../../src/utils/useDatos';
import { sombra, imagenes, FUENTE_TITULO, relleno } from '../../../src/tema';

export default function Lista() {
  const { estado = 'ACTIVO' } = useLocalSearchParams();
  const router = useRouter();
  const { datos, cargando, error, recargar } = useDatos(() => cultivosApi.lista(estado), [estado]);
  const activos = estado === 'ACTIVO';

  if (cargando) return <Cargando />;
  return (
    <Pantalla>
      <Encabezado titulo="MI CULTIVO" icono="logo" subtitulo={activos ? 'Cultivos activos' : 'Cultivos inactivos'} />
      <MensajeError mensaje={error} onReintentar={recargar} />
      {datos?.length === 0 ? (
        <Vacio mensaje={activos ? 'Aún no tienes cultivos activos.' : 'No tienes cultivos inactivos.'}>
          {activos ? <Boton titulo="Agregar cultivo" onPress={() => router.push('/agregar')} /> : null}
        </Vacio>
      ) : null}
      <View style={{ paddingHorizontal: 12, marginTop: 8 }}>
        {datos?.map((c) => (
          <Pressable
            key={c.idCultivo}
            onPress={() => router.push(`/mi-cultivo/${c.idCultivo}`)}
            style={({ pressed }) => [{ marginBottom: 22, opacity: pressed ? 0.85 : 1 }, sombra]}
            accessibilityRole="button"
            accessibilityLabel={`Cultivo de ${c.tipoCultivo}`}
          >
            <ImageBackground
              source={c.fotoUrl ? { uri: c.fotoUrl } : activos ? imagenes.campo : imagenes.campoGris}
              style={est.franja}
              imageStyle={{ borderRadius: 4 }}
            >
              {/* Inactivos en gris, como el mockup */}
              <View style={[est.velo, !activos && { backgroundColor: 'rgba(150,150,150,0.62)' }]} />
              <Text style={est.nombre} numberOfLines={1} adjustsFontSizeToFit>{c.tipoCultivo.toUpperCase()}</Text>
              {c.areaM2 ? <Text style={est.area}>{c.areaM2} m²</Text> : null}
            </ImageBackground>
          </Pressable>
        ))}
      </View>
    </Pantalla>
  );
}

const sombraTexto = { textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 };
const est = StyleSheet.create({
  franja: { height: 74, justifyContent: 'center', alignItems: 'center', borderRadius: 4, overflow: 'hidden' },
  velo: { ...relleno, backgroundColor: 'rgba(0,0,0,0.18)' },
  nombre: { color: '#fff', fontSize: 34, fontFamily: FUENTE_TITULO, letterSpacing: 2, paddingHorizontal: 10, ...sombraTexto },
  area: { color: '#fff', fontSize: 12, ...sombraTexto },
});
