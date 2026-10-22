// Mis publicaciones: pausar, reactivar, marcar vendido, editar o eliminar
import { View, Text, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Pantalla, Encabezado, Cargando, MensajeError, Vacio, Boton } from '../../../src/components/ui';
import { mercadoApi } from '../../../src/api/servicios';
import { useDatos } from '../../../src/utils/useDatos';
import { colores, espacio, sombra, texto } from '../../../src/tema';
import { pesos } from '../../../src/utils/formato';

const ESTADO = {
  ACTIVO: ['Activa', colores.verde],
  PAUSADO: ['Pausada', colores.precaucion],
  VENDIDO: ['Vendida', colores.info],
  OCULTO: ['En revisión', colores.peligro],
};

export default function Mios() {
  const router = useRouter();
  const { datos, cargando, error, recargar } = useDatos(() => mercadoApi.mios());

  async function accion(fn) {
    try {
      await fn();
      await recargar();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  const eliminar = (p) =>
    Alert.alert('Eliminar', `¿Eliminar "${p.titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => accion(() => mercadoApi.eliminar(p.idProducto)) },
    ]);

  if (cargando) return <Cargando />;
  return (
    <Pantalla>
      <Encabezado titulo="MIS VENTAS" icono="storefront-outline" />
      <MensajeError mensaje={error} onReintentar={recargar} />
      {datos?.length === 0 ? (
        <Vacio icono="storefront-outline" mensaje="Aún no has publicado nada.">
          <Boton titulo="Publicar" onPress={() => router.push('/mercado/publicar')} />
        </Vacio>
      ) : null}
      {datos?.map((p) => {
        const [nombre, color] = ESTADO[p.estado];
        return (
          <View key={p.idProducto} style={{ backgroundColor: '#fff', borderRadius: 12, padding: espacio.m, marginBottom: espacio.m, ...sombra }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '800', fontSize: 16, flex: 1 }} numberOfLines={1}>{p.titulo}</Text>
              <Text style={{ color, fontWeight: '700' }}>{nombre}</Text>
            </View>
            <Text style={texto.normal}>{pesos(p.precio)} / {p.unidad} · {p.contactos} interesado(s)</Text>
            {p.estado === 'OCULTO' ? <Text style={[texto.suave, { color: colores.peligro }]}>Recibió reportes. Un administrador la está revisando.</Text> : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8 }}>
              {p.estado !== 'OCULTO' ? <Enlace t="Editar" onPress={() => router.push({ pathname: '/mercado/publicar', params: { id: p.idProducto } })} /> : null}
              {p.estado === 'ACTIVO' ? <Enlace t="Pausar" onPress={() => accion(() => mercadoApi.estado(p.idProducto, 'PAUSADO'))} /> : null}
              {p.estado === 'PAUSADO' || p.estado === 'VENDIDO' ? <Enlace t="Activar" onPress={() => accion(() => mercadoApi.estado(p.idProducto, 'ACTIVO'))} /> : null}
              {p.estado === 'ACTIVO' ? <Enlace t="Marcar vendido" onPress={() => accion(() => mercadoApi.estado(p.idProducto, 'VENDIDO'))} /> : null}
              <Enlace t="Eliminar" color={colores.peligro} onPress={() => eliminar(p)} />
            </View>
          </View>
        );
      })}
    </Pantalla>
  );
}

function Enlace({ t, onPress, color = colores.verde }) {
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Text style={{ color, fontWeight: '700' }}>{t}</Text>
    </Pressable>
  );
}
