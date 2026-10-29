// Componentes base con el estilo del mockup:
// fondo de mármol con la marca de agua del logo, títulos verdes gruesos, campos verde translúcido,
// tarjetas verde claro con degradado, botones verde oscuro en píldora y selector verde.
import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, Modal, FlatList, ActivityIndicator, Image, ImageBackground, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colores, espacio, texto, sombra, imagenes, relleno } from '../tema';
import { tomarFoto, escogerFoto } from '../utils/fotos';

/** Título verde grueso del mockup: PROAGRO, REGISTRO, MI CULTIVO, RIEGO... */
export function Titulo({ children, tamano = 34, estilo, alinear = 'center' }) {
  return (
    <Text style={[texto.titulo, { fontSize: tamano, textAlign: alinear }, estilo]} numberOfLines={1} adjustsFontSizeToFit accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Logo con laurel (pantalla de carga) o el ícono redondo (encabezados). */
export function Logo({ tamano = 'grande', subtitulo }) {
  if (tamano !== 'grande') return <Image source={imagenes.icono} style={{ width: 38, height: 38 }} accessibilityLabel="ProAgro" />;
  return (
    <View style={{ alignItems: 'center' }}>
      <Image source={imagenes.logo} style={{ width: 190, height: 212 }} resizeMode="contain" accessibilityLabel="Logo de ProAgro" />
      <Titulo tamano={40} estilo={{ marginTop: 6 }}>PROAGRO</Titulo>
      {subtitulo ? <Text style={[texto.suave, { textAlign: 'center', marginTop: 4 }]}>{subtitulo}</Text> : null}
    </View>
  );
}

/** Marca de agua del mockup: el logo y "PROAGRO" muy suaves detrás del contenido. */
function MarcaDeAgua() {
  return (
    <View pointerEvents="none" style={est.marca}>
      <Image source={imagenes.logo} style={{ width: 260, height: 290, opacity: 0.11 }} resizeMode="contain" />
      <Text style={[texto.titulo, { fontSize: 58, opacity: 0.1, textShadowRadius: 0 }]}>PROAGRO</Text>
    </View>
  );
}

/** Fondo de mármol + marca de agua. Úsenlo en pantallas que no usan <Pantalla>. */
export function Fondo({ children, marca = true, estilo }) {
  return (
    <ImageBackground source={imagenes.fondo} style={[{ flex: 1, backgroundColor: colores.crema }, estilo]} resizeMode="cover">
      {marca ? <MarcaDeAgua /> : null}
      {children}
    </ImageBackground>
  );
}

/** Contenedor de pantalla con fondo de mármol y scroll opcional. */
export function Pantalla({ children, scroll = true, estilo, bordes = ['top'], marca = true, refreshControl }) {
  const contenido = scroll ? (
    <ScrollView contentContainerStyle={[{ padding: espacio.l, paddingBottom: 40 }, estilo]} keyboardShouldPersistTaps="handled" refreshControl={refreshControl}>
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, padding: espacio.l }, estilo]}>{children}</View>
  );
  return (
    <Fondo marca={marca}>
      <SafeAreaView style={{ flex: 1 }} edges={bordes}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {contenido}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Fondo>
  );
}

/** Botón ⊖ de volver (círculo con flecha, verde). */
export function Volver() {
  const router = useRouter();
  return (
    <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/inicio'))} hitSlop={12} accessibilityLabel="Volver">
      <Ionicons name="arrow-back-circle-outline" size={38} color={colores.verde} />
    </Pressable>
  );
}

/**
 * Encabezado de cada módulo como en el mockup: (←)  [ícono] MI CULTIVO
 *                                                    Registra la información de tus cultivos
 * icono: 'logo' (círculo ProAgro), un nombre de MaterialCommunityIcons, o nada.
 */
export function Encabezado({ titulo, subtitulo, icono, atras = true, derecha }) {
  return (
    <View style={{ marginBottom: espacio.l }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {atras ? <Volver /> : null}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
          {icono === 'logo' ? (
            <Image source={imagenes.icono} style={{ width: 40, height: 40, marginRight: 6 }} />
          ) : icono ? (
            <MaterialCommunityIcons name={icono} size={40} color={colores.verdeBrillante} style={{ marginRight: 4 }} />
          ) : null}
          {titulo ? <Titulo estilo={{ flexShrink: 1 }}>{titulo}</Titulo> : null}
        </View>
        {derecha || (atras ? <View style={{ width: 38 }} /> : null)}
      </View>
      {subtitulo ? <Text style={[texto.suave, { textAlign: 'center', fontSize: 13, marginTop: 2 }]}>{subtitulo}</Text> : null}
    </View>
  );
}

/** Tarjeta verde con degradado: "Información básica", "Tipo de abono", preguntas de riego... */
export function Tarjeta({ children, estilo, titulo, icono, blanca }) {
  const cabecera = titulo ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: espacio.s }}>
      {icono ? <MaterialCommunityIcons name={icono} size={18} color={colores.verdeOscuro} style={{ marginRight: 6 }} /> : null}
      <Text style={{ fontWeight: '700', color: colores.texto, fontSize: 15, flex: 1 }}>{titulo}</Text>
    </View>
  ) : null;
  if (blanca) {
    return (
      <View style={[est.tarjetaBlanca, estilo]}>
        {cabecera}
        {children}
      </View>
    );
  }
  return (
    <ImageBackground source={imagenes.panel} resizeMode="stretch" style={[est.tarjeta, estilo]} imageStyle={{ borderRadius: 6 }}>
      {cabecera}
      {children}
    </ImageBackground>
  );
}

export function Campo({ etiqueta, error, ayuda, estilo, ...props }) {
  return (
    <View style={[{ marginBottom: espacio.m }, estilo]}>
      {etiqueta ? <Text style={texto.etiqueta}>{etiqueta}</Text> : null}
      <TextInput
        placeholderTextColor="#5F7A55"
        style={[est.input, props.multiline && { minHeight: 80, textAlignVertical: 'top' }, error && { borderColor: colores.peligro, borderWidth: 1.5 }]}
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
        textContentType={props.textContentType || 'password'}
        autoComplete="password"
        importantForAutofill="yes"
      />
      <Pressable onPress={() => setVer(!ver)} style={{ position: 'absolute', right: 10, top: props.etiqueta ? 30 : 10 }} hitSlop={10} accessibilityLabel={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
        <Ionicons name={ver ? 'eye-off-outline' : 'eye-outline'} size={22} color={colores.verdeOscuro} />
      </Pressable>
    </View>
  );
}

/** Botón verde en píldora. ancho="auto" lo deja centrado y corto como en el mockup. */
export function Boton({ titulo, onPress, cargando, deshabilitado, variante = 'primario', icono, estilo, ancho = 'auto' }) {
  const sec = variante === 'secundario';
  const pel = variante === 'peligro';
  const off = deshabilitado || cargando;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      style={({ pressed }) => [
        est.boton,
        ancho === 'auto' && { alignSelf: 'center', minWidth: 190 },
        sec && { backgroundColor: colores.blanco, borderWidth: 2, borderColor: colores.verde },
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
          {icono ? <Ionicons name={icono} size={19} color={sec ? colores.verde : colores.blanco} style={{ marginRight: 8 }} /> : null}
          <Text style={[est.botonTexto, sec && { color: colores.verde }]}>{titulo}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Selector desplegable verde como en el mockup ("Selecciona una opción ▾"). */
export function Selector({ etiqueta, valor, opciones, onCambio, placeholder = 'Selecciona una opción', error, ancho = '75%' }) {
  const [abierto, setAbierto] = useState(false);
  const lista = opciones.map((o) => (typeof o === 'string' ? { valor: o, nombre: o } : o));
  const actual = lista.find((o) => o.valor === valor);
  return (
    <View style={{ marginBottom: espacio.m }}>
      {etiqueta ? <Text style={texto.etiqueta}>{etiqueta}</Text> : null}
      <Pressable onPress={() => setAbierto(true)} style={[est.selector, { width: ancho }, error && { borderWidth: 1.5, borderColor: colores.peligro }]} accessibilityRole="button" accessibilityLabel={etiqueta || placeholder}>
        <Text style={{ color: actual ? colores.blanco : '#D8EED0', flex: 1, fontSize: 14 }} numberOfLines={1}>{actual?.nombre || placeholder}</Text>
        <Ionicons name="caret-down" size={14} color={colores.blanco} />
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

/** Bloque "Fotografía del cultivo": recuadro "Agregar una fotografía" + Tomar foto / Seleccionar de galería. */
export function FotoCampo({ foto, urlActual, onCambio, titulo = 'Fotografía' }) {
  const uri = foto?.uri || urlActual;
  const tomar = async () => { const f = await tomarFoto(); if (f) onCambio(f); };
  const galeria = async () => { const f = await escogerFoto(); if (f) onCambio(f); };
  return (
    <Tarjeta titulo={titulo} icono="camera-outline">
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: 170, borderRadius: 4, marginBottom: espacio.s }} resizeMode="cover" />
      ) : (
        <Pressable onPress={tomar} style={est.fotoVacia} accessibilityLabel="Agregar una fotografía">
          <Ionicons name="camera" size={30} color={colores.texto} />
          <Text style={{ color: colores.texto, fontSize: 14 }}>Agregar una fotografía</Text>
          <Text style={[texto.suave, { fontSize: 11 }]}>Toma una foto clara de tu cultivo</Text>
        </Pressable>
      )}
      <View style={{ flexDirection: 'row', gap: espacio.s, justifyContent: 'center' }}>
        <MiniBoton icono="camera-outline" titulo="Tomar fotografía" onPress={tomar} />
        <MiniBoton icono="images-outline" titulo="Seleccionar de galería" onPress={galeria} />
      </View>
    </Tarjeta>
  );
}

function MiniBoton({ icono, titulo, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [est.miniBoton, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel={titulo}>
      <Ionicons name={icono} size={15} color={colores.blanco} />
      <Text style={{ color: colores.blanco, fontSize: 12, marginLeft: 4 }}>{titulo}</Text>
    </Pressable>
  );
}

/** Ventana verde "Esta seguro de inactivar este cultivo !!!!" con Sí / No. */
export function Confirmar({ visible, mensaje, onSi, onNo, cargando }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onNo}>
      <View style={est.fondoModal}>
        <View style={est.confirmar}>
          <Text style={{ fontSize: 20, fontWeight: '800', textAlign: 'center', color: colores.texto, marginBottom: espacio.l }}>{mensaje}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: espacio.xl }}>
            <Boton titulo="Sí" onPress={onSi} cargando={cargando} ancho="lleno" estilo={{ flex: 1 }} />
            <Boton titulo="No" onPress={onNo} ancho="lleno" estilo={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Pantalla de carga del mockup: logo con laurel + barra. */
export function Cargando({ texto: t = 'Cargando...', logo = false }) {
  if (logo) {
    return (
      <Fondo marca={false} estilo={{ alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <Logo />
        <View style={est.barraCarga}>
          <View style={est.barraCargaRelleno} />
        </View>
        <Text style={[texto.suave, { marginTop: 10 }]}>{t}</Text>
      </Fondo>
    );
  }
  return (
    <Fondo estilo={{ alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <ActivityIndicator size="large" color={colores.verde} />
      <Text style={[texto.suave, { marginTop: 8 }]}>{t}</Text>
    </Fondo>
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
      <MaterialCommunityIcons name={icono} size={56} color={colores.verde} />
      <Text style={[texto.normal, { textAlign: 'center', marginVertical: 10, color: colores.textoSuave }]}>{mensaje}</Text>
      {children}
    </View>
  );
}

const est = StyleSheet.create({
  marca: { ...relleno, alignItems: 'center', justifyContent: 'center', paddingTop: 120 },
  tarjeta: { borderRadius: 6, padding: espacio.m, marginBottom: espacio.m, overflow: 'hidden', borderWidth: 1, borderColor: colores.panelBorde },
  tarjetaBlanca: { backgroundColor: colores.blanco, borderRadius: 10, padding: espacio.m, marginBottom: espacio.m, borderWidth: 1, borderColor: '#E3E8DC', ...sombra },
  input: {
    backgroundColor: colores.campo, borderRadius: 3, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colores.texto,
  },
  error: { color: colores.peligro, fontSize: 13, marginTop: 3 },
  boton: { backgroundColor: colores.verde, borderRadius: 22, paddingVertical: 10, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', marginVertical: 8, ...sombra },
  botonTexto: { color: colores.blanco, fontSize: 16 },
  selector: { backgroundColor: colores.verde, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', ...sombra },
  fondoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 30 },
  listaModal: { backgroundColor: colores.verde, borderRadius: 4, maxHeight: '70%', overflow: 'hidden' },
  opcion: { paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between' },
  fotoVacia: { height: 110, borderRadius: 4, borderWidth: 1.5, borderColor: '#8DB36F', alignItems: 'center', justifyContent: 'center', marginBottom: espacio.s, backgroundColor: 'rgba(255,255,255,0.35)' },
  miniBoton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colores.verde, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 10 },
  confirmar: { backgroundColor: colores.panel, borderRadius: 10, padding: espacio.xl, ...sombra },
  cajaError: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDECEA', borderRadius: 8, padding: 10, marginBottom: espacio.m },
  barraCarga: { width: '80%', height: 22, borderRadius: 11, backgroundColor: 'rgba(132,196,104,0.35)', marginTop: 40, overflow: 'hidden' },
  barraCargaRelleno: { width: '60%', height: '100%', borderRadius: 11, backgroundColor: 'rgba(132,196,104,0.75)' },
});
