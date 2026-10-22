// Catálogos del Marketplace (compra de insumos y venta directa de cosecha).
export const CATEGORIAS = {
  INSUMO: ['Semillas', 'Abonos y fertilizantes', 'Herramientas', 'Control de plagas', 'Riego', 'Otro'],
  COSECHA: ['Papa', 'Arveja', 'Lechuga', 'Maíz', 'Fresa', 'Mora', 'Otro'],
};

export const UNIDADES = ['kg', 'arroba', 'bulto', 'canastilla', 'unidad', 'litro'];

export const MOTIVOS_REPORTE = ['ESTAFA', 'PRODUCTO_PROHIBIDO', 'PRECIO_ENGANOSO', 'OFENSIVO', 'OTRO'];

// Con 3 reportes distintos la publicación se oculta hasta que un administrador la revise.
export const REPORTES_PARA_OCULTAR = 3;
export const MAX_PUBLICACIONES_ACTIVAS = 20;
