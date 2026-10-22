// Pantalla de carga + inicio del mockup: Google, Microsoft, Registrarme, Iniciar sesión
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Pantalla, Logo } from '../../src/components/ui';
import { BotonGoogle, BotonMicrosoft, googleConfigurado, microsoftConfigurado } from '../../src/auth/oauth';
import { colores, espacio, texto } from '../../src/tema';

export default function Bienvenida() {
  const router = useRouter();
  return (
    <Pantalla estilo={{ flexGrow: 1, justifyContent: 'center' }}>
      <Logo subtitulo="Tecnología y campo, unidos para un mejor futuro" />
      <View style={{ marginTop: 40 }}>
        {googleConfigurado ? <BotonGoogle /> : null}
        {microsoftConfigurado ? <BotonMicrosoft /> : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: espacio.xl }}>
          <Pressable onPress={() => router.push('/registro')} hitSlop={10}>
            <Text style={{ color: colores.verde, fontSize: 18, fontWeight: '700' }}>Registrarme</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/ingresar')} hitSlop={10}>
            <Text style={{ color: colores.verde, fontSize: 18, fontWeight: '700' }}>Iniciar sesión</Text>
          </Pressable>
        </View>
      </View>
      <Text style={[texto.suave, { textAlign: 'center', marginTop: 40, fontSize: 12 }]}>
        Tus datos personales se guardan cifrados y nunca se venden ni se comparten.
      </Text>
    </Pantalla>
  );
}
