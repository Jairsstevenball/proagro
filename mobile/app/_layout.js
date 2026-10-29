import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { Boton, Cargando, Logo, Fondo } from '../src/components/ui';
import { colores, texto, FUENTE_TITULO } from '../src/tema';

function PantallaBloqueo() {
  const { desbloquear, salir } = useAuth();
  return (
    <Fondo marca={false} estilo={{ alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <Logo />
      <Text style={[texto.subtitulo, { marginVertical: 20, textAlign: 'center' }]}>ProAgro está bloqueado</Text>
      <Boton titulo="Desbloquear" icono="finger-print" onPress={desbloquear} />
      <Boton titulo="Cerrar sesión" variante="secundario" onPress={salir} />
    </Fondo>
  );
}

function Navegacion() {
  const { estado, bloqueada } = useAuth();
  if (estado === 'cargando') return <Cargando logo texto="Preparando ProAgro..." />;
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
  // Fuente gruesa de los títulos (assets/fonts/Titulo.otf). Si falla, se usa la del sistema.
  const [fuentesListas, errorFuentes] = useFonts({ [FUENTE_TITULO]: require('../assets/fonts/Titulo.otf') });
  if (!fuentesListas && !errorFuentes) return <View style={{ flex: 1, backgroundColor: colores.crema }} />;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Navegacion />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
