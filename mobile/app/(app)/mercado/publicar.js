// Publicar (o editar) una cosecha o un insumo en el Mercado
import { useEffect, useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pantalla, Encabezado, Tarjeta, Campo, Selector, FotoCampo, Boton, MensajeError, Cargando } from '../../../src/components/ui';
import { mercadoApi } from '../../../src/api/servicios';
import { colores } from '../../../src/tema';

const CATALOGO_RESPALDO = {
  categorias: {
    INSUMO: ['Semillas', 'Abonos y fertilizantes', 'Herramientas', 'Control de plagas', 'Riego', 'Otro'],
    COSECHA: ['Papa', 'Arveja', 'Lechuga', 'Maíz', 'Fresa', 'Mora', 'Otro'],
  },
  unidades: ['kg', 'arroba', 'bulto', 'canastilla', 'unidad', 'litro'],
};
// Mismo control que el servidor: sin enlaces ni celulares en el texto.
const CONTACTO_ESCONDIDO = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|co|net|org|io|me|ly|link)\b)|(\+?57[\s.-]?)?\b3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b|\d{10,}/i;

export default function Publicar() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const editando = Boolean(id);
  const [cat, setCat] = useState(CATALOGO_RESPALDO);
  const [f, setF] = useState({ tipo: 'COSECHA', categoria: '', titulo: '', descripcion: '', precio: '', unidad: '', cantidad: '' });
  const [fotoActual, setFotoActual] = useState(null);
  const [foto, setFoto] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(editando);
  const [guardando, setGuardando] = useState(false);
  const cambiar = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    mercadoApi.catalogos().then(setCat).catch(() => {});
    if (editando) {
      mercadoApi
        .uno(id)
        .then((p) => {
          setF({ tipo: p.tipo, categoria: p.categoria, titulo: p.titulo, descripcion: p.descripcion || '', precio: String(p.precio), unidad: p.unidad, cantidad: String(p.cantidad) });
          setFotoActual(p.fotoUrl);
        })
        .catch((e) => setError(e.message))
        .finally(() => setCargando(false));
    }
  }, [id, editando]);

  async function guardar() {
    const precio = parseInt(f.precio.replace(/[^\d]/g, ''), 10);
    const cantidad = Number(f.cantidad.replace(',', '.'));
    if (!f.categoria) return setError('Selecciona la categoría');
    if (f.titulo.trim().length < 3) return setError('Escribe un título (mínimo 3 letras)');
    if (CONTACTO_ESCONDIDO.test(f.titulo) || CONTACTO_ESCONDIDO.test(f.descripcion)) {
      return setError('No escribas enlaces ni números de teléfono. Los compradores te contactan con el botón de WhatsApp.');
    }
    if (!Number.isInteger(precio) || precio < 100) return setError('Escribe el precio en pesos');
    if (!f.unidad) return setError('Selecciona la unidad');
    if (!Number.isFinite(cantidad) || cantidad <= 0) return setError('Escribe la cantidad disponible');
    setError(null);
    setGuardando(true);
    const campos = { categoria: f.categoria, titulo: f.titulo.trim(), descripcion: f.descripcion.trim(), precio, unidad: f.unidad, cantidad };
    try {
      if (editando) await mercadoApi.actualizar(id, campos, foto);
      else await mercadoApi.crear({ tipo: f.tipo, ...campos }, foto);
      router.replace('/mercado/mios');
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <Cargando />;
  return (
    <Pantalla>
      <Encabezado titulo={editando ? 'EDITAR' : 'PUBLICAR'} icono="storefront-outline" subtitulo="Vende tu cosecha o tus insumos" />
      {!editando ? (
        <View style={{ flexDirection: 'row', marginBottom: 12, backgroundColor: '#fff', borderRadius: 24, padding: 4 }}>
          {[['COSECHA', 'Vendo cosecha'], ['INSUMO', 'Vendo insumo']].map(([v, n]) => (
            <Pressable key={v} onPress={() => setF((x) => ({ ...x, tipo: v, categoria: '' }))} style={{ flex: 1, paddingVertical: 10, borderRadius: 20, backgroundColor: f.tipo === v ? colores.verde : 'transparent', alignItems: 'center' }}>
              <Text style={{ color: f.tipo === v ? '#fff' : colores.texto, fontWeight: '700' }}>{n}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Tarjeta titulo="¿Qué vendes?" icono="tag-outline">
        <Selector etiqueta="Categoría" valor={f.categoria} opciones={cat.categorias[f.tipo]} onCambio={cambiar('categoria')} />
        <Campo etiqueta="Título" value={f.titulo} onChangeText={cambiar('titulo')} placeholder="Ej: Papa pastusa de primera" maxLength={80} />
        <Campo etiqueta="Descripción (opcional)" value={f.descripcion} onChangeText={cambiar('descripcion')} placeholder="Calidad, cuándo se cosechó, si haces entregas..." multiline maxLength={800} />
      </Tarjeta>
      <Tarjeta titulo="Precio y cantidad" icono="cash">
        <Campo etiqueta="Precio (pesos)" value={f.precio} onChangeText={cambiar('precio')} keyboardType="number-pad" placeholder="Ej: 80000" maxLength={10} />
        <Selector etiqueta="Por cada" valor={f.unidad} opciones={cat.unidades} onCambio={cambiar('unidad')} placeholder="Selecciona la unidad" />
        <Campo etiqueta="Cantidad disponible" value={f.cantidad} onChangeText={cambiar('cantidad')} keyboardType="decimal-pad" placeholder="Ej: 20" maxLength={10} />
      </Tarjeta>
      <FotoCampo titulo="Foto del producto" foto={foto} urlActual={fotoActual} onCambio={setFoto} />
      <MensajeError mensaje={error} />
      <Boton titulo={editando ? 'Guardar cambios' : 'Publicar'} onPress={guardar} cargando={guardando} />
    </Pantalla>
  );
}
