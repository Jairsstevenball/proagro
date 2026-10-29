// Ingreso del mockup: PROAGRO · Celular · Contraseña · continuar
import { useState } from 'react';
import * as Device from 'expo-device';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { View } from 'react-native';
import { Pantalla, Titulo, Volver, Campo, CampoClave, Boton, MensajeError } from '../../src/components/ui';
import { authApi } from '../../src/api/servicios';
import { useAuth } from '../../src/auth/AuthContext';

export default function Ingresar() {
  usePreventScreenCapture(); // nadie puede tomar captura de la contraseña
  const { entrar } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function ingresar() {
    if (!usuario.trim() || !contrasena) return setError('Escribe tu celular y tu contraseña');
    setError(null);
    setCargando(true);
    try {
      const r = await authApi.login({ usuario: usuario.trim(), contrasena, dispositivo: Device.modelName || undefined });
      setContrasena('');
      await entrar(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <Pantalla>
      <Volver />
      <Titulo tamano={44} estilo={{ marginTop: 4, marginBottom: 30 }}>PROAGRO</Titulo>
      <View style={{ paddingHorizontal: 12 }}>
        <Campo
          etiqueta="Celular"
          value={usuario}
          onChangeText={setUsuario}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={60}
          estilo={{ marginBottom: 22 }}
        />
        <CampoClave etiqueta="Contraseña" value={contrasena} onChangeText={setContrasena} maxLength={128} onSubmitEditing={ingresar} />
        <MensajeError mensaje={error} />
        <Boton titulo="continuar" onPress={ingresar} cargando={cargando} estilo={{ marginTop: 18 }} />
      </View>
    </Pantalla>
  );
}
