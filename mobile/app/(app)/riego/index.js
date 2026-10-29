// CU-05 Gestionar riego: elegir el cultivo (tarjetas verdes "PAPA" / "MORA" con su foto, como el mockup)
import { Pressable, Text, Image, View, ImageBackground, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Pantalla, Encabezado, Cargando, MensajeError, Vacio, Boton } from '../../../src/components/ui';
import { cultivosApi } from '../../../src/api/servicios';
import { useDatos } from '../../../src/utils/useDatos';
import { colores, sombra, imagenes } from '../../../src/tema';

export default function Riego() {
  const router = useRouter();
  const { datos, cargando, error, recargar } = useDatos(() => cultivosApi.lista('ACTIVO'));
  if (cargando) return <Cargando />;
  return (
    <Pantalla>
      <Encabezado titulo="RIEGO" icono="water" subtitulo="Escoge un cultivo para ver cuánto regar hoy" />
      <MensajeError mensaje={error} onReintentar={recargar} />
      {datos?.length === 0 ? (
        <Vacio mensaje="Agrega un cultivo para recibir recomendaciones de riego.">
          <Boton titulo="Agregar cultivo" onPress={() => router.push('/agregar')} />
        </Vacio>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {datos?.map((c) => (
          <Pressable
            key={c.idCultivo}
            onPress={() => router.push(`/riego/${c.idCultivo}`)}
            style={({ pressed }) => [{ width: '47%', marginBottom: 16, opacity: pressed ? 0.85 : 1 }, sombra]}
            accessibilityRole="button"
            accessibilityLabel={`Riego de ${c.tipoCultivo}`}
          >
            <ImageBackground source={imagenes.panel} resizeMode="stretch" style={est.tarjeta} imageStyle={{ borderRadius: 12 }}>
              <Text style={est.nombre} numberOfLines={1} adjustsFontSizeToFit>{c.tipoCultivo.toUpperCase()}</Text>
              <Image source={c.fotoUrl ? { uri: c.fotoUrl } : imagenes.campo} style={est.foto} resizeMode="cover" />
            </ImageBackground>
          </Pressable>
        ))}
      </View>
    </Pantalla>
  );
}

const est = StyleSheet.create({
  tarjeta: { borderRadius: 12, padding: 10, alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colores.panelBorde },
  nombre: { fontSize: 22, fontWeight: '900', color: '#3A3A3A', letterSpacing: 1, marginBottom: 6 },
  foto: { width: '86%', aspectRatio: 1.1, borderRadius: 6 },
});
