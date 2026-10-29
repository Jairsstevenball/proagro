// CU-08 Gestionar mis cultivos: Agregar · Activos · Inactivos
// Botones de color sólido con opacidad (se lee mejor que sobre la foto); el logo de fondo se ve detrás.
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pantalla, Encabezado } from '../../../src/components/ui';
import { sombra } from '../../../src/tema';

const VERDE = 'rgba(46, 139, 61, 0.88)';
const GRIS = 'rgba(110, 120, 112, 0.85)';

function Opcion({ titulo, icono, color = VERDE, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [est.opcion, { backgroundColor: color, opacity: pressed ? 0.85 : 1 }, sombra]}
      accessibilityRole="button"
      accessibilityLabel={titulo}
    >
      <View style={est.icono}>
        <Ionicons name={icono} size={30} color="#fff" />
      </View>
      <Text style={est.texto}>{titulo}</Text>
      <Ionicons name="chevron-forward" size={24} color="#fff" />
    </Pressable>
  );
}

export default function MiCultivo() {
  const router = useRouter();
  return (
    <Pantalla>
      <Encabezado titulo="MI CULTIVO" icono="logo" subtitulo="Registra la información de tus cultivos" />
      <View style={{ marginTop: 16, paddingHorizontal: 6 }}>
        <Opcion titulo="Agregar cultivos" icono="add" onPress={() => router.push('/agregar')} />
        <Opcion titulo="Cultivos Activos" icono="checkmark-circle-outline" onPress={() => router.push({ pathname: '/mi-cultivo/lista', params: { estado: 'ACTIVO' } })} />
        <Opcion titulo="Cultivos Inactivos" icono="remove-circle-outline" color={GRIS} onPress={() => router.push({ pathname: '/mi-cultivo/lista', params: { estado: 'INACTIVO' } })} />
      </View>
    </Pantalla>
  );
}

const est = StyleSheet.create({
  opcion: { height: 84, borderRadius: 10, marginBottom: 22, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  icono: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  texto: { color: '#fff', fontSize: 20, fontWeight: '800', marginLeft: 14, flex: 1 },
});
