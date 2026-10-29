// Botones "Continuar con Google" y "Continuar con Microsoft".
// La app solo obtiene el ID token; quien lo verifica es el servidor (firma, emisor, audiencia, nonce).
// Requieren un development build (no funcionan en Expo Go). Ver README.
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, ActivityIndicator, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { authApi } from '../api/servicios';
import { useAuth } from './AuthContext';
import { colores } from '../tema';

WebBrowser.maybeCompleteAuthSession();

const G = {
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
};
const MS_CLIENT = process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID || '';

// Cada plataforma necesita su propio client id; si falta, el botón no se muestra (evita un error).
export const googleConfigurado = Boolean(Platform.select({ android: G.androidClientId, ios: G.iosClientId, default: G.webClientId }));
export const microsoftConfigurado = Boolean(MS_CLIENT);

function useFinalizar() {
  const { entrar } = useAuth();
  const router = useRouter();
  return async (proveedor, idToken, nonce) => {
    const r = await authApi.oauth({ proveedor, idToken, nonce, dispositivo: Device.modelName || undefined });
    if (r.requiereRegistro) {
      router.push({ pathname: '/completar-registro', params: { ticket: r.ticket, ...r.sugerido } });
    } else {
      await entrar(r);
    }
  };
}

function BotonSocial({ texto, icono, onPress, cargando, deshabilitado }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado || cargando}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colores.blanco,
        borderRadius: 24, paddingVertical: 12, borderWidth: 3, borderColor: '#A9D88A', marginVertical: 8,
        shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
        opacity: pressed || deshabilitado ? 0.6 : 1,
      })}
    >
      {cargando ? <ActivityIndicator color={colores.verde} /> : icono}
      <Text style={{ marginLeft: 10, fontSize: 16, color: colores.texto }}>{texto}</Text>
    </Pressable>
  );
}

export function BotonGoogle() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(G);
  const [cargando, setCargando] = useState(false);
  const finalizar = useFinalizar();

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.params?.id_token;
    if (!idToken) return;
    setCargando(true);
    finalizar('google', idToken, request?.nonce)
      .catch((e) => Alert.alert('No se pudo ingresar', e.message))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return (
    <BotonSocial
      texto="Continuar con Google"
      icono={<Ionicons name="logo-google" size={22} color="#DB4437" />}
      onPress={() => promptAsync()}
      cargando={cargando}
      deshabilitado={!request}
    />
  );
}

export function BotonMicrosoft() {
  const discovery = AuthSession.useAutoDiscovery('https://login.microsoftonline.com/common/v2.0');
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'proagro', path: 'auth' });
  const nonce = useMemo(() => Crypto.randomUUID(), []);
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    { clientId: MS_CLIENT, scopes: ['openid', 'profile', 'email'], redirectUri, usePKCE: true, extraParams: { nonce } },
    discovery,
  );
  const [cargando, setCargando] = useState(false);
  const finalizar = useFinalizar();

  useEffect(() => {
    if (response?.type !== 'success' || !discovery) return;
    setCargando(true);
    AuthSession.exchangeCodeAsync(
      { clientId: MS_CLIENT, code: response.params.code, redirectUri, extraParams: { code_verifier: request.codeVerifier } },
      discovery,
    )
      .then((t) => {
        if (!t.idToken) throw new Error('Microsoft no devolvió la identidad');
        return finalizar('microsoft', t.idToken, nonce);
      })
      .catch((e) => Alert.alert('No se pudo ingresar', e.message))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return (
    <BotonSocial
      texto="Continuar con Microsoft"
      icono={<MaterialCommunityIcons name="microsoft" size={22} color="#00A4EF" />}
      onPress={() => promptAsync()}
      cargando={cargando}
      deshabilitado={!request}
    />
  );
}
