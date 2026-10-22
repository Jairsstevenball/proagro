// Tomar o escoger una foto. Se reduce a 1280 px en JPEG y se entrega en base64:
// así se envía en una petición JSON normal (evita un error de Android al subir archivos).
// Al re-codificar se descartan los metadatos (EXIF/GPS) desde el origen.
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Alert } from 'react-native';

async function preparar(resultado) {
  if (resultado.canceled || !resultado.assets?.[0]) return null;
  const a = resultado.assets[0];
  try {
    const ctx = ImageManipulator.manipulate(a.uri);
    if ((a.width || 0) > 1280) ctx.resize({ width: 1280 });
    const imagen = await ctx.renderAsync();
    const r = await imagen.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
    if (r.base64) return { uri: r.uri, base64: r.base64 };
  } catch {
    // si falla la reducción usamos la versión comprimida que ya dio el selector
  }
  if (a.base64) return { uri: a.uri, base64: a.base64 };
  Alert.alert('Foto', 'No se pudo preparar la foto. Intenta con otra.');
  return null;
}

// base64: true -> respaldo si falla la reducción. quality 0.5 -> la foto ya sale liviana.
const opciones = { mediaTypes: ['images'], quality: 0.5, base64: true, exif: false, allowsEditing: false };

export async function tomarFoto() {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) {
    Alert.alert('Permiso necesario', 'Activa el permiso de cámara para ProAgro en los ajustes del teléfono.');
    return null;
  }
  return preparar(await ImagePicker.launchCameraAsync(opciones));
}

export async function escogerFoto() {
  return preparar(await ImagePicker.launchImageLibraryAsync(opciones));
}
