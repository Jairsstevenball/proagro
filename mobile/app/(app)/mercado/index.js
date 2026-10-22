// CU-06 Mercado: cosechas para comprar directo al agricultor e insumos agrícolas
import { useCallback, useState } from 'react';
import { View, Text, Pressable, Image, FlatList, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Encabezado, MensajeError, Vacio } from '../../../src/components/ui';
import { mercadoApi } from '../../../src/api/servicios';
import { colores, espacio, sombra, texto } from '../../../src/tema';
import { pesos, numero } from '../../../src/utils/formato';

export default function Mercado() {
  const router = useRouter();
  const [tipo, setTipo] = useState('COSECHA');
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [datos, setDatos] = useState({ productos: [], pagina: 1, paginas: 1 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async (pagina = 1) => {
    setCargando(true);
    setError(null);
    try {
      const r = await mercadoApi.lista({ tipo, q: busqueda || undefined, pagina });
      setDatos((d) => ({ ...r, productos: pagina === 1 ? r.productos : [...d.productos, ...r.productos] }));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [tipo, busqueda]);

  useFocusEffect(useCallback(() => { cargar(1); }, [cargar]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colores.crema }} edges={['top']}>
      <FlatList
        data={datos.productos}
        keyExtractor={(p) => String(p.idProducto)}
        contentContainerStyle={{ padding: espacio.l, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={cargando && datos.pagina === 1} onRefresh={() => cargar(1)} colors={[colores.verde]} />}
        onEndReached={() => !cargando && datos.pagina < datos.paginas && cargar(datos.pagina + 1)}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <>
            <Encabezado titulo="MERCADO" icono="storefront-outline" subtitulo="Compra y vende sin intermediarios" />
            <View style={{ flexDirection: 'row', marginBottom: espacio.m, backgroundColor: '#fff', borderRadius: 24, padding: 4 }}>
              {[['COSECHA', 'Cosechas'], ['INSUMO', 'Insumos']].map(([v, n]) => (
                <Pressable key={v} onPress={() => setTipo(v)} style={{ flex: 1, paddingVertical: 10, borderRadius: 20, backgroundColor: tipo === v ? colores.verde : 'transparent', alignItems: 'center' }}>
                  <Text style={{ color: tipo === v ? '#fff' : colores.texto, fontWeight: '700' }}>{n}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, marginBottom: espacio.m }}>
              <Ionicons name="search" size={20} color={colores.textoSuave} />
              <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => setBusqueda(q.trim())} returnKeyType="search" placeholder="Buscar (ej: papa, semillas)" maxLength={60} style={{ flex: 1, paddingVertical: 10, marginLeft: 6, fontSize: 16 }} />
            </View>
            <Pressable onPress={() => router.push('/mercado/mios')} style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
              <Text style={{ color: colores.verde, fontWeight: '700' }}>Mis publicaciones ›</Text>
            </Pressable>
            <MensajeError mensaje={error} onReintentar={() => cargar(1)} />
          </>
        }
        ListEmptyComponent={!cargando ? <Vacio icono="storefront-outline" mensaje="No hay publicaciones todavía. ¡Sé el primero en publicar!" /> : null}
        renderItem={({ item: p }) => (
          <Pressable onPress={() => router.push(`/mercado/${p.idProducto}`)} style={{ flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginBottom: espacio.m, overflow: 'hidden', ...sombra }}>
            {p.fotoUrl ? (
              <Image source={{ uri: p.fotoUrl }} style={{ width: 100, height: 100 }} />
            ) : (
              <View style={{ width: 100, height: 100, backgroundColor: colores.verdeClaro, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name={p.tipo === 'COSECHA' ? 'basket-outline' : 'shovel'} size={40} color={colores.verde} />
              </View>
            )}
            <View style={{ flex: 1, padding: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: '800' }} numberOfLines={1}>{p.titulo}</Text>
              <Text style={{ color: colores.verde, fontSize: 18, fontWeight: '900' }}>{pesos(p.precio)} <Text style={texto.suave}>/ {p.unidad}</Text></Text>
              <Text style={texto.suave} numberOfLines={1}>{numero(p.cantidad, 1)} {p.unidad} disponibles · {p.vereda}</Text>
              <Text style={[texto.suave, { fontSize: 12 }]}>{p.vendedor?.nombre}{p.esMio ? ' (tú)' : ''}</Text>
            </View>
          </Pressable>
        )}
      />
      <Pressable onPress={() => router.push('/mercado/publicar')} style={{ position: 'absolute', right: 20, bottom: 20, backgroundColor: colores.verde, borderRadius: 30, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', ...sombra }} accessibilityLabel="Publicar">
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '800', marginLeft: 4 }}>Publicar</Text>
      </Pressable>
    </SafeAreaView>
  );
}
