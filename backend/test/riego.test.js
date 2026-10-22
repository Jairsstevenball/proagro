import { test } from 'node:test';
import assert from 'node:assert/strict';
import { etapaYKc, necesidadDia, recomendarRiego, aguaDelMes } from '../src/services/riego.js';

const hace = (dias) => new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

test('Kc de la papa por etapa', () => {
  assert.equal(etapaYKc('Papa', hace(5)).kc, 0.5);
  assert.equal(etapaYKc('Papa', hace(80)).kc, 1.15);
  const dev = etapaYKc('Papa', hace(47)); // mitad del desarrollo (30 + 17.5)
  assert.ok(dev.kc > 0.5 && dev.kc < 1.15);
  assert.equal(etapaYKc('Papa', hace(400)).kc, 0.75);
});

test('lluvia fuerte cubre la necesidad', () => {
  const n = necesidadDia({ kc: 1.15, et0: 3, lluviaMm: 10, metodo: 'GOTEO', areaM2: 100 });
  assert.equal(n.netaMm, 0);
  assert.equal(n.litros, 0);
});

test('sin lluvia: 1 mm = 1 L/m² ajustado por eficiencia', () => {
  const n = necesidadDia({ kc: 1, et0: 3, lluviaMm: 0, metodo: 'GOTEO', areaM2: 100 });
  assert.equal(n.netaMm, 3);
  assert.equal(n.litros, Math.round((3 / 0.9) * 100)); // 333 L
});

test('recomendación detecta exceso de agua', () => {
  const rec = recomendarRiego({
    cultivo: { tipoCultivo: 'Papa', fechaInicio: hace(80), areaM2: 100 },
    ultimoRiego: { metodoRiego: 'ASPERSION', cantidadAgua: 1000, frecuenciaRiego: 2 },
    dias: [{ fecha: '2026-10-06', et0: 3, lluviaMm: 0, probLluvia: 10 }],
  });
  // 1.15*3/0.75*100 = 460 L recomendados; usa 1000 -> ~117 % más
  assert.equal(rec.hoy.litros, 460);
  assert.ok(rec.comparacion.diferenciaPct > 100);
  assert.ok(rec.mensajes.some((m) => m.includes('más agua')));
});

test('agua aplicada en el mes usa la configuración vigente cada día', () => {
  const riegos = [
    { fechaRegistro: new Date(2026, 8, 1, 7), cantidadAgua: 100 }, // sep 1
    { fechaRegistro: new Date(2026, 8, 16, 7), cantidadAgua: 50 }, // sep 16
  ];
  // septiembre 2026: 15 días a 100 + 15 días a 50 = 2250
  assert.equal(aguaDelMes(riegos, 2026, 9, new Date(2026, 7, 1), new Date(2026, 11, 1)), 2250);
});
