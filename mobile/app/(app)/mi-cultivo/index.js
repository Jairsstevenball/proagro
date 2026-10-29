// CU-08 Gestionar mis cultivos: Agregar · Activos · Inactivos (botones con foto de campo, como el mockup)
import { Pressable, Text, View, ImageBackground, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pantalla, Encabezado } from '../../../src/components/ui';
import { sombra, imagenes } from '../../../src/tema';

function Opcion({ titulo, icono, imagen, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ marginBottom: 26, opacity: pressed ? 0.85 : 1 }, sombra]} accessibilityRole="button" accessibilityLabel={titulo}>
      <ImageBackground source={imagen} style={est.opcion} imageStyle={{ borderRadius: 8 }}>
        <View style={est.velo} />
        <Ionicons name={icono} size={40} color="#fff" />
        <Text style={est.texto}>{titulo}</Text>
      </ImageBackground>
    </Pressable>
  );
}

export default function MiCultivo() {
  const router = useRouter();
  return (
    <Pantalla>
      <Encabezado titulo="MI CULTIVO" icono="logo" subtitulo="Registra la información de tus cultivos" />
      <View style={{ marginTop: 16, paddingHorizontal: 6 }}>
        <Opcion titulo="Agregar cultivos" icono="add" imagen={imagenes.campo} onPress={() => router.push('/agregar')} />
        <Opcion titulo="Cultivos Activos" icono="checkmark-circle-outline" imagen={imagenes.campo} onPress={() => router.push({ pathname: '/mi-cultivo/lista', params: { estado: 'ACTIVO' } })} />
        <Opcion titulo="Cultivos Inactivos" icono="remove-circle-outline" imagen={imagenes.campoGris} onPress={() => router.push({ pathname: '/mi-cultivo/lista', params: { estado: 'INACTIVO' } })} />
      </View>
    </Pantalla>
  );
}

const est = StyleSheet.create({
  opcion: { height: 84, borderRadius: 8, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 },
  velo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.22)' },
  texto: { color: '#fff', fontSize: 20, fontWeight: '800', marginLeft: 14, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
});
