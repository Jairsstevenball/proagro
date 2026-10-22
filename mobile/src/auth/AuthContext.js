// Estado de la sesión de toda la app + bloqueo con huella/rostro.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { fijarAccessToken, alPerderSesionHacer, renovarSesion } from '../api/cliente';
import { authApi } from '../api/servicios';
import { guardarRefresh, leerRefresh, borrarTodo, leerBiometria, guardarBiometria } from './almacen';
import { registrarPush } from '../utils/push';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

// Si la app estuvo en segundo plano más de esto, se pide huella otra vez.
const BLOQUEO_MS = 2 * 60 * 1000;

export function AuthProvider({ children }) {
  const [estado, setEstado] = useState('cargando'); // cargando | fuera | dentro
  const [usuario, setUsuario] = useState(null);
  const [bloqueada, setBloqueada] = useState(false);
  const [biometria, setBiometria] = useState(false);
  const enFondoDesde = useRef(null);

  const limpiar = useCallback(async () => {
    fijarAccessToken(null);
    await borrarTodo();
    setUsuario(null);
    setBloqueada(false);
    setBiometria(false);
    setEstado('fuera');
  }, []);

  // Si el servidor cierra la sesión (robo detectado, cuenta suspendida...), salimos.
  useEffect(() => {
    alPerderSesionHacer((mensaje) => {
      limpiar();
      if (mensaje) Alert.alert('Sesión cerrada', mensaje);
    });
  }, [limpiar]);

  // Arranque: ¿hay una sesión guardada?
  useEffect(() => {
    (async () => {
      try {
        if (!(await leerRefresh())) return setEstado('fuera');
        await renovarSesion();
        const yo = await authApi.yo();
        const bio = await leerBiometria();
        setUsuario(yo);
        setBiometria(bio);
        setBloqueada(bio);
        setEstado('dentro');
      } catch (e) {
        // Sin internet: no borramos la sesión, solo mostramos el ingreso.
        if (e.status === 401) await borrarTodo();
        setEstado('fuera');
      }
    })();
  }, []);

  // Bloqueo al volver de segundo plano
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') enFondoDesde.current = Date.now();
      if (s === 'active' && enFondoDesde.current) {
        if (biometria && Date.now() - enFondoDesde.current > BLOQUEO_MS) setBloqueada(true);
        enFondoDesde.current = null;
      }
    });
    return () => sub.remove();
  }, [biometria]);

  /** Se llama con la respuesta de /auth/login, /auth/registro o /auth/oauth. */
  const entrar = useCallback(async (respuesta) => {
    fijarAccessToken(respuesta.accessToken, respuesta.expiraEn);
    await guardarRefresh(respuesta.refreshToken);
    setUsuario(respuesta.usuario);
    setEstado('dentro');
    registrarPush().catch(() => {});
  }, []);

  const salir = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // aunque falle la red, borramos todo localmente
    }
    await limpiar();
  }, [limpiar]);

  const desbloquear = useCallback(async () => {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquea ProAgro',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false, // permite el PIN del teléfono si falla la huella
    });
    if (r.success) setBloqueada(false);
    return r.success;
  }, []);

  const cambiarBiometria = useCallback(async (activar) => {
    if (activar) {
      const hay = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
      if (!hay) {
        Alert.alert('No disponible', 'Tu teléfono no tiene huella o rostro configurado.');
        return false;
      }
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirma tu identidad' });
      if (!r.success) return false;
    }
    await guardarBiometria(activar);
    setBiometria(activar);
    return true;
  }, []);

  return (
    <Ctx.Provider value={{ estado, usuario, setUsuario, entrar, salir, limpiar, bloqueada, desbloquear, biometria, cambiarBiometria }}>
      {children}
    </Ctx.Provider>
  );
}
