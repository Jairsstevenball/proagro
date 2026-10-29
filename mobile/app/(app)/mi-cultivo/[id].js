// Detalle del cultivo (Cultivos_papa del mockup): tarjetas con los datos · Inactivar (con confirmación) · Actualizar · Activar
import { useState } from 'react';
import { View, Text, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pantalla, Encabezado, Tarjeta, Boton, Confirmar, Cargando, MensajeError } from '../../../src/components/ui';
import FormularioCultivo from '../../../src/components/FormularioCultivo';
import { cultivosApi } from '../../../src/api/servicios';
import { useDatos } from '../../../src/utils/useDatos';
import { colores, texto } from '../../../src/tema';
import { fechaCorta } from '../../../src/utils/formato';

function Valor({ children }) {
  return (
    <View style={{ backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 3, paddingHorizontal: 10, paddingVertical: 8 }}>
      <Text style={{ fontSize: 15, color: colores.texto }}>{children}</Text>
    </View>
  );
}

export default function DetalleCultivo() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { datos: c, setDatos, cargando, error, recargar } = useDatos(() => cultivosApi.uno(id), [id]);
  const [editando, setEditando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [errorAccion, setErrorAccion] = useState(null);

  async function cambiarEstado(estado) {
    setTrabajando(true);
    setErrorAccion(null);
    try {
      setDatos(await cultivosApi.estado(c.idCultivo, estado));
      setConfirmar(false);
    } catch (e) {
      setErrorAccion(e.message);
    } finally {
      setTrabajando(false);
    }
  }

  if (cargando) return <Cargando />;
  if (!c) return <Pantalla><Encabezado titulo="MI CULTIVO" icono="logo" /><MensajeError mensaje={error} onReintentar={recargar} /></Pantalla>;

  if (editando) {
    return (
      <Pantalla>
        <Encabezado titulo="MI CULTIVO" icono="logo" subtitulo="Actualiza la información de tu cultivo" />
        <FormularioCultivo
          inicial={c}
          onGuardar={async (campos, foto) => {
            setDatos(await cultivosApi.actualizar(c.idCultivo, campos, foto));
            setEditando(false);
          }}
        />
        <Boton titulo="Cancelar" variante="secundario" onPress={() => setEditando(false)} />
      </Pantalla>
    );
  }

  const activo = c.estado === 'ACTIVO';
  return (
    <Pantalla>
      <Encabezado titulo="MI CULTIVO" icono="logo" subtitulo="Registra la información de tus cultivos" />
      <Tarjeta titulo="Información básica" icono="information-outline">
        <Text style={[texto.etiqueta, { fontSize: 13 }]}>Tipo de cultivo</Text>
        <Valor>{c.tipoCultivo}</Valor>
        <Text style={[texto.suave, { marginTop: 6, fontSize: 12 }]}>
          Sembrado el {fechaCorta(c.fechaInicio)}{c.areaM2 ? ` · ${c.areaM2} m²` : ''}
          {!activo && c.fechaFinalizacion ? ` · Inactivo desde ${fechaCorta(c.fechaFinalizacion)}` : ''}
        </Text>
      </Tarjeta>
      {c.fotoUrl ? (
        <Tarjeta titulo="Fotografía del cultivo" icono="camera-outline">
          <Image source={{ uri: c.fotoUrl }} style={{ width: '100%', height: 170, borderRadius: 3 }} resizeMode="cover" />
        </Tarjeta>
      ) : null}
      <Tarjeta titulo="Tipo de abono" icono="sprout-outline">
        <Valor>{c.tipoAbono || 'Sin registrar'}</Valor>
      </Tarjeta>
      <Tarjeta titulo="¿Con qué herramientas cuenta usted para trabajar con este cultivo?" icono="hammer-wrench">
        <Valor>{c.herramientas || 'Sin registrar'}</Valor>
      </Tarjeta>
      <MensajeError mensaje={errorAccion} />
      {activo ? (
        <>
          <View style={{ flexDirection: 'row', gap: 24, paddingHorizontal: 8 }}>
            <Boton titulo="Inactivar" ancho="lleno" estilo={{ flex: 1 }} onPress={() => setConfirmar(true)} />
            <Boton titulo="Actualizar" ancho="lleno" estilo={{ flex: 1 }} onPress={() => setEditando(true)} />
          </View>
          <Boton titulo="Ver riego recomendado" icono="water-outline" variante="secundario" onPress={() => router.push(`/riego/${c.idCultivo}`)} />
        </>
      ) : (
        <Boton titulo="Activar" onPress={() => cambiarEstado('ACTIVO')} cargando={trabajando} />
      )}
      <Confirmar visible={confirmar} mensaje="¿Está seguro de inactivar este cultivo?" cargando={trabajando} onSi={() => cambiarEstado('INACTIVO')} onNo={() => setConfirmar(false)} />
    </Pantalla>
  );
}
