// Componentes base con el estilo del mockup: fondo crema, tarjetas verde claro, botones verdes.
import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, Modal, FlatList, ActivityIndicator, Image, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colores, espacio, texto, sombra } from '../tema';
import { tomarFoto, escogerFoto } from '../utils/fotos';

export function Logo({ tamano = 'grande', subtitulo }) {
  const g = tamano === 'grande';
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[est.logoCirculo, g ? { width: 120, height: 120, borderRadius: 60 } : { width: 40, height: 40, borderRadius: 20 }]}>
        <MaterialCommunityIcons name="sprout" size={g ? 72 : 24} color={colores.verde} />
      </View>
      {g && <Text style={[texto.titulo, { marginTop: espacio.s, fontSize: 36 }]}>PROAGRO</Text>}
      {subtitulo ? <Text style={texto.suave}>{subtitulo}</Text> : null}
    </View>
  );
}

/** Contenedor de pantalla con fondo crema y scroll opcional. */
export function Pantalla({ children, scroll = true, estilo, bordes = ['top'] }) {
  const contenido = scroll ? (
    <ScrollView contentContainerStyle={[{ padding: espacio.l, paddingBottom: 40 }, estilo]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, padding: espacio.l }, estilo]}>{children}</View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colores.crema }} edges={bordes}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {contenido}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Encabezado "← MI CULTIVO" de cada módulo. */
export function Encabezado({ titulo, subtitulo, icono, atras = true, derecha }) {
  const router = useRouter();
  return (
    <View style={{ marginBottom: espacio.l }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {atras ? (
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/inicio'))} hitSlop={12} accessibilityLabel="Volver">
            <Ionicons name="arrow-back-circle-outline" size={36} color={colores.verde} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {icono ? <MaterialCommunityIcons name={icono} size={30} color={colores.verde} style={{ marginRight: 6 }} /> : null}
          <Text style={texto.titulo} numberOfLines={1} adjustsFontSizeToFit>{titulo}</Text>
        </View>
        {derecha || (atras ? <View style={{ width: 36 }} /> : null)}
      </View>
      {subtitulo ? <Text style={[texto.suave, { textAlign: 'center' }]}>{subtitulo}</Text> : null}
    </View>
  );
}

export function Tarjeta({ children, estilo, titulo, icono }) {
  return (
    <View style={[est.tarjeta, estilo]}>
      {titulo ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: espacio.s }}>
          {icono ? <MaterialCommunityIcons name={icono} size={18} color={colores.verde} style={{ marginRight: 6 }} /> : null}
          <Text style={{ fontWeight: '700', color: colores.texto, fontSize: 15, flex: 1 }}>{titulo}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Campo({ etiqueta, error, ayuda, estilo, ...props }) {
  return (
    <View style={[{ marginBottom: espacio.m }, estilo]}>
      {etiqueta ? <Text style={est.etiqueta}>{etiqueta}</Text> : null}
      <TextInput
        placeholderTextColor={colores.textoSuave}
        style={[est.input, props.multiline && { minHeight: 80, textAlignVertical: 'top' }, error && { borderColor: colores.peligro }]}
        {...props}
      />
      {ayuda && !error ? <Text style={[texto.suave, { fontSize: 12, marginTop: 2 }]}>{ayuda}</Text> : null}
      {error ? <Text style={est.error}>{error}</Text> : null}
    </View>
  );
}

/** Campo de contraseña con botón para mostrar/ocultar. */
export function CampoClave(props) {
  const [ver, setVer] = useState(false);
  return (
    <View>
      <Campo
        {...props}
        secureTextEntry={!ver}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        autoComplete="password"
        importantForAutofill="yes"
      />
      <Pressable onPress={() => setVer(!ver)} style={{ position: 'absolute', right: 10, top: props.etiqueta ? 32 : 12 }} hitSlop={10}>
        <Ionicons name={ver ? 'eye-off-outline' : 'eye-outline'} size={22} color={colores.textoSuave} />
      </Pressable>
    </View>
  );
}

export function Boton({ titulo, onPress, cargando, deshabilitado, variante = 'primario', icono, estilo }) {
  const sec = variante === 'secundario';
  const pel = variante === 'peligro';
  const off = deshabilitado || cargando;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      style={({ pressed }) => [
        est.boton,
        sec && { backgroundColor: colores.blanco, borderWidth: 1.5, borderColor: colores.verde },
        pel && { backgroundColor: colores.peligro },
        off && { opacity: 0.55 },
        pressed && { opacity: 0.8 },
        estilo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={sec ? colores.verde : colores.blanco} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {icono ? <Ionicons name={icono} size={20} color={sec ? colores.verde : colores.blanco} style={{ marginRight: 8 }} /> : null}
          <Text style={[est.botonTexto, sec && { color: colores.verde }]}>{titulo}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Selector desplegable verde como en el mockup ("Selecciona una opción ▾"). */
export function Selector({ etiqueta, valor, opciones, onCambio, placeholder = 'Selecciona una opción', error }) {
  const [abierto, setAbierto] = useState(false);
  const lista = opciones.map((o) => (typeof o === 'string' ? { valor: o, nombre: o } : o));
  const actual = lista.find((o) => o.valor === valor);
  return (
    <View style={{ marginBottom: espacio.m }}>
      {etiqueta ? <Text style={est.etiqueta}>{etiqueta}</Text> : null}
      <Pressable onPress={() => setAbierto(true)} style={[est.selector, error && { borderWidth: 1.5, borderColor: colores.peligro }]} accessibilityRole="button">
        <Text style={{ color: colores.blanco, flex: 1, fontSize: 15 }}>{actual?.nombre || placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={colores.blanco} />
      </Pressable>
      {error ? <Text style={est.error}>{error}</Text> : null}
      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable style={est.fondoModal} onPress={() => setAbierto(false)}>
          <View style={est.listaModal}>
            <FlatList
              data={lista}
              keyExtractor={(o) => String(o.valor)}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onCambio(item.valor);
                    setAbierto(false);
                  }}
                  style={({ pressed }) => [est.opcion, pressed && { backgroundColor: colores.verdeOscuro }]}
                >
                  <Text style={{ color: colores.blanco, fontSize: 17 }}>{item.nombre}</Text>
                  {item.valor === valor ? <Ionicons name="checkmark" size={20} color={colores.blanco} /> : null}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Bloque "Fotografía del cultivo" con Tomar foto / Elegir de galería. */
export function FotoCampo({ foto, urlActual, onCambio, titulo = 'Fotografía' }) {
  const uri = foto?.uri || urlActual;
  return (
    <Tarjeta titulo={titulo} icono="camera-outline">
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: 180, borderRadius: 10, marginBottom: espacio.s }} resizeMode="cover" />
      ) : (
        <View style={est.fotoVacia}>
          <Ionicons name="camera" size={34} color={colores.verde} />
          <Text style={texto.suave}>Agrega una fotografía</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: espacio.s }}>
        <Boton titulo="Tomar foto" icono="camera-outline" variante="secundario" estilo={{ flex: 1, paddingVertical: 8 }} onPress={async () => { const f = await tomarFoto(); if (f) onCambio(f); }} />
        <Boton titulo="Galería" icono="images-outline" variante="secundario" estilo={{ flex: 1, paddingVertical: 8 }} onPress={async () => { const f = await escogerFoto(); if (f) onCambio(f); }} />
      </View>
    </Tarjeta>
  );
}

/** Ventana de confirmación como "¿Está seguro de inactivar este cultivo?" */
export function Confirmar({ visible, mensaje, onSi, onNo, cargando }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onNo}>
      <View style={est.fondoModal}>
        <View style={est.confirmar}>
          <Text style={{ fontSize: 20, fontWeight: '800', textAlign: 'center', color: colores.texto, marginBottom: espacio.l }}>{mensaje}</Text>
          <View style={{ flexDirection: 'row', gap: espacio.m }}>
            <Boton titulo="Sí" onPress={onSi} cargando={cargando} estilo={{ flex: 1 }} />
            <Boton titulo="No" onPress={onNo} variante="secundario" estilo={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function Cargando({ texto: t = 'Cargando...' }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: colores.crema }}>
      <ActivityIndicator size="large" color={colores.verde} />
      <Text style={[texto.suave, { marginTop: 8 }]}>{t}</Text>
    </View>
  );
}

export function MensajeError({ mensaje, onReintentar }) {
  if (!mensaje) return null;
  return (
    <View style={est.cajaError}>
      <Ionicons name="alert-circle" size={20} color={colores.peligro} />
      <Text style={{ color: colores.peligro, flex: 1, marginLeft: 6 }}>{mensaje}</Text>
      {onReintentar ? (
        <Pressable onPress={onReintentar} hitSlop={8}>
          <Text style={{ color: colores.verde, fontWeight: '700' }}>Reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Vacio({ icono = 'sprout-outline', mensaje, children }) {
  return (
    <View style={{ alignItems: 'center', padding: 30 }}>
      <MaterialCommunityIcons name={icono} size={56} color={colores.verdeClaro} />
      <Text style={[texto.suave, { textAlign: 'center', marginVertical: 10 }]}>{mensaje}</Text>
      {children}
    </View>
  );
}

const est = StyleSheet.create({
  logoCirculo: { borderWidth: 4, borderColor: colores.verde, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.blanco },
  tarjeta: { backgroundColor: colores.verdeClaro, borderRadius: 12, padding: espacio.m, marginBottom: espacio.m, ...sombra },
  etiqueta: { fontSize: 14, fontWeight: '600', color: colores.texto, marginBottom: 4 },
  input: {
    backgroundColor: colores.verdeSuave, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
    color: colores.texto, borderWidth: 1, borderColor: colores.borde,
  },
  error: { color: colores.peligro, fontSize: 13, marginTop: 3 },
  boton: { backgroundColor: colores.verde, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
  botonTexto: { color: colores.blanco, fontWeight: '700', fontSize: 16 },
  selector: { backgroundColor: colores.verde, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, flexDirection: 'row', alignItems: 'center' },
  fondoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 30 },
  listaModal: { backgroundColor: colores.verde, borderRadius: 10, maxHeight: '70%', overflow: 'hidden' },
  opcion: { paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between' },
  fotoVacia: { height: 120, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colores.verde, alignItems: 'center', justifyContent: 'center', marginBottom: espacio.s, backgroundColor: colores.verdeSuave },
  confirmar: { backgroundColor: '#E9F3C9', borderRadius: 14, padding: espacio.xl },
  cajaError: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDECEA', borderRadius: 8, padding: 10, marginBottom: espacio.m },
});
