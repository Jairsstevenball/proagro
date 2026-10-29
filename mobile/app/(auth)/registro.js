// Registro en dos pasos como el mockup:
//  1) Nombre, apellidos, ubicación (vereda), celular, correo, documento
//  2) Contraseña, confirmar, aceptar términos
import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { Pantalla, Encabezado, Campo, CampoClave, Boton, Selector, MensajeError } from '../../src/components/ui';
import { authApi } from '../../src/api/servicios';
import { useAuth } from '../../src/auth/AuthContext';
import { validarPersona, problemaClave } from '../../src/utils/validacion';
import { colores, texto } from '../../src/tema';

export default function Registro() {
  usePreventScreenCapture();
  const { entrar } = useAuth();
  const [paso, setPaso] = useState(1);
  const [veredas, setVeredas] = useState(['Quiba Bajo', 'Mochuelo Alto', 'Pasquilla', 'Santa Rosa']);
  const [f, setF] = useState({ nombre: '', primerApellido: '', segundoApellido: '', ubicacion: '', celular: '', correoElectronico: '', documento: '' });
  const [clave, setClave] = useState({ contrasena: '', confirmar: '', acepta: false });
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    authApi.veredas().then(setVeredas).catch(() => {});
  }, []);

  const cambiar = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  function continuar() {
    const e = validarPersona(f);
    setErrores(e);
    if (!Object.keys(e).length) setPaso(2);
  }

  async function guardar() {
    const p = problemaClave(clave.contrasena, f);
    if (p) return setError(p);
    if (clave.contrasena !== clave.confirmar) return setError('Las contraseñas no coinciden');
    if (!clave.acepta) return setError('Debes aceptar los términos y condiciones');
    setError(null);
    setCargando(true);
    try {
      const r = await authApi.registro({
        ...f,
        segundoApellido: f.segundoApellido || null,
        correoElectronico: f.correoElectronico || null,
        contrasena: clave.contrasena,
        aceptaTerminos: true,
        dispositivo: Device.modelName || undefined,
      });
      await entrar(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  if (paso === 1) {
    return (
      <Pantalla>
        <Encabezado titulo="REGISTRO" />
        <Campo etiqueta="Nombre" value={f.nombre} onChangeText={cambiar('nombre')} error={errores.nombre} maxLength={60} autoComplete="given-name" />
        <Campo etiqueta="Primer apellido" value={f.primerApellido} onChangeText={cambiar('primerApellido')} error={errores.primerApellido} maxLength={60} />
        <Campo etiqueta="Segundo apellido (opcional)" value={f.segundoApellido} onChangeText={cambiar('segundoApellido')} maxLength={60} />
        <Campo etiqueta="Número de documento" value={f.documento} onChangeText={cambiar('documento')} error={errores.documento} keyboardType="number-pad" maxLength={15} />
        <Selector etiqueta="Ubicación" valor={f.ubicacion} opciones={veredas} onCambio={cambiar('ubicacion')} placeholder="Selecciona tu vereda" error={errores.ubicacion} />
        <Campo etiqueta="Celular" value={f.celular} onChangeText={cambiar('celular')} error={errores.celular} keyboardType="phone-pad" maxLength={13} autoComplete="tel" />
        <Campo etiqueta="Correo electrónico (opcional)" value={f.correoElectronico} onChangeText={cambiar('correoElectronico')} error={errores.correoElectronico} keyboardType="email-address" autoCapitalize="none" maxLength={120} />
        <Boton titulo="continuar" onPress={continuar} estilo={{ marginTop: 14 }} />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Encabezado titulo="REGISTRO" />
      <Pressable onPress={() => setPaso(1)} style={{ marginBottom: 10 }}>
        <Text style={{ color: colores.verde }}>‹ Volver a mis datos</Text>
      </Pressable>
      <CampoClave etiqueta="Contraseña" value={clave.contrasena} onChangeText={(v) => setClave((c) => ({ ...c, contrasena: v }))} maxLength={128} ayuda="Mínimo 8 caracteres, con letras y números" textContentType="newPassword" />
      <CampoClave etiqueta="Confirmar contraseña" value={clave.confirmar} onChangeText={(v) => setClave((c) => ({ ...c, confirmar: v }))} maxLength={128} textContentType="newPassword" />
      <Pressable onPress={() => setClave((c) => ({ ...c, acepta: !c.acepta }))} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }} accessibilityRole="checkbox" accessibilityState={{ checked: clave.acepta }}>
        <Ionicons name={clave.acepta ? 'checkbox' : 'square-outline'} size={24} color={colores.verde} />
        <Text style={[texto.normal, { marginLeft: 8, flex: 1, fontSize: 14 }]}>
          Acepto los términos y condiciones y autorizo el tratamiento de mis datos personales (Ley 1581 de 2012).
        </Text>
      </Pressable>
      <MensajeError mensaje={error} />
      <View style={{ marginTop: 10 }}>
        <Boton titulo="Guardar" onPress={guardar} cargando={cargando} />
      </View>
    </Pantalla>
  );
}
