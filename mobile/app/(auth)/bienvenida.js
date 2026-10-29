// Inicio del mockup: PROAGRO · continuar con Google · continuar con Microsoft · Registrarme · Iniciar Sesión
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Pantalla, Titulo } from '../../src/components/ui';
import { BotonGoogle, BotonMicrosoft, googleConfigurado, microsoftConfigurado } from '../../src/auth/oauth';
import { colores, espacio, texto } from '../../src/tema';

export default function Bienvenida() {
  const router = useRouter();
  return (
    <Pantalla estilo={{ flexGrow: 1, paddingTop: 40 }}>
      <Titulo tamano={46}>PROAGRO</Titulo>
      <Text style={[texto.suave, { textAlign: 'center', marginTop: 4 }]}>Tecnología y campo, unidos para un mejor futuro</Text>
      <View style={{ marginTop: 34, paddingHorizontal: espacio.m }}>
        {googleConfigurado ? <BotonGoogle /> : null}
        {microsoftConfigurado ? <BotonMicrosoft /> : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginTop: espacio.l }}>
          <Pressable onPress={() => router.push('/registro')} hitSlop={12} accessibilityRole="button">
            <Text style={{ color: colores.verde, fontSize: 18, fontWeight: '600' }}>Registrarme</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/ingresar')} hitSlop={12} accessibilityRole="button">
            <Text style={{ color: colores.verde, fontSize: 18, fontWeight: '600' }}>Iniciar Sesión</Text>
          </Pressable>
        </View>
      </View>
      <View style={{ flex: 1 }} />
      <Text style={[texto.suave, { textAlign: 'center', fontSize: 12, marginTop: 40 }]}>
        Tus datos personales se guardan cifrados y nunca se venden ni se comparten.
      </Text>
    </Pantalla>
  );
}
