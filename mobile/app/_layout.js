import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { Boton, Cargando, Logo } from '../src/components/ui';
import { colores, texto } from '../src/tema';

function PantallaBloqueo() {
  const { desbloquear, salir } = useAuth();
  return (
    <View style={{ flex: 1, backgroundColor: colores.crema, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <Logo />
      <Text style={[texto.subtitulo, { marginVertical: 20, textAlign: 'center' }]}>ProAgro está bloqueado</Text>
      <Boton titulo="Desbloquear" icono="finger-print" onPress={desbloquear} estilo={{ alignSelf: 'stretch' }} />
      <Boton titulo="Cerrar sesión" variante="secundario" onPress={salir} estilo={{ alignSelf: 'stretch' }} />
    </View>
  );
}

function Navegacion() {
  const { estado, bloqueada } = useAuth();
  if (estado === 'cargando') return <Cargando texto="Preparando ProAgro..." />;
  if (estado === 'dentro' && bloqueada) return <PantallaBloqueo />;
  const dentro = estado === 'dentro';
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.crema } }}>
      <Stack.Screen name="index" />
      {/* Las rutas protegidas solo existen con sesión: no se puede entrar con un enlace directo */}
      <Stack.Protected guard={dentro}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!dentro}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Navegacion />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
