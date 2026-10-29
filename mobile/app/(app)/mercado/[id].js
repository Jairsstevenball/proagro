// Detalle de publicación: Contactar por WhatsApp · Reportar
import { useState } from 'react';
import { View, Text, Image, Linking, Alert, Modal, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pantalla, Encabezado, Tarjeta, Boton, Cargando, MensajeError, Campo } from '../../../src/components/ui';
import { mercadoApi } from '../../../src/api/servicios';
import { useDatos } from '../../../src/utils/useDatos';
import { colores, espacio, texto } from '../../../src/tema';
import { pesos, numero, fechaCorta } from '../../../src/utils/formato';

const MOTIVOS = [
  ['ESTAFA', 'Parece una estafa'],
  ['PRODUCTO_PROHIBIDO', 'Producto prohibido o peligroso'],
  ['PRECIO_ENGANOSO', 'Precio engañoso'],
  ['OFENSIVO', 'Contenido ofensivo'],
  ['OTRO', 'Otro motivo'],
];

export default function DetalleProducto() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { datos: p, cargando, error, recargar } = useDatos(() => mercadoApi.uno(id), [id]);
  const [contactando, setContactando] = useState(false);
  const [reportar, setReportar] = useState(false);
  const [motivo, setMotivo] = useState(null);
  const [detalle, setDetalle] = useState('');
  const [errorAccion, setErrorAccion] = useState(null);

  async function contactar() {
    setContactando(true);
    setErrorAccion(null);
    try {
      const { whatsapp } = await mercadoApi.contactar(p.idProducto);
      // Solo se abren enlaces oficiales de WhatsApp (nunca una URL arbitraria del servidor)
      if (!/^https:\/\/wa\.me\/\d+\?text=/.test(whatsapp)) throw new Error('Enlace inválido');
      await Linking.openURL(whatsapp);
    } catch (e) {
      setErrorAccion(e.message === 'Enlace inválido' ? 'No se pudo abrir WhatsApp' : e.message);
    } finally {
      setContactando(false);
    }
  }

  async function enviarReporte() {
    if (!motivo) return;
    try {
      const r = await mercadoApi.reportar(p.idProducto, { motivo, detalle: detalle.trim() || null });
      setReportar(false);
      Alert.alert('Reporte enviado', r.mensaje);
    } catch (e) {
      Alert.alert('No se pudo reportar', e.message);
    }
  }

  if (cargando) return <Cargando />;
  if (!p) return <Pantalla><Encabezado titulo="MERCADO" /><MensajeError mensaje={error} onReintentar={recargar} /></Pantalla>;

  return (
    <Pantalla>
      <Encabezado titulo="MERCADO" icono="storefront-outline" />
      {p.fotoUrl ? <Image source={{ uri: p.fotoUrl }} style={{ width: '100%', height: 220, borderRadius: 12, marginBottom: espacio.m }} /> : null}
      <Text style={[texto.subtitulo, { fontSize: 22 }]}>{p.titulo}</Text>
      <Text style={{ color: colores.verde, fontSize: 26, fontWeight: '900', marginVertical: 4 }}>{pesos(p.precio)} <Text style={texto.suave}>por {p.unidad}</Text></Text>
      <Text style={texto.normal}>{numero(p.cantidad, 1)} {p.unidad} disponibles · {p.categoria}</Text>
      {p.descripcion ? <Tarjeta estilo={{ marginTop: espacio.m }}><Text style={texto.normal}>{p.descripcion}</Text></Tarjeta> : null}
      <Tarjeta titulo="Vendedor" icono="account-outline" blanca estilo={{ marginTop: espacio.s }}>
        <Text style={texto.normal}>{p.vendedor?.nombre} · Vereda {p.vereda}</Text>
        {p.vendedor?.desde ? <Text style={texto.suave}>En ProAgro desde {fechaCorta(p.vendedor.desde)}</Text> : null}
        <Text style={texto.suave}>Publicado el {fechaCorta(p.fechaPublicacion)}</Text>
      </Tarjeta>
      <Tarjeta blanca estilo={{ backgroundColor: '#FFF6DD' }}>
        <Text style={{ fontSize: 13 }}>🛡 Consejos de seguridad: revisa el producto antes de pagar, no envíes dinero por adelantado a desconocidos y reúnete en un lugar público.</Text>
      </Tarjeta>
      <MensajeError mensaje={errorAccion} />
      {p.esMio ? (
        <Boton titulo="Editar publicación" onPress={() => router.push({ pathname: '/mercado/publicar', params: { id: p.idProducto } })} />
      ) : (
        <>
          <Boton titulo="Contactar por WhatsApp" icono="logo-whatsapp" onPress={contactar} cargando={contactando} />
          <Pressable onPress={() => setReportar(true)} style={{ alignSelf: 'center', marginTop: 10 }}>
            <Text style={{ color: colores.peligro }}>Reportar publicación</Text>
          </Pressable>
        </>
      )}

      <Modal visible={reportar} transparent animationType="slide" onRequestClose={() => setReportar(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: espacio.xl }}>
            <Text style={texto.subtitulo}>¿Por qué reportas esta publicación?</Text>
            {MOTIVOS.map(([v, n]) => (
              <Pressable key={v} onPress={() => setMotivo(v)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                <Ionicons name={motivo === v ? 'radio-button-on' : 'radio-button-off'} size={22} color={colores.verde} />
                <Text style={[texto.normal, { marginLeft: 8 }]}>{n}</Text>
              </Pressable>
            ))}
            <Campo value={detalle} onChangeText={setDetalle} placeholder="Detalle (opcional)" maxLength={300} multiline />
            <Boton titulo="Enviar reporte" variante="peligro" onPress={enviarReporte} deshabilitado={!motivo} />
            <Boton titulo="Cancelar" variante="secundario" onPress={() => setReportar(false)} />
          </View>
        </View>
      </Modal>
    </Pantalla>
  );
}
