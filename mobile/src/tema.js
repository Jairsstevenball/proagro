// Colores, letras e imágenes tomados del mockup de Figma:
// fondo de mármol crema con la marca de agua del logo, títulos verdes gruesos,
// campos verde translúcido, botones verde oscuro en forma de píldora.
export const colores = {
  verde: '#2E8B3D', // botones y selectores
  verdeOscuro: '#1F6B2C',
  verdeBrillante: '#27A82E', // títulos (PROAGRO, REGISTRO, MI CULTIVO...)
  verdeTitulo: '#2DB532',
  sombraTitulo: '#11621A',
  verdeClaro: '#CFE8B8',
  verdeSuave: '#E6F2DA',
  campo: 'rgba(132, 196, 104, 0.45)', // cajas de texto del mockup
  panel: '#C4E191', // tarjetas "Información básica", "Tipo de abono"...
  panelBorde: 'rgba(120, 170, 70, 0.35)',
  crema: '#F3E4DA',
  barra: '#F6ECE4',
  blanco: '#FFFFFF',
  texto: '#1E2A1F',
  textoSuave: '#56645A',
  borde: '#D5DEC9',
  peligro: '#C0392B',
  precaucion: '#E08A00',
  info: '#2E86C1',
};

export const espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24 };

// Fuente gruesa de los títulos. Está en assets/fonts/Titulo.otf:
// si quieren la del mockup exacta, reemplacen ese archivo por otra (ej. "Lilita One" de Google Fonts)
// con el MISMO nombre.
export const FUENTE_TITULO = 'Titulo';

// Letras grandes: pensado para agricultores con distintos niveles de visión y tecnología.
export const texto = {
  titulo: {
    fontFamily: FUENTE_TITULO,
    fontSize: 34,
    color: colores.verdeTitulo,
    letterSpacing: 0.5,
    textShadowColor: colores.sombraTitulo,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 1,
  },
  subtitulo: { fontSize: 18, fontWeight: '700', color: colores.texto },
  normal: { fontSize: 16, color: colores.texto },
  suave: { fontSize: 14, color: colores.textoSuave },
  etiqueta: { fontSize: 14, color: colores.texto, marginBottom: 4 },
};

export const sombra = {
  shadowColor: '#000',
  shadowOpacity: 0.14,
  shadowRadius: 5,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
};

// Capa que cubre todo su contenedor (va DETRÁS o ENCIMA sin ocupar espacio).
export const relleno = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };

export const imagenes = {
  fondo: require('../assets/img/fondo.jpg'),
  logo: require('../assets/img/logo.png'),
  icono: require('../assets/img/icono.png'),
  campo: require('../assets/img/campo.jpg'),
  campoAtardecer: require('../assets/img/campo-atardecer.jpg'),
  campoGris: require('../assets/img/campo-gris.jpg'),
  panel: require('../assets/img/panel.png'),
};
