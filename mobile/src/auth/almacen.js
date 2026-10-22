// Almacenamiento SEGURO del teléfono (Keychain en iPhone, Keystore cifrado en Android).
// Solo el refresh token se guarda aquí; el access token vive únicamente en memoria.
// NUNCA usar AsyncStorage para tokens: es texto plano.
import * as SecureStore from 'expo-secure-store';

const OPCIONES = {
  // Solo legible con el teléfono desbloqueado y no se copia a otro dispositivo en respaldos.
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const CLAVES = { refresh: 'proagro.refresh', biometria: 'proagro.biometria' };

export const guardarRefresh = (t) => SecureStore.setItemAsync(CLAVES.refresh, t, OPCIONES);
export const leerRefresh = () => SecureStore.getItemAsync(CLAVES.refresh, OPCIONES);
export const borrarRefresh = () => SecureStore.deleteItemAsync(CLAVES.refresh, OPCIONES);

export const guardarBiometria = (activa) => SecureStore.setItemAsync(CLAVES.biometria, activa ? '1' : '0', OPCIONES);
export const leerBiometria = async () => (await SecureStore.getItemAsync(CLAVES.biometria, OPCIONES)) === '1';

export async function borrarTodo() {
  await Promise.all(Object.values(CLAVES).map((k) => SecureStore.deleteItemAsync(k, OPCIONES).catch(() => {})));
}
