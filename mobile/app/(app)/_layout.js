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

const icono = (nombre) => ({ color, focused }) => <Ionicons name={focused ? nombre : `${nombre}-outline`} size={28} color={color} />;

export default function AppLayout() {
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colores.verde,
        tabBarInactiveTintColor: colores.texto,
        tabBarStyle: { backgroundColor: colores.blanco, height: 64, paddingTop: 6 },
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
              <Ionicons name="add-circle-outline" size={34} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="estadisticas/index" options={{ title: 'Estadísticas', tabBarIcon: icono('stats-chart') }} />
      <Tabs.Screen name="perfil/index" options={{ title: 'Perfil', tabBarIcon: icono('person') }} />
      {ocultas.map((n) => (
        <Tabs.Screen key={n} name={n} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
