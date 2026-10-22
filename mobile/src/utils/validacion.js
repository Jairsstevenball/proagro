// Validaciones en el teléfono (para avisar rápido). El servidor SIEMPRE vuelve a validar todo.
const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ' -]+$/;

export const limpiarCelular = (c) => String(c || '').replace(/\D/g, '').replace(/^57(?=3\d{9}$)/, '');

export function validarPersona(f, { conDocumento = true } = {}) {
  const e = {};
  if (!f.nombre?.trim() || !SOLO_LETRAS.test(f.nombre.trim())) e.nombre = 'Escribe tu nombre (solo letras)';
  if (!f.primerApellido?.trim() || !SOLO_LETRAS.test(f.primerApellido.trim())) e.primerApellido = 'Escribe tu primer apellido';
  if (conDocumento && !/^[0-9A-Za-z]{5,15}$/.test(String(f.documento || '').replace(/[.\s-]/g, ''))) e.documento = 'Documento inválido';
  if (!f.ubicacion) e.ubicacion = 'Selecciona tu vereda';
  if (!/^3\d{9}$/.test(limpiarCelular(f.celular))) e.celular = 'Debe tener 10 dígitos y empezar por 3';
  if (f.correoElectronico && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correoElectronico.trim())) e.correoElectronico = 'Correo inválido';
  return e;
}

export function problemaClave(pw, { documento, celular } = {}) {
  if (!pw || pw.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(pw) || !/\d/.test(pw)) return 'La contraseña debe tener letras y números';
  const c = limpiarCelular(celular);
  if ((documento && pw.includes(documento)) || (c && pw.includes(c))) return 'No uses tu documento ni tu celular en la contraseña';
  return null;
}
