// Barra inferior del mockup: Inicio · Mercado · (+) Agregar cultivo · Estadísticas · Perfil
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { colores } from '../../src/tema';

const ocultas = [
  'notificaciones', 'agrobot', 'mi-cultivo/index', 'mi-cultivo/lista', 'mi-cultivo/[id]',
  'riego/index', 'riego/[id]', 'estadisticas/registrar', 'mercado/[id]', 'mercado/publicar',
  'mercado/mios', 'perfil/seguridad',
];

const icono = (nombre) => ({ color }) => <Ionicons name={`${nombre}-outline`} size={30} color={color} />;

export default function AppLayout() {
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colores.verde,
        tabBarInactiveTintColor: '#1A1A1A',
        // Barra crema sin línea, solo íconos, como el mockup
        tabBarStyle: { backgroundColor: colores.barra, height: 66, paddingTop: 8, borderTopWidth: 0, elevation: 0 },
        sceneStyle: { backgroundColor: colores.crema },
      }}
    >
      <Tabs.Screen name="inicio" options={{ title: 'Inicio', tabBarIcon: icono('home') }} />
      <Tabs.Screen name="mercado/index" options={{ title: 'Mercado', tabBarIcon: icono('cart') }} />
      <Tabs.Screen
        name="agregar"
        options={{
          title: 'Agregar cultivo',
          tabBarIcon: ({ color }) => (
            <View>
              <Ionicons name="add-circle-outline" size={36} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="estadisticas/index" options={{ title: 'Estadísticas', tabBarIcon: ({ color }) => <Ionicons name="bar-chart-outline" size={28} color={color} /> }} />
      <Tabs.Screen name="perfil/index" options={{ title: 'Perfil', tabBarIcon: icono('person') }} />
      {ocultas.map((n) => (
        <Tabs.Screen key={n} name={n} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
