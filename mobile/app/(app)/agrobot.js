// CU-13 AgroBot: chat con IA (Gemini) que acepta preguntas y fotos del cultivo
import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ActionSheetIOS } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Encabezado, Cargando, MensajeError } from '../../src/components/ui';
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
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colores.crema }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
        <View style={{ paddingHorizontal: espacio.l, paddingTop: espacio.l }}>
          <Encabezado
            titulo="AGROBOT"
            icono="robot-happy-outline"
            derecha={
              <Pressable onPress={menu} hitSlop={12} accessibilityLabel="Opciones">
                <Ionicons name="ellipsis-vertical" size={26} color={colores.texto} />
              </Pressable>
            }
          />
          {cupo ? <Text style={{ textAlign: 'center', color: colores.textoSuave, marginTop: -10, marginBottom: 6, fontSize: 12 }}>Preguntas de hoy: {cupo.usados}/{cupo.limite}</Text> : null}
        </View>
        <View style={{ flex: 1, backgroundColor: colores.verdeClaro, marginHorizontal: espacio.l, borderRadius: 14, overflow: 'hidden' }}>
          <FlatList
            ref={lista}
            data={mensajes}
            keyExtractor={(m) => String(m.idMensaje)}
            contentContainerStyle={{ padding: espacio.m }}
            onContentSizeChange={() => lista.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', color: colores.textoSuave, marginTop: 40, paddingHorizontal: 20 }}>
                ¡Hola! Soy AgroBot 🌱{'\n'}Pregúntame sobre tus cultivos o envíame una foto de una hoja enferma.
              </Text>
            }
            renderItem={({ item }) => (
              <View>
                <View style={{ alignSelf: 'flex-end', backgroundColor: colores.verde, borderRadius: 14, padding: 10, maxWidth: '85%', marginBottom: 6 }}>
                  {item.imagenUrl ? <Image source={{ uri: item.imagenUrl }} style={{ width: 180, height: 140, borderRadius: 8, marginBottom: 4 }} /> : null}
                  {item.mensajeUsuario !== '(foto)' ? <Text style={{ color: '#fff', fontSize: 16 }}>{item.mensajeUsuario}</Text> : null}
                </View>
                <View style={{ alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 14, padding: 10, maxWidth: '90%', marginBottom: 12 }}>
                  {item.respuestaBot ? <Text style={{ fontSize: 16, color: colores.texto }}>{item.respuestaBot}</Text> : <ActivityIndicator color={colores.verde} />}
                </View>
              </View>
            )}
          />
        </View>
        <View style={{ padding: espacio.l, paddingTop: espacio.s }}>
          <MensajeError mensaje={error} />
          {foto ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Image source={{ uri: foto.uri }} style={{ width: 54, height: 54, borderRadius: 8 }} />
              <Pressable onPress={() => setFoto(null)} style={{ marginLeft: 8 }}>
                <Text style={{ color: colores.peligro }}>Quitar foto</Text>
              </Pressable>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Pressable onPress={adjuntar} hitSlop={8} style={{ padding: 6 }} accessibilityLabel="Adjuntar foto">
              <Ionicons name="camera-outline" size={26} color={colores.verde} />
            </Pressable>
            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder="Escribe tu pregunta..."
              placeholderTextColor={colores.textoSuave}
              multiline
              maxLength={1000}
              style={{ flex: 1, fontSize: 16, maxHeight: 110, paddingVertical: 8, color: colores.texto }}
            />
            <Pressable onPress={enviar} disabled={enviando || (!texto.trim() && !foto)} style={{ padding: 6, opacity: enviando || (!texto.trim() && !foto) ? 0.4 : 1 }} accessibilityLabel="Enviar">
              {enviando ? <ActivityIndicator color={colores.verde} /> : <Ionicons name="send" size={24} color={colores.verde} />}
            </Pressable>
          </View>
          <Text style={{ fontSize: 11, color: colores.textoSuave, textAlign: 'center', marginTop: 6 }}>
            AgroBot puede equivocarse. Confirma tratamientos con un técnico de la UMATA.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
