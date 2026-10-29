// CU-13 AgroBot: chat con IA (Gemini) que acepta preguntas y fotos del cultivo
import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ActionSheetIOS, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Cargando, MensajeError, Fondo, Titulo, Volver } from '../../src/components/ui';
import { agrobotApi } from '../../src/api/servicios';
import { tomarFoto, escogerFoto } from '../../src/utils/fotos';
import { colores, espacio } from '../../src/tema';

export default function AgroBot() {
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [texto, setTexto] = useState('');
  const [foto, setFoto] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [cupo, setCupo] = useState(null);
  const lista = useRef(null);

  useEffect(() => {
    Promise.all([agrobotApi.historial(), agrobotApi.cupo()])
      .then(([h, c]) => {
        setMensajes(h);
        setCupo(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  async function enviar() {
    const t = texto.trim();
    if (!t && !foto) return;
    setEnviando(true);
    setError(null);
    const pendiente = { idMensaje: `p${Date.now()}`, mensajeUsuario: t || '(foto)', imagenUrl: foto?.uri, respuestaBot: null };
    setMensajes((m) => [...m, pendiente]);
    setTexto('');
    const fotoEnviada = foto;
    setFoto(null);
    try {
      const r = await agrobotApi.enviar(t, fotoEnviada);
      setMensajes((m) => m.map((x) => (x.idMensaje === pendiente.idMensaje ? r : x)));
      setCupo((c) => (c ? { ...c, usados: c.usados + 1 } : c));
    } catch (e) {
      setMensajes((m) => m.filter((x) => x.idMensaje !== pendiente.idMensaje));
      setTexto(t);
      setFoto(fotoEnviada);
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  function adjuntar() {
    const elegir = async (i) => {
      const f = i === 0 ? await tomarFoto() : i === 1 ? await escogerFoto() : null;
      if (f) setFoto(f);
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options: ['Tomar foto', 'Elegir de galería', 'Cancelar'], cancelButtonIndex: 2 }, elegir);
    } else {
      Alert.alert('Foto del cultivo', 'Envía una foto clara de la hoja o el fruto afectado', [
        { text: 'Tomar foto', onPress: () => elegir(0) },
        { text: 'Galería', onPress: () => elegir(1) },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  }

  function menu() {
    Alert.alert('AgroBot', '¿Quieres borrar toda la conversación?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            await agrobotApi.borrar();
            setMensajes([]);
          } catch (e) {
            setError(e.message);
          }
        },
      },
    ]);
  }

  if (cargando) return <Cargando />;
  const puedeEnviar = !enviando && (texto.trim() || foto);
  return (
    <Fondo>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
          {/* Encabezado del mockup: (←) en su fila y "AGROBOT" + hoja */}
          <View style={{ paddingHorizontal: espacio.l, paddingTop: espacio.m }}>
            <Volver />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Titulo tamano={38} alinear="left" estilo={{ flexShrink: 1 }}>AGROBOT</Titulo>
              <MaterialCommunityIcons name="leaf" size={38} color={colores.verdeBrillante} style={{ marginLeft: 10, transform: [{ rotate: '-30deg' }] }} />
            </View>
            {cupo ? <Text style={{ color: colores.textoSuave, fontSize: 12, marginBottom: 6 }}>Preguntas de hoy: {cupo.usados}/{cupo.limite}</Text> : null}
          </View>

          {/* Recuadro verde del chat */}
          <View style={est.chat}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingTop: 8 }}>
              <Pressable onPress={menu} hitSlop={12} accessibilityLabel="Opciones">
                <Ionicons name="ellipsis-vertical" size={26} color="#1A1A1A" />
              </Pressable>
              <MaterialCommunityIcons name="sprout-outline" size={28} color="#3A3A3A" />
            </View>
            <FlatList
              ref={lista}
              data={mensajes}
              keyExtractor={(m) => String(m.idMensaje)}
              contentContainerStyle={{ padding: espacio.m, flexGrow: 1 }}
              onContentSizeChange={() => lista.current?.scrollToEnd({ animated: true })}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: colores.texto, marginTop: 40, paddingHorizontal: 20, fontSize: 15 }}>
                  ¡Hola! Soy AgroBot 🌱{'\n'}Pregúntame sobre tus cultivos o envíame una foto de una hoja enferma.
                </Text>
              }
              renderItem={({ item }) => (
                <View>
                  <View style={est.burbujaYo}>
                    {item.imagenUrl ? <Image source={{ uri: item.imagenUrl }} style={{ width: 180, height: 140, borderRadius: 8, marginBottom: 4 }} /> : null}
                    {item.mensajeUsuario !== '(foto)' ? <Text style={{ color: '#fff', fontSize: 16 }}>{item.mensajeUsuario}</Text> : null}
                  </View>
                  <View style={est.burbujaBot}>
                    {item.respuestaBot ? <Text style={{ fontSize: 16, color: colores.texto }}>{item.respuestaBot}</Text> : <ActivityIndicator color={colores.verde} />}
                  </View>
                </View>
              )}
            />
            <View style={{ padding: espacio.s }}>
              <MensajeError mensaje={error} />
              {foto ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Image source={{ uri: foto.uri }} style={{ width: 54, height: 54, borderRadius: 8 }} />
                  <Pressable onPress={() => setFoto(null)} style={{ marginLeft: 8 }}>
                    <Text style={{ color: colores.peligro }}>Quitar foto</Text>
                  </Pressable>
                </View>
              ) : null}
              <View style={est.entrada}>
                <Pressable onPress={adjuntar} hitSlop={8} style={{ padding: 6 }} accessibilityLabel="Adjuntar foto">
                  <Ionicons name="camera-outline" size={24} color={colores.verdeOscuro} />
                </Pressable>
                <TextInput
                  value={texto}
                  onChangeText={setTexto}
                  placeholder="Escribe tu pregunta..."
                  placeholderTextColor="#5F7A55"
                  multiline
                  maxLength={1000}
                  style={{ flex: 1, fontSize: 16, maxHeight: 110, paddingVertical: 8, color: colores.texto }}
                />
                <Pressable onPress={enviar} disabled={!puedeEnviar} style={{ padding: 6, opacity: puedeEnviar ? 1 : 0.4 }} accessibilityLabel="Enviar">
                  {enviando ? <ActivityIndicator color={colores.verde} /> : <Ionicons name="send" size={22} color={colores.verde} />}
                </Pressable>
              </View>
            </View>
          </View>
          <Text style={{ fontSize: 11, color: colores.textoSuave, textAlign: 'center', marginVertical: 6, paddingHorizontal: espacio.l }}>
            AgroBot puede equivocarse. Confirma tratamientos con un técnico de la UMATA.
          </Text>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Fondo>
  );
}

const est = StyleSheet.create({
  chat: { flex: 1, backgroundColor: '#B7DCA4', marginHorizontal: espacio.l, borderRadius: 10, overflow: 'hidden', borderWidth: 1.5, borderColor: '#8DBF79' },
  burbujaYo: { alignSelf: 'flex-end', backgroundColor: colores.verde, borderRadius: 14, padding: 10, maxWidth: '85%', marginBottom: 6 },
  burbujaBot: { alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 14, padding: 10, maxWidth: '90%', marginBottom: 12 },
  entrada: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#A3CF8E', borderRadius: 24, paddingHorizontal: 8, paddingVertical: 2 },
});
