// Colores y tamaños tomados del mockup de Figma (verde ProAgro sobre fondo crema).
export const colores = {
  verde: '#2E8B3D',
  verdeOscuro: '#1F6B2C',
  verdeBrillante: '#3DBA3D',
  verdeClaro: '#CFE8B8',
  verdeSuave: '#E6F2DA',
  crema: '#F4EFE6',
  blanco: '#FFFFFF',
  texto: '#1E2A1F',
  textoSuave: '#5B6B5D',
  borde: '#D5DEC9',
  peligro: '#C0392B',
  precaucion: '#E2A100',
  info: '#2E86C1',
};

export const espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24 };

// Letras grandes: pensado para agricultores con distintos niveles de visión y tecnología.
export const texto = {
  titulo: { fontSize: 30, fontWeight: '900', color: colores.verdeBrillante, letterSpacing: 1 },
  subtitulo: { fontSize: 18, fontWeight: '700', color: colores.texto },
  normal: { fontSize: 16, color: colores.texto },
  suave: { fontSize: 14, color: colores.textoSuave },
};

export const sombra = {
  shadowColor: '#000',
  shadowOpacity: 0.12,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
};
