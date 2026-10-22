export const pesos = (n) => `$ ${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
export const numero = (n, dec = 0) => (Number(n) || 0).toLocaleString('es-CO', { maximumFractionDigits: dec });

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function saludo() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

export const fechaCorta = (f) =>
  new Date(f).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

export const diaSemana = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });
};
