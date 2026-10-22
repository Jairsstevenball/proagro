// CU-11 Registrar nuevo cultivo / CU-12 Guardar cultivo (botón + de la barra inferior)
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Pantalla, Encabezado } from '../../src/components/ui';
import FormularioCultivo from '../../src/components/FormularioCultivo';
import { cultivosApi } from '../../src/api/servicios';

export default function Agregar() {
  const router = useRouter();
  return (
    <Pantalla>
      <Encabezado titulo="MI CULTIVO" icono="sprout" subtitulo="Registra la información de tus cultivos" />
      <FormularioCultivo
        nuevo
        onGuardar={async (campos, foto) => {
          const c = await cultivosApi.crear(campos, foto);
          Alert.alert('¡Listo!', `Tu cultivo de ${c.tipoCultivo} quedó guardado.`);
          router.replace({ pathname: '/mi-cultivo/lista', params: { estado: 'ACTIVO' } });
        }}
      />
    </Pantalla>
  );
}
