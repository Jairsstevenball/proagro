// Después de "Continuar con Google/Microsoft": pedimos los datos que el proveedor no tiene.
import { useEffect, useState } from 'react';
import { Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import * as Device from 'expo-device';
import { Pantalla, Encabezado, Campo, Boton, Selector, MensajeError } from '../../src/components/ui';
import { authApi } from '../../src/api/servicios';
import { useAuth } from '../../src/auth/AuthContext';
import { validarPersona } from '../../src/utils/validacion';
import { colores, texto } from '../../src/tema';

export default function CompletarRegistro() {
  const p = useLocalSearchParams();
  const { entrar } = useAuth();
  const [veredas, setVeredas] = useState(['Quiba Bajo', 'Mochuelo Alto', 'Pasquilla', 'Santa Rosa']);
  const [f, setF] = useState({ nombre: p.nombre || '', primerApellido: p.primerApellido || '', segundoApellido: '', ubicacion: '', celular: '', documento: '' });
  const [acepta, setAcepta] = useState(false);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const cambiar = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    authApi.veredas().then(setVeredas).catch(() => {});
  }, []);

  async function guardar() {
    const e = validarPersona(f);
    setErrores(e);
    if (Object.keys(e).length) return;
    if (!acepta) return setError('Debes aceptar los términos y condiciones');
    setCargando(true);
    setError(null);
    try {
      const r = await authApi.completarOauth({
        ticket: String(p.ticket),
        ...f,
        segundoApellido: f.segundoApellido || null,
        aceptaTerminos: true,
        dispositivo: Device.modelName || undefined,
      });
      await entrar(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <Pantalla>
      <Encabezado titulo="REGISTRO" subtitulo="Completa tus datos para terminar" />
      <Campo etiqueta="Nombre" value={f.nombre} onChangeText={cambiar('nombre')} error={errores.nombre} maxLength={60} />
      <Campo etiqueta="Primer apellido" value={f.primerApellido} onChangeText={cambiar('primerApellido')} error={errores.primerApellido} maxLength={60} />
      <Campo etiqueta="Segundo apellido (opcional)" value={f.segundoApellido} onChangeText={cambiar('segundoApellido')} maxLength={60} />
      <Campo etiqueta="Número de documento" value={f.documento} onChangeText={cambiar('documento')} error={errores.documento} keyboardType="number-pad" maxLength={15} />
      <Selector etiqueta="Ubicación" valor={f.ubicacion} opciones={veredas} onCambio={cambiar('ubicacion')} placeholder="Selecciona tu vereda" error={errores.ubicacion} />
      <Campo etiqueta="Celular" value={f.celular} onChangeText={cambiar('celular')} error={errores.celular} keyboardType="phone-pad" maxLength={13} />
      <Pressable onPress={() => setAcepta(!acepta)} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
        <Ionicons name={acepta ? 'checkbox' : 'square-outline'} size={26} color={colores.verde} />
        <Text style={[texto.normal, { marginLeft: 8, flex: 1 }]}>Acepto los términos y el tratamiento de mis datos (Ley 1581 de 2012).</Text>
      </Pressable>
      <MensajeError mensaje={error} />
      <Boton titulo="Guardar" onPress={guardar} cargando={cargando} />
    </Pantalla>
  );
}
