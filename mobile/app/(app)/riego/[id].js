// Recomendación de riego (FAO-56 + pronóstico) y formulario del mockup:
// ¿Cuánta agua usa al día? · ¿Qué método? · ¿Cuántas veces al día? · Nota adicional
import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pantalla, Encabezado, Tarjeta, Campo, Selector, Boton, Cargando, MensajeError } from '../../../src/components/ui';
import { riegoApi } from '../../../src/api/servicios';
import { useDatos } from '../../../src/utils/useDatos';
import { colores, texto } from '../../../src/tema';
import { diaSemana, numero } from '../../../src/utils/formato';

const METODOS = [
  { valor: 'GOTEO', nombre: 'Riego por goteo' },
  { valor: 'ASPERSION', nombre: 'Riego por aspersor' },
  { valor: 'CANALES', nombre: 'Riego por canales' },
];

export default function RiegoCultivo() {
  const { id } = useLocalSearchParams();
  const rec = useDatos(() => riegoApi.recomendacion(id), [id]);
  const [f, setF] = useState({ cantidadAgua: '', metodoRiego: '', frecuenciaRiego: '', observaciones: '' });
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const cambiar = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const r = rec.datos;

  async function guardar() {
    const cantidad = Number(f.cantidadAgua.replace(',', '.'));
    const veces = parseInt(f.frecuenciaRiego, 10);
    if (!Number.isFinite(cantidad) || cantidad < 0) return setError('Escribe cuántos litros usas al día');
    if (!f.metodoRiego) return setError('Selecciona el método de riego');
    if (!Number.isInteger(veces) || veces < 1 || veces > 24) return setError('Escribe cuántas veces al día riegas (1 a 24)');
    setError(null);
    setGuardando(true);
    try {
      await riegoApi.registrar(id, { cantidadAgua: cantidad, metodoRiego: f.metodoRiego, frecuenciaRiego: veces, observaciones: f.observaciones.trim() || null });
      setF({ cantidadAgua: '', metodoRiego: '', frecuenciaRiego: '', observaciones: '' });
      await rec.recargar();
      Alert.alert('Guardado', 'Registramos cómo riegas. Revisa la comparación con lo recomendado.');
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  if (rec.cargando) return <Cargando texto="Calculando el riego de hoy..." />;
  return (
    <Pantalla>
      <Encabezado titulo="RIEGO" icono="water" subtitulo={r?.cultivo?.tipoCultivo} />
      <MensajeError mensaje={rec.error} onReintentar={rec.recargar} />

      {r && !r.error ? (
        <Tarjeta titulo="Recomendación de hoy" icono="water-check-outline" blanca>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <MaterialCommunityIcons name="water" size={40} color={colores.info} />
            <View style={{ marginLeft: 8 }}>
              <Text style={{ fontSize: 28, fontWeight: '900', color: colores.texto }}>
                {r.hoy.litros !== null ? `${numero(r.hoy.litros)} L` : `${r.hoy.brutaMm} L/m²`}
              </Text>
              <Text style={texto.suave}>Etapa: {r.etapa} · día {r.diasDesdeSiembra}</Text>
            </View>
          </View>
          {r.mensajes.map((m, i) => (
            <Text key={i} style={[texto.normal, { marginBottom: 4 }]}>• {m}</Text>
          ))}
          <Text style={[texto.normal, { marginTop: 4 }]}>🕔 {r.cuando}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            {r.plan.map((d) => (
              <View key={d.fecha} style={{ alignItems: 'center', flex: 1 }}>
                <Text style={texto.suave}>{diaSemana(d.fecha)}</Text>
                <Text style={{ fontWeight: '800' }}>{d.litros !== null ? `${numero(d.litros)} L` : `${d.brutaMm} L/m²`}</Text>
                <Text style={[texto.suave, { fontSize: 12 }]}>🌧 {numero(d.lluviaMm, 1)} mm</Text>
              </View>
            ))}
          </View>
        </Tarjeta>
      ) : null}

      <Tarjeta titulo="¿Cuánta agua usa al día en su cultivo? (litros)">
        <Campo value={f.cantidadAgua} onChangeText={cambiar('cantidadAgua')} keyboardType="decimal-pad" placeholder="Ej: 400" maxLength={8} />
      </Tarjeta>
      <Tarjeta titulo="¿Qué método de riego utiliza?">
        <Selector valor={f.metodoRiego} opciones={METODOS} onCambio={cambiar('metodoRiego')} />
      </Tarjeta>
      <Tarjeta titulo="¿Cuántas veces al día riega el cultivo?">
        <Campo value={f.frecuenciaRiego} onChangeText={cambiar('frecuenciaRiego')} keyboardType="number-pad" placeholder="Ej: 2" maxLength={2} />
      </Tarjeta>
      <Tarjeta titulo="Nota adicional">
        <Campo value={f.observaciones} onChangeText={cambiar('observaciones')} placeholder="¿Notaste algo raro hoy? Escribe aquí cualquier observación" multiline maxLength={500} />
      </Tarjeta>
      <MensajeError mensaje={error} />
      <Boton titulo="Guardar" onPress={guardar} cargando={guardando} />
    </Pantalla>
  );
}
