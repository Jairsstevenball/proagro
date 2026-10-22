// Estadistica_formulario: ¿Cuánta cosecha recogió? ¿Cuánto gastó? ¿Cómo ve la salud de sus plantas?
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pantalla, Encabezado, Tarjeta, Campo, Selector, Boton, MensajeError } from '../../../src/components/ui';
import { estadisticasApi } from '../../../src/api/servicios';
import { MESES } from '../../../src/utils/formato';

const SALUD = [
  { valor: 'EXCELENTE', nombre: 'Excelente' },
  { valor: 'BUENA', nombre: 'Buena' },
  { valor: 'REGULAR', nombre: 'Regular' },
  { valor: 'MALA', nombre: 'Mala' },
];

// Kilos: acepta 850,5 o 850.5 · Pesos: ignora puntos de miles (1.500.000)
const aKilos = (s) => (s === '' ? null : Number(String(s).trim().replace(',', '.')));
const aPesos = (s) => (s === '' ? null : Number(String(s).replace(/[^\d]/g, '') || NaN));

export default function Registrar() {
  const { idCultivo, anio, mes } = useLocalSearchParams();
  const router = useRouter();
  const [f, setF] = useState({ cantidadCosecha: '', valorVenta: '', costoProduccion: '', saludCultivo: '' });
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const cambiar = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  async function guardar() {
    const cosecha = aKilos(f.cantidadCosecha);
    if (cosecha === null || !Number.isFinite(cosecha) || cosecha < 0) return setError('Escribe cuántos kilos recogiste (0 si nada)');
    if (!f.saludCultivo) return setError('Selecciona cómo ves la salud de tus plantas');
    const venta = aPesos(f.valorVenta);
    const costo = aPesos(f.costoProduccion);
    if ((venta !== null && !Number.isFinite(venta)) || (costo !== null && !Number.isFinite(costo))) return setError('Revisa los valores en pesos');
    setError(null);
    setCargando(true);
    try {
      await estadisticasApi.guardar(idCultivo, {
        anio: Number(anio), mes: Number(mes), cantidadCosecha: cosecha, valorVenta: venta, costoProduccion: costo, saludCultivo: f.saludCultivo,
      });
      router.back();
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <Pantalla>
      <Encabezado titulo="ESTADÍSTICAS" subtitulo={`Registro de ${MESES[Number(mes) - 1]} ${anio}`} />
      <Tarjeta titulo="¿Cuánta cosecha recogió este mes? (Kg)">
        <Campo value={f.cantidadCosecha} onChangeText={cambiar('cantidadCosecha')} keyboardType="decimal-pad" placeholder="Ej: 850" maxLength={10} />
      </Tarjeta>
      <Tarjeta titulo="¿Por cuánto vendió la cosecha? (pesos)">
        <Campo value={f.valorVenta} onChangeText={cambiar('valorVenta')} keyboardType="number-pad" placeholder="Ej: 1500000" maxLength={12} />
      </Tarjeta>
      <Tarjeta titulo="¿Cuánto dinero gastó para lograr esta cosecha? (pesos)">
        <Campo value={f.costoProduccion} onChangeText={cambiar('costoProduccion')} keyboardType="number-pad" placeholder="Ej: 600000" maxLength={12} />
      </Tarjeta>
      <Tarjeta titulo="¿En qué estado observa la salud de sus plantas?">
        <Selector valor={f.saludCultivo} opciones={SALUD} onCambio={cambiar('saludCultivo')} />
      </Tarjeta>
      <MensajeError mensaje={error} />
      <Boton titulo="Guardar" onPress={guardar} cargando={cargando} />
    </Pantalla>
  );
}
