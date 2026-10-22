// CU-09 / CU-10 Consultar cultivos activos o inactivos (tarjetas "PAPA", "MORA")
import { Pressable, Text, ImageBackground, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pantalla, Encabezado, Cargando, MensajeError, Vacio, Boton } from '../../../src/components/ui';
import { cultivosApi } from '../../../src/api/servicios';
import { useDatos } from '../../../src/utils/useDatos';
import { colores, sombra } from '../../../src/tema';

export default function Lista() {
  const { estado = 'ACTIVO' } = useLocalSearchParams();
  const router = useRouter();
  const { datos, cargando, error, recargar } = useDatos(() => cultivosApi.lista(estado), [estado]);
  const activos = estado === 'ACTIVO';

  if (cargando) return <Cargando />;
  return (
    <Pantalla>
      <Encabezado titulo="MI CULTIVO" icono="sprout" subtitulo={activos ? 'Cultivos activos' : 'Cultivos inactivos'} />
      <MensajeError mensaje={error} onReintentar={recargar} />
      {datos?.length === 0 ? (
        <Vacio mensaje={activos ? 'Aún no tienes cultivos activos.' : 'No tienes cultivos inactivos.'}>
          {activos ? <Boton titulo="Agregar cultivo" onPress={() => router.push('/agregar')} /> : null}
        </Vacio>
      ) : null}
      {datos?.map((c) => (
        <Pressable key={c.idCultivo} onPress={() => router.push(`/mi-cultivo/${c.idCultivo}`)} style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', ...sombra }}>
          <ImageBackground source={c.fotoUrl ? { uri: c.fotoUrl } : undefined} style={{ height: 110, justifyContent: 'center', alignItems: 'center', backgroundColor: activos ? colores.verde : '#9AA59A' }}>
            <View style={{ backgroundColor: 'rgba(0,0,0,0.35)', ...StyleFill }} />
            <Text style={{ color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: 2 }}>{c.tipoCultivo.toUpperCase()}</Text>
            {c.areaM2 ? <Text style={{ color: '#fff' }}>{c.areaM2} m²</Text> : null}
          </ImageBackground>
        </Pressable>
      ))}
    </Pantalla>
  );
}

const StyleFill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };
