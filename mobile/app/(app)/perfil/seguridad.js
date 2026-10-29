// Seguridad: huella/rostro, cambiar contraseña, sesiones abiertas y eliminar cuenta (Habeas Data)
import { useState } from 'react';
import { View, Text, Switch, Alert, Pressable } from 'react-native';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { Pantalla, Encabezado, Tarjeta, CampoClave, Campo, Boton, MensajeError } from '../../../src/components/ui';
import { useAuth } from '../../../src/auth/AuthContext';
import { authApi } from '../../../src/api/servicios';
import { useDatos } from '../../../src/utils/useDatos';
import { problemaClave } from '../../../src/utils/validacion';
import { colores, texto } from '../../../src/tema';
import { fechaCorta } from '../../../src/utils/formato';

export default function Seguridad() {
  usePreventScreenCapture();
  const { usuario, biometria, cambiarBiometria, limpiar } = useAuth();
  const sesiones = useDatos(() => authApi.sesiones());
  const [clave, setClave] = useState({ actual: '', nueva: '', confirmar: '' });
  const [errorClave, setErrorClave] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [borrar, setBorrar] = useState({ abierto: false, texto: '', contrasena: '' });
  const [errorBorrar, setErrorBorrar] = useState(null);

  async function guardarClave() {
    const p = problemaClave(clave.nueva, usuario);
    if (p) return setErrorClave(p);
    if (clave.nueva !== clave.confirmar) return setErrorClave('Las contraseñas no coinciden');
    setErrorClave(null);
    setGuardando(true);
    try {
      await authApi.cambiarContrasena({ contrasenaActual: clave.actual || undefined, contrasenaNueva: clave.nueva });
      setClave({ actual: '', nueva: '', confirmar: '' });
      await sesiones.recargar();
      Alert.alert('Listo', 'Cambiamos tu contraseña y cerramos tus otras sesiones.');
    } catch (e) {
      setErrorClave(e.message);
    } finally {
      setGuardando(false);
    }
  }

  const cerrarTodas = () =>
    Alert.alert('Cerrar todas las sesiones', 'Se cerrará ProAgro en todos tus teléfonos, incluido este.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar todas',
        style: 'destructive',
        onPress: async () => {
          await authApi.logoutTodas().catch(() => {});
          await limpiar();
        },
      },
    ]);

  async function eliminarCuenta() {
    if (borrar.texto !== 'ELIMINAR') return setErrorBorrar('Escribe ELIMINAR en mayúsculas para confirmar');
    try {
      await authApi.eliminarCuenta({ confirmacion: 'ELIMINAR', contrasena: borrar.contrasena || undefined });
      await limpiar();
      Alert.alert('Cuenta eliminada', 'Borramos tu cuenta y todos tus datos de ProAgro.');
    } catch (e) {
      setErrorBorrar(e.message);
    }
  }

  return (
    <Pantalla>
      <Encabezado titulo="SEGURIDAD" icono="shield-check-outline" />

      <Tarjeta titulo="Desbloqueo con huella o rostro" icono="fingerprint" blanca>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[texto.normal, { flex: 1 }]}>Pedir huella al abrir la app después de 2 minutos sin usarla</Text>
          <Switch value={biometria} onValueChange={cambiarBiometria} trackColor={{ true: colores.verde }} />
        </View>
      </Tarjeta>

      <Tarjeta titulo={usuario?.tieneContrasena ? 'Cambiar contraseña' : 'Crear contraseña'} icono="lock-outline" blanca>
        {usuario?.tieneContrasena ? <CampoClave etiqueta="Contraseña actual" value={clave.actual} onChangeText={(v) => setClave((c) => ({ ...c, actual: v }))} maxLength={128} /> : null}
        <CampoClave etiqueta="Nueva contraseña" value={clave.nueva} onChangeText={(v) => setClave((c) => ({ ...c, nueva: v }))} maxLength={128} ayuda="Mínimo 8 caracteres, con letras y números" />
        <CampoClave etiqueta="Confirmar nueva contraseña" value={clave.confirmar} onChangeText={(v) => setClave((c) => ({ ...c, confirmar: v }))} maxLength={128} />
        <MensajeError mensaje={errorClave} />
        <Boton titulo="Guardar contraseña" onPress={guardarClave} cargando={guardando} />
      </Tarjeta>

      <Tarjeta titulo="Teléfonos con sesión abierta" icono="cellphone-lock" blanca>
        <MensajeError mensaje={sesiones.error} onReintentar={sesiones.recargar} />
        {sesiones.datos?.map((s) => (
          <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colores.borde }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700' }}>{s.dispositivo || 'Teléfono'}{s.actual ? ' (este)' : ''}</Text>
              <Text style={texto.suave}>Último uso: {fechaCorta(s.ultimoUso)}</Text>
            </View>
            {!s.actual ? (
              <Pressable onPress={async () => { await authApi.cerrarSesion(s.id).catch(() => {}); sesiones.recargar(); }} hitSlop={8}>
                <Text style={{ color: colores.peligro, fontWeight: '700' }}>Cerrar</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        <Boton titulo="Cerrar sesión en todos los teléfonos" variante="secundario" onPress={cerrarTodas} />
      </Tarjeta>

      <Tarjeta titulo="Mis datos personales" icono="database-lock-outline" blanca>
        <Text style={texto.suave}>
          Tu documento, celular y correo se guardan cifrados. Según la Ley 1581 de 2012 puedes pedir que borremos toda tu información.
        </Text>
        {!borrar.abierto ? (
          <Boton titulo="Eliminar mi cuenta" variante="peligro" onPress={() => setBorrar((b) => ({ ...b, abierto: true }))} />
        ) : (
          <View style={{ marginTop: 10 }}>
            <Text style={[texto.normal, { color: colores.peligro, marginBottom: 6 }]}>
              Se borrarán tus cultivos, riegos, estadísticas, conversaciones y publicaciones. No se puede deshacer.
            </Text>
            {usuario?.tieneContrasena ? <CampoClave etiqueta="Tu contraseña" value={borrar.contrasena} onChangeText={(v) => setBorrar((b) => ({ ...b, contrasena: v }))} /> : null}
            <Campo etiqueta='Escribe "ELIMINAR" para confirmar' value={borrar.texto} onChangeText={(v) => setBorrar((b) => ({ ...b, texto: v }))} autoCapitalize="characters" />
            <MensajeError mensaje={errorBorrar} />
            <Boton titulo="Eliminar definitivamente" variante="peligro" onPress={eliminarCuenta} />
            <Boton titulo="Cancelar" variante="secundario" onPress={() => setBorrar({ abierto: false, texto: '', contrasena: '' })} />
          </View>
        )}
      </Tarjeta>
    </Pantalla>
  );
}
