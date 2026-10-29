// Perfil del agricultor
import { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pantalla, Encabezado, Tarjeta, Boton, Selector, MensajeError } from '../../../src/components/ui';
import { useAuth } from '../../../src/auth/AuthContext';
import { authApi } from '../../../src/api/servicios';
import { colores, texto } from '../../../src/tema';

const VEREDAS = ['Quiba Bajo', 'Mochuelo Alto', 'Pasquilla', 'Santa Rosa'];
// Se muestra parcialmente: si alguien mira la pantalla no ve el dato completo.
const ocultar = (v) => (v ? `${String(v).slice(0, 3)}****${String(v).slice(-3)}` : '—');

export default function Perfil() {
  const router = useRouter();
  const { usuario, setUsuario, salir } = useAuth();
  const [error, setError] = useState(null);

  async function cambiarVereda(ubicacion) {
    try {
      setUsuario(await authApi.actualizarPerfil({ ubicacion }));
    } catch (e) {
      setError(e.message);
    }
  }

  const confirmarSalir = () =>
    Alert.alert('Cerrar sesión', '¿Quieres salir de ProAgro en este teléfono?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: salir },
    ]);

  return (
    <Pantalla>
      <Encabezado titulo="MI PERFIL" icono="account-circle-outline" atras={false} />
      <Tarjeta titulo="Mis datos" icono="card-account-details-outline" blanca>
        <Text style={texto.subtitulo}>{usuario?.nombre} {usuario?.primerApellido} {usuario?.segundoApellido || ''}</Text>
        <Text style={texto.normal}>Documento: {ocultar(usuario?.documento)}</Text>
        <Text style={texto.normal}>Celular: {ocultar(usuario?.celular)}</Text>
        {usuario?.correoElectronico ? <Text style={texto.normal}>Correo: {usuario.correoElectronico}</Text> : null}
        {usuario?.rol === 'ADMIN' ? <Text style={{ color: colores.verde, fontWeight: '700', marginTop: 4 }}>Administrador</Text> : null}
      </Tarjeta>
      <Tarjeta titulo="Mi vereda (para el clima y las alertas)" icono="map-marker-outline">
        <Selector valor={usuario?.ubicacion} opciones={VEREDAS} onCambio={cambiarVereda} />
      </Tarjeta>
      <MensajeError mensaje={error} />
      <Pressable onPress={() => router.push('/perfil/seguridad')} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <Ionicons name="shield-checkmark-outline" size={26} color={colores.verde} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontWeight: '800', fontSize: 16 }}>Seguridad y privacidad</Text>
          <Text style={texto.suave}>Huella, contraseña, sesiones y mis datos</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colores.texto} />
      </Pressable>
      <Boton titulo="Cerrar sesión" variante="secundario" icono="log-out-outline" onPress={confirmarSalir} />
    </Pantalla>
  );
}
