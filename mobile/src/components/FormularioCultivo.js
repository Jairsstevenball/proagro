// Formulario de cultivo (pantallas Agregar_cultivos y Cultivos_papa_actualizar del mockup).
import { useEffect, useState } from 'react';
import { cultivosApi } from '../api/servicios';
import { Tarjeta, Selector, Campo, FotoCampo, Boton, MensajeError } from './ui';

const TIPOS_RESPALDO = { cultivos: ['Papa', 'Arveja', 'Lechuga', 'Maíz', 'Fresa', 'Mora', 'Otro'], abonos: ['Compost', 'Gallinaza', 'Bocashi', 'Humus de lombriz', 'Químico (NPK)', 'Ninguno', 'Otro'] };

export default function FormularioCultivo({ inicial, nuevo, onGuardar, textoBoton = 'Guardar' }) {
  const [tipos, setTipos] = useState(TIPOS_RESPALDO);
  const [f, setF] = useState({
    tipoCultivo: inicial?.tipoCultivo || '',
    tipoAbono: inicial?.tipoAbono || '',
    herramientas: inicial?.herramientas || '',
    areaM2: inicial?.areaM2 ? String(inicial.areaM2) : '',
    diasSembrado: '',
  });
  const [foto, setFoto] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const cambiar = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    cultivosApi.tipos().then(setTipos).catch(() => {});
  }, []);

  async function guardar() {
    if (!f.tipoCultivo) return setError('Selecciona el tipo de cultivo');
    const area = f.areaM2 ? Number(f.areaM2.replace(',', '.')) : null;
    if (f.areaM2 && (!Number.isFinite(area) || area <= 0)) return setError('El área debe ser un número mayor a 0');
    const dias = f.diasSembrado ? parseInt(f.diasSembrado, 10) : null;
    if (f.diasSembrado && (!Number.isInteger(dias) || dias < 0 || dias > 3650)) return setError('Escribe cuántos días hace que sembraste');
    setError(null);
    setCargando(true);
    try {
      const campos = { tipoCultivo: f.tipoCultivo, tipoAbono: f.tipoAbono, herramientas: f.herramientas.trim(), areaM2: area ?? '' };
      if (nuevo && dias !== null) campos.fechaInicio = new Date(Date.now() - dias * 864e5).toISOString();
      await onGuardar(campos, foto);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <Tarjeta titulo="Información básica" icono="information-outline">
        <Selector etiqueta="Tipo de cultivo" valor={f.tipoCultivo} opciones={tipos.cultivos} onCambio={cambiar('tipoCultivo')} placeholder="Selecciona el tipo de cultivo" />
        <Campo etiqueta="¿Cuántos metros cuadrados tiene el lote?" value={f.areaM2} onChangeText={cambiar('areaM2')} keyboardType="decimal-pad" placeholder="Ej: 500" maxLength={10} ayuda="Sirve para calcular cuántos litros regar" />
        {nuevo ? <Campo etiqueta="¿Hace cuántos días sembraste? (opcional)" value={f.diasSembrado} onChangeText={cambiar('diasSembrado')} keyboardType="number-pad" placeholder="Ej: 30" maxLength={4} /> : null}
      </Tarjeta>
      <FotoCampo titulo="Fotografía del cultivo" foto={foto} urlActual={inicial?.fotoUrl} onCambio={setFoto} />
      <Tarjeta titulo="Tipo de abono" icono="leaf">
        <Selector valor={f.tipoAbono} opciones={tipos.abonos} onCambio={cambiar('tipoAbono')} placeholder="Selecciona el tipo de abono" />
      </Tarjeta>
      <Tarjeta titulo="¿Con qué herramientas cuenta usted para trabajar con este cultivo?" icono="hammer-wrench">
        <Campo value={f.herramientas} onChangeText={cambiar('herramientas')} placeholder="Escribe aquí tus herramientas" multiline maxLength={500} />
      </Tarjeta>
      <MensajeError mensaje={error} />
      <Boton titulo={textoBoton} onPress={guardar} cargando={cargando} />
    </>
  );
}
