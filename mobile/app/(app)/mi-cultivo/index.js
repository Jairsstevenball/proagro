// CU-08 Gestionar mis cultivos: Agregar · Activos · Inactivos
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pantalla, Encabezado } from '../../../src/components/ui';
import { colores, sombra } from '../../../src/tema';

function Opcion({ titulo, icono, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ backgroundColor: colores.verde, borderRadius: 14, paddingVertical: 26, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 20, opacity: pressed ? 0.85 : 1, ...sombra }]}>
      <Ionicons name={icono} size={40} color="#fff" />
      <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginLeft: 16 }}>{titulo}</Text>
    </Pressable>
  );
}

export default function MiCultivo() {
  const router = useRouter();
  return (
    <Pantalla>
      <Encabezado titulo="MI CULTIVO" icono="sprout" subtitulo="Registra la información de tus cultivos" />
      <View style={{ marginTop: 20 }}>
        <Opcion titulo="Agregar cultivos" icono="add-circle-outline" onPress={() => router.push('/agregar')} />
        <Opcion titulo="Cultivos activos" icono="checkmark-circle-outline" onPress={() => router.push({ pathname: '/mi-cultivo/lista', params: { estado: 'ACTIVO' } })} />
        <Opcion titulo="Cultivos inactivos" icono="remove-circle-outline" onPress={() => router.push({ pathname: '/mi-cultivo/lista', params: { estado: 'INACTIVO' } })} />
      </View>
    </Pantalla>
  );
}
