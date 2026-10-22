// Veredas de la zona rural de Ciudad Bolívar que aparecen en el mockup de registro.
// Coordenadas APROXIMADAS: verifíquenlas en Google Maps y ajústenlas al centro de cada vereda.
export const VEREDAS = {
  'Quiba Bajo': { lat: 4.5235, lon: -74.1735 },
  'Mochuelo Alto': { lat: 4.4995, lon: -74.1545 },
  Pasquilla: { lat: 4.4555, lon: -74.1590 },
  'Santa Rosa': { lat: 4.4110, lon: -74.1500 },
};

export const VEREDA_POR_DEFECTO = 'Pasquilla';

export function coordenadas(vereda) {
  return VEREDAS[vereda] || VEREDAS[VEREDA_POR_DEFECTO];
}
