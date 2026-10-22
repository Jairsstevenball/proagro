// CU-05 Gestionar riego: elegir el cultivo (tarjetas PAPA / MORA del mockup)
import { Pressable, Text, Image, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pantalla, Encabezado, Cargando, MensajeError, Vacio, Boton } from '../../../src/components/ui';
import { cultivosApi } from '../../../src/api/servicios';
import { useDatos } from '../../../src/utils/useDatos';
import { colores, sombra } from '../../../src/tema';

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
          <Pressable key={c.idCultivo} onPress={() => router.push(`/riego/${c.idCultivo}`)} style={{ width: '48%', backgroundColor: colores.verdeClaro, borderRadius: 14, padding: 10, marginBottom: 14, alignItems: 'center', ...sombra }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: colores.texto }}>{c.tipoCultivo.toUpperCase()}</Text>
            {c.fotoUrl ? (
              <Image source={{ uri: c.fotoUrl }} style={{ width: '100%', height: 100, borderRadius: 10, marginTop: 6 }} />
            ) : (
              <MaterialCommunityIcons name="sprout" size={70} color={colores.verde} style={{ marginTop: 6 }} />
            )}
          </Pressable>
        ))}
      </View>
    </Pantalla>
  );
}
